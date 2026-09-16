/**
 * Verify all 15 Mongoose models: registration, fields, refs, enums,
 * required/unique constraints — without inserting any records.
 * Run: npm run verify:models  (needs MongoDB reachable for index sync)
 */
import mongoose from 'mongoose'
import {
  AdminLog,
  DisasterCategory,
  EmergencyContact,
  Facility,
  Incident,
  IncidentStatus,
  IncidentUpdate,
  Location,
  Notification,
  Report,
  RescueAssignment,
  RescueTeam,
  RiskAssessment,
  RiskZone,
  UnsafeAreaReport,
  User,
  UserRole,
} from '../models/index.js'

type AnyModel = mongoose.Model<any>

const models: Record<string, AnyModel> = {
  Users: User,
  EmergencyContacts: EmergencyContact,
  Incidents: Incident,
  Locations: Location,
  Notifications: Notification,
  RescueTeams: RescueTeam,
  RescueAssignments: RescueAssignment,
  IncidentUpdates: IncidentUpdate,
  UnsafeAreaReports: UnsafeAreaReport,
  RiskZones: RiskZone,
  RiskAssessments: RiskAssessment,
  Facilities: Facility,
  DisasterCategories: DisasterCategory,
  AdminLogs: AdminLog,
  Reports: Report,
}

function refsOf(model: AnyModel): string[] {
  const out: string[] = []
  model.schema.eachPath((name, type) => {
    const opts = type.options as { ref?: string } | undefined
    if (opts?.ref) out.push(`${name} -> ${opts.ref}`)
  })
  return out
}

function enumsOf(model: AnyModel): string[] {
  const out: string[] = []
  model.schema.eachPath((name, type) => {
    const values = (type.options as { enum?: unknown[] } | undefined)?.enum
    if (Array.isArray(values) && values.length > 0) out.push(`${name}: [${values.join(' | ')}]`)
  })
  return out
}

async function expectInvalid(label: string, doc: mongoose.HydratedDocument<unknown>): Promise<void> {
  const err = await doc.validate().then(
    () => null,
    (e: unknown) => e as Error,
  )
  if (!err) throw new Error(`EXPECTED validation failure: ${label}`)
  console.log(`  ok invalid: ${label} -> ${err.message.split(':')[0]}`)
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakshasafe'
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
  console.log(`[verify] connected to ${mongoose.connection.name}\n`)

  const names = Object.keys(models)
  console.log(`[verify] model count: ${names.length} (expected 15)`)
  if (names.length !== 15) throw new Error('Model count mismatch')

  for (const [name, model] of Object.entries(models)) {
    const paths = Object.keys(model.schema.paths).filter((p) => p !== '__v')
    console.log(`\n## ${name} (collection: ${model.collection.name})`)
    console.log(`   fields: ${paths.join(', ')}`)
    for (const r of refsOf(model)) console.log(`   ref: ${r}`)
    for (const e of enumsOf(model)) console.log(`   enum: ${e}`)
    await model.syncIndexes()
    const indexes = await model.collection.indexes()
    console.log(`   indexes: ${indexes.map((i) => JSON.stringify(i.key)).join(' ')}`)
  }

  console.log('\n[verify] negative validation tests (no records saved):')
  await expectInvalid('user missing required fields', new User({}))
  await expectInvalid('user bad role', new User({ name: 'T', email: 't@x.com', phone: '+911', passwordHash: 'h', role: 'SUPER' }))
  await expectInvalid('incident bad status', new Incident({ userId: new mongoose.Types.ObjectId(), type: 'Safety', category: 'c', description: 'd', priority: 'LOW', status: 'NOPE' }))
  await expectInvalid('incident bad priority', new Incident({ userId: new mongoose.Types.ObjectId(), type: 'Safety', category: 'c', description: 'd', priority: 'URGENT', status: IncidentStatus.REPORTED }))
  await expectInvalid('location bad latitude', new Location({ latitude: 999, longitude: 10 }))
  await expectInvalid('risk score out of range', new RiskAssessment({ locationId: new mongoose.Types.ObjectId(), riskScore: 150, riskLevel: 'HIGH', modelVersion: 'v1' }))
  await expectInvalid('report bad format', new Report({ generatedBy: new mongoose.Types.ObjectId(), title: 't', reportType: 'r', format: 'XML' }))
  await expectInvalid('assignment bad ref type', new RescueAssignment({ incidentId: 'not-an-id', teamId: new mongoose.Types.ObjectId(), assignedBy: new mongoose.Types.ObjectId(), status: 'ASSIGNED' }))

  // Positive in-memory validation (still nothing saved)
  const good = new User({ name: 'Verify', email: 'v@x.com', phone: '+9112345', passwordHash: 'hash', role: UserRole.USER })
  await good.validate()
  console.log('  ok valid: well-formed user passes validation')

  await mongoose.disconnect()
  console.log('\n[verify] ALL MODEL CHECKS PASSED')
}

main().catch((err) => {
  console.error('[verify] FAILED:', (err as Error).message)
  process.exit(1)
})
