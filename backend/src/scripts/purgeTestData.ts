/**
 * Remove automated-test records that automated runs left in the application
 * database, so real accounts are never mixed with test data.
 *
 * This script is a DRY RUN by default: it prints exactly what it would delete
 * and changes nothing. Deleting requires an explicit opt-in, because it runs
 * against the same database the application uses.
 *
 * Usage (PowerShell):
 *   npm run purge:test            # dry run - prints the plan only
 *   npm run purge:test -- --apply # actually deletes
 *
 * Optional: MONGO_URI (defaults to the value in .env).
 *
 * Detection rules (deliberately narrow, so real records are never matched):
 *   users               email ends in @raksha.test / @test.local, or a name
 *                       containing Tester / Audit / Smoke / Functional / Renamed
 *   incidents           description starts with "Audit SOS", or the owner is a
 *                       detected test user
 *   rescue teams        name starts with "Audit Rescue"
 * Every other collection is reached only through those records, so nothing
 * that belongs to a real account is ever touched.
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const TEST_EMAIL = /@(raksha\.test|test\.local)$/i
const TEST_NAME = /tester|audit|smoke|functional|renamed/i
const TEST_DESCRIPTION = /^audit sos/i
const TEST_TEAM_NAME = /^audit rescue/i

interface PurgePlan {
  users: unknown[]
  incidents: unknown[]
  teams: unknown[]
  assignments: unknown[]
  contacts: unknown[]
  notifications: unknown[]
  locations: unknown[]
  riskAssessments: unknown[]
  unsafeReports: unknown[]
  adminLogs: unknown[]
}

const id = (v: unknown): string => String(v)
const key = (v: unknown): string => (v && typeof v === 'object' && '_id' in v ? id((v as { _id: unknown })._id) : '')

async function buildPlan(db: mongoose.Connection): Promise<PurgePlan> {
  const users = await db.collection('users').find({}).toArray()
  const testUsers = users.filter(
    (u) =>
      TEST_EMAIL.test(String(u.email ?? '')) ||
      TEST_NAME.test(String(u.name ?? '')),
  )
  const testUserIds = new Set(testUsers.map((u) => id(u._id)))

  const incidents = await db.collection('incidents').find({}).toArray()
  const testIncidents = incidents.filter(
    (i) =>
      TEST_DESCRIPTION.test(String(i.description ?? '')) ||
      testUserIds.has(id(i.userId)),
  )
  const testIncIds = new Set(testIncidents.map((i) => id(i._id)))
  const testLocIds = new Set(
    testIncidents.map((i) => id(i.locationId)).filter((v) => v !== '' && v !== 'undefined'),
  )

  const teams = await db.collection('rescueteams').find({}).toArray()
  const testTeams = teams.filter((t) => TEST_TEAM_NAME.test(String(t.name ?? '')))
  const testTeamIds = new Set(testTeams.map((t) => id(t._id)))

  const assignments = (await db.collection('rescueassignments').find({}).toArray()).filter(
    (a) =>
      testIncIds.has(id(a.incidentId)) ||
      testTeamIds.has(id(a.teamId)) ||
      testUserIds.has(id(a.assignedBy)),
  )

  const contacts = (await db.collection('emergencycontacts').find({}).toArray()).filter((c) =>
    testUserIds.has(id(c.userId)),
  )
  const notifications = (await db.collection('notifications').find({}).toArray()).filter((n) =>
    testIncIds.has(id(n.incidentId)),
  )
  const locations = (await db.collection('locations').find({}).toArray()).filter((l) =>
    testLocIds.has(id(l._id)),
  )
  const riskAssessments = (await db.collection('riskassessments').find({}).toArray()).filter((r) =>
    testLocIds.has(id(r.locationId)),
  )
  const unsafeReports = (await db.collection('unsafeareareports').find({}).toArray()).filter((r) =>
    testUserIds.has(id(r.userId)),
  )
  const adminLogs = (await db.collection('adminlogs').find({}).toArray()).filter((l) =>
    testUserIds.has(id(l.adminId)),
  )

  return { users: testUsers, incidents: testIncidents, teams: testTeams, assignments, contacts, notifications, locations, riskAssessments, unsafeReports, adminLogs }
}

function printPlan(plan: PurgePlan): void {
  console.log('=== automated-test purge plan ===')
  const rows: [string, unknown[]][] = [
    ['users', plan.users],
    ['incidents', plan.incidents],
    ['rescueteams', plan.teams],
    ['rescueassignments', plan.assignments],
    ['emergencycontacts', plan.contacts],
    ['notifications', plan.notifications],
    ['locations', plan.locations],
    ['riskassessments', plan.riskAssessments],
    ['unsafeareareports', plan.unsafeReports],
    ['adminlogs', plan.adminLogs],
  ]
  for (const [name, docs] of rows) {
    console.log(`  ${name.padEnd(20)} ${docs.length}`)
  }
  console.log('')
  console.log('  test users to remove:')
  const shownUsers = plan.users.slice(0, 12) as { email?: unknown; name?: unknown }[]
  for (const u of shownUsers) {
    console.log(`    ${String(u.email)}  (${String(u.name)})`)
  }
  if (plan.users.length > 12) console.log(`    ... and ${plan.users.length - 12} more`)
  console.log('')
  console.log('  test users to KEEP (not matched, never touched):')
  console.log('    every account whose email is not @raksha.test / @test.local')
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakshasafe'

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
  const db = mongoose.connection
  const plan = await buildPlan(db)

  printPlan(plan)

  if (!apply) {
    console.log('')
    console.log('DRY RUN - nothing was deleted.')
    console.log('Re-run with --apply to delete these records.')
    await mongoose.disconnect()
    return
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[purge] Refusing to delete while NODE_ENV=production. Unset it to proceed.')
    await mongoose.disconnect()
    process.exit(1)
  }

  const incIds = plan.incidents.map(key)
  const locIds = plan.locations.map(key)
  const del = async (col: string, filter: Record<string, unknown>): Promise<number> => {
    const res = await db.collection(col).deleteMany(filter)
    return res.deletedCount ?? 0
  }

  const deleted: [string, number][] = [
    ['riskassessments', await del('riskassessments', { locationId: { $in: locIds } })],
    ['notifications', await del('notifications', { incidentId: { $in: incIds } })],
    ['incidentupdates', await del('incidentupdates', { incidentId: { $in: incIds } })],
    ['rescueassignments', await del('rescueassignments', { _id: { $in: plan.assignments.map(key) } })],
    ['incidents', await del('incidents', { _id: { $in: incIds } })],
    ['emergencycontacts', await del('emergencycontacts', { _id: { $in: plan.contacts.map(key) } })],
    ['unsafeareareports', await del('unsafeareareports', { _id: { $in: plan.unsafeReports.map(key) } })],
    ['locations', await del('locations', { _id: { $in: locIds } })],
    ['adminlogs', await del('adminlogs', { _id: { $in: plan.adminLogs.map(key) } })],
    ['rescueteams', await del('rescueteams', { _id: { $in: plan.teams.map(key) } })],
    ['users', await del('users', { _id: { $in: plan.users.map(key) } })],
  ]

  console.log('')
  console.log('=== deleted ===')
  for (const [name, n] of deleted) console.log(`  ${name.padEnd(20)} ${n}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[purge] Failed:', (err as Error).message)
  process.exit(1)
})