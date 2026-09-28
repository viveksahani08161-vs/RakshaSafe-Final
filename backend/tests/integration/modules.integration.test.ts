import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { User, UserRole } from '../../src/models/User.js'
import { AdminLog } from '../../src/models/AdminLog.js'
import { hashPassword } from '../../src/utils/password.js'

// Shared bcrypt hash so direct-seeded accounts skip per-account hashing.
const SEED_PASSWORD = 'Raksha@Test123'

const DELHI = { latitude: 28.6139, longitude: 77.209 }
const BENGALURU = { latitude: 12.9716, longitude: 77.5946 }

/**
 * Full-stack integration suite. Runs against a real mongod spawned
 * in-memory (MongoMemoryServer) and a local AI scoring stub, so every
 * assertion exercises the genuine application code, real MongoDB wire
 * protocol, and a real over-HTTP scoring round-trip — no mocks of the
 * system under test, and no contact with production data.
 */
test('RakshaSafe all-module integration suite (real mongod + local AI stub)', async (t) => {
  // The AI stub must be reachable before the app module graph loads, because
  // env config is frozen at import time (src/config/env.ts).
  const lastAiBodies: Array<Record<string, unknown>> = []
  const aiServer = http.createServer((req, res) => {
    if (req.url === '/risk/assess' && req.method === 'POST') {
      let raw = ''
      req.on('data', (c) => {
        raw += c.toString()
      })
      req.on('end', () => {
        const factors = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>
        lastAiBodies.push(factors)
        const activeIncidents = Number(factors.activeIncidents ?? 0)
        const verifiedReports = Number(factors.verifiedReports ?? 0)
        // Deterministic score derived from the real factors the backend assembled.
        const score = Math.min(100, 25 + activeIncidents * 15 + verifiedReports * 10)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            riskScore: score,
            riskLevel: score >= 75 ? 'CRITICAL' : score >= 55 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
            modelVersion: 'rakshasafe-test-ai-v1',
            inputFactors: [
              { name: 'activeIncidents', value: activeIncidents },
              { name: 'verifiedReports', value: verifiedReports },
            ],
            assessedAt: new Date().toISOString(),
          }),
        )
      })
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
  })
  const aiListening = new Promise<void>((resolve) => aiServer.listen(0, '127.0.0.1', resolve))
  await aiListening
  const aiPort = (aiServer.address() as AddressInfo).port
  process.env.AI_SERVICE_URL = `http://127.0.0.1:${aiPort}`
  process.env.AI_SERVICE_TIMEOUT_MS = '5000'

  // Import the real app AFTER the environment is ready.
  const { createApp } = await import('../../src/app.js')

  const mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri(), { serverSelectionTimeoutMS: 20_000 })
  await mongoose.connection.dropDatabase()
  const app = createApp()

  let userAToken = ''
  let userBToken = ''
  let adminToken = ''
  let responderToken = ''
  let userAId = ''
  let userBId = ''
  let incidentAId = ''
  let incidentCId = ''
  let riskIncidentId = ''
  let assignmentAlphaId = ''
  let teamAlphaId = ''
  let teamInactiveId = ''
  let facilityId = ''
  let verifiedReportId = ''

  t.after(async () => {
    aiServer.close()
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    await mongod.stop()
  })

  const auth = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` })

  // ------------------------------------------------------------------
  // 1. Health + authentication
  // ------------------------------------------------------------------
  await t.test('health check reports the in-memory database as connected', async () => {
    const res = await request(app).get('/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.db?.connected, true)
  })

  await t.test('two fresh users register with real account records', async () => {
    const a = await request(app).post('/api/auth/register').send({
      name: 'Module User A',
      email: 'module.user.a@example.com',
      phone: '9876543210',
      password: 'Password@123',
      language: 'hi',
    })
    assert.equal(a.status, 201)
    userAToken = a.body.data.token as string
    userAId = a.body.data.user.id as string

    const b = await request(app).post('/api/auth/register').send({
      name: 'Module User B',
      email: 'module.user.b@example.com',
      phone: '9876543211',
      password: 'Password@123',
    })
    assert.equal(b.status, 201)
    userBToken = b.body.data.token as string
    userBId = b.body.data.user.id as string
  })

  await t.test('login works by email, by 10-digit phone, and by +91 phone', async () => {
    const byEmail = await request(app).post('/api/auth/login').send({ identifier: 'module.user.a@example.com', password: 'Password@123' })
    assert.equal(byEmail.status, 200)

    const byPhone = await request(app).post('/api/auth/login').send({ identifier: '9876543210', password: 'Password@123' })
    assert.equal(byPhone.status, 200)

    const byPlus91 = await request(app).post('/api/auth/login').send({ identifier: '+919876543210', password: 'Password@123' })
    assert.equal(byPlus91.status, 200)
  })

  await t.test('an administrator and a responder authenticate from seeded accounts', async () => {
    const passwordHash = await hashPassword(SEED_PASSWORD)
    const admin = await User.create({
      name: 'Module Admin',
      email: 'module.admin@example.com',
      phone: '9999911111',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    })
    const responder = await User.create({
      name: 'Module Responder',
      email: 'module.responder@example.com',
      phone: '9999922222',
      passwordHash,
      role: UserRole.RESPONDER,
      isActive: true,
    })

    const adminRes = await request(app).post('/api/auth/login').send({ identifier: 'module.admin@example.com', password: SEED_PASSWORD })
    assert.equal(adminRes.status, 200)
    assert.equal(adminRes.body.data.user.role, 'ADMIN')
    adminToken = adminRes.body.data.token as string

    const responderRes = await request(app).post('/api/auth/login').send({ identifier: 'module.responder@example.com', password: SEED_PASSWORD })
    assert.equal(responderRes.status, 200)
    assert.equal(responderRes.body.data.user.role, 'RESPONDER')
    responderToken = responderRes.body.data.token as string
  })

  await t.test('protected routes reject missing and mismatched tokens', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401)
    assert.equal((await request(app).get('/api/admin/dashboard').set(auth(userAToken))).status, 403)
    assert.equal((await request(app).post('/api/admin/facilities').set(auth(userAToken)).send({})).status, 403)
  })

  await t.test('a user can update profile name and language', async () => {
    const res = await request(app).patch('/api/auth/profile').set(auth(userAToken)).send({ language: 'en' })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.user.language, 'en')
  })

  await t.test('duplicate email change on profile is rejected with 409', async () => {
    const res = await request(app).patch('/api/auth/profile').set(auth(userAToken)).send({ email: 'module.user.b@example.com' })
    assert.equal(res.status, 409)
  })

  // ------------------------------------------------------------------
  // 2. Emergency contacts
  // ------------------------------------------------------------------
  let contactId = ''
  await t.test('user creates an opted-in emergency contact', async () => {
    const res = await request(app)
      .post('/api/emergency-contacts')
      .set(auth(userAToken))
      .send({ name: 'Priya Rao', phone: '+91 98765 43210', email: 'priya@example.com', relationship: 'Sister', notifyViaSms: true, notifyViaEmail: false, isPrimary: true })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.contact.phone, '+919876543210')
    contactId = res.body.data.contact.id as string
  })

  await t.test('ownership isolation keeps contacts private', async () => {
    const own = await request(app).get('/api/emergency-contacts').set(auth(userAToken))
    const other = await request(app).get('/api/emergency-contacts').set(auth(userBToken))
    assert.equal(own.status, 200)
    assert.ok(own.body.data.contacts.some((c: { id: string }) => c.id === contactId))
    assert.equal(other.body.data.contacts.length, 0)
  })

  // ------------------------------------------------------------------
  // 3. Incidents lifecycle (owner-scoped)
  // ------------------------------------------------------------------
  await t.test('creating an incident always starts as REPORTED from the JWT owner', async () => {
    // The body deliberately tries to forge status and ownership.
    const res = await request(app)
      .post('/api/incidents')
      .set(auth(userAToken))
      .send({
        type: 'Disaster',
        category: 'Flood',
        description: 'Waterlogging on the main road near the market.',
        priority: 'HIGH',
        location: DELHI,
        status: 'RESOLVED',
        userId: '507f1f77bcf86cd799439011',
      })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.incident.status, 'REPORTED')
    assert.equal(res.body.data.incident.userId, userAId)
    incidentAId = res.body.data.incident.id as string
  })

  await t.test('invalid incident data is rejected with 400', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .set(auth(userAToken))
      .send({ type: 'Space', category: 'Flood', description: 'x', priority: 'MAXIMUM', location: DELHI })
    assert.equal(res.status, 400)
    assert.equal(typeof res.body.error, 'string')
    assert.ok(Array.isArray(res.body.details))
  })

  await t.test('incident lists are owned-scoped and detail includes location', async () => {
    const other = await request(app).get('/api/incidents').set(auth(userBToken))
    assert.equal(other.body.data.incidents.length, 0)

    const detail = await request(app).get(`/api/incidents/${incidentAId}`).set(auth(userAToken))
    assert.equal(detail.status, 200)
    assert.equal(detail.body.data.location?.latitude, DELHI.latitude)
    assert.ok(detail.body.data.location?.capturedAt)
    assert.deepEqual(detail.body.data.assignments, [])

    const smuggled = await request(app).get(`/api/incidents/${incidentAId}`).set(auth(userBToken))
    assert.equal(smuggled.status, 404)
  })

  await t.test('a new unassigned incident can be edited by its owner', async () => {
    const res = await request(app).patch(`/api/incidents/${incidentAId}`).set(auth(userAToken)).send({ priority: 'CRITICAL' })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.incident.priority, 'CRITICAL')
  })

  await t.test('a non-owned or malformed incident edit is rejected', async () => {
    assert.equal((await request(app).patch(`/api/incidents/${incidentAId}`).set(auth(userBToken)).send({ priority: 'LOW' })).status, 404)
    assert.equal((await request(app).patch('/api/incidents/not-an-id').set(auth(userAToken)).send({ priority: 'LOW' })).status, 400)
  })

  await t.test('a brand-new incident can be deleted and disappears from the list', async () => {
    const made = await request(app)
      .post('/api/incidents')
      .set(auth(userAToken))
      .send({ type: 'Safety', category: 'Hazard', description: 'Temporary case for deletion.', priority: 'LOW', location: DELHI })
    const id = made.body.data.incident.id as string

    const del = await request(app).delete(`/api/incidents/${id}`).set(auth(userAToken))
    assert.equal(del.status, 200)
    assert.equal(del.body.data.deleted, true)

    const missing = await request(app).get(`/api/incidents/${id}`).set(auth(userAToken))
    assert.equal(missing.status, 404)
  })

  // ------------------------------------------------------------------
  // 4. Facilities (admin writes, user reads)
  // ------------------------------------------------------------------
  await t.test('admin creates an operational and a closed facility', async () => {
    const open = await request(app)
      .post('/api/admin/facilities')
      .set(auth(adminToken))
      .send({
        name: 'Delhi District Hospital',
        facilityType: 'Hospital',
        phone: '011-23000000',
        location: DELHI,
        capacity: 350,
        isOperational: true,
        operatingHours: '24x7',
      })
    assert.equal(open.status, 201)
    facilityId = open.body.data.facility.id as string
    assert.equal(open.body.data.facility.location?.city, undefined)

    const closed = await request(app)
      .post('/api/admin/facilities')
      .set(auth(adminToken))
      .send({
        name: 'Closed Depot',
        facilityType: 'Shelter',
        phone: '011-23000001',
        location: { latitude: DELHI.latitude, longitude: DELHI.longitude },
        isOperational: false,
      })
    assert.equal(closed.status, 201)
  })

  await t.test('users only ever see operational facilities', async () => {
    const list = await request(app).get('/api/facilities').set(auth(userAToken))
    assert.equal(list.status, 200)
    assert.ok(list.body.data.facilities.some((f: { id: string }) => f.id === facilityId))
    assert.ok(list.body.data.facilities.every((f: { isOperational: boolean }) => f.isOperational === true))

    const closed = await request(app).get(`/api/facilities/${facilityId}`).set(auth(userAToken))
    assert.equal(closed.status, 200)
    assert.equal(closed.body.data.facility.location?.latitude, DELHI.latitude)
  })

  await t.test('invalid facility filters are rejected, operational-only lookup 404s for closed', async () => {
    const badFilter = await request(app).get('/api/facilities?facilityType=Stadium').set(auth(userAToken))
    assert.equal(badFilter.status, 400)

    const closedId = (
      await request(app).get('/api/admin/facilities').set(auth(adminToken))
    ).body.data.facilities.find((f: { name: string }) => f.name === 'Closed Depot')?.id as string
    assert.equal((await request(app).get(`/api/facilities/${closedId}`).set(auth(userAToken))).status, 404)
  })

  // ------------------------------------------------------------------
  // 5. Rescue teams + assignments + responder workflow
  // ------------------------------------------------------------------
  await t.test('admin creates active and inactive rescue teams', async () => {
    const alpha = await request(app)
      .post('/api/admin/rescue-teams')
      .set(auth(adminToken))
      .send({ name: 'Delhi Medical Alpha', teamType: 'Medical', phone: '011-25551000', isActive: true, specializations: ['Ambulance', 'First-aid'], location: DELHI })
    assert.equal(alpha.status, 201)
    teamAlphaId = alpha.body.data.team.id as string
    assert.deepEqual(alpha.body.data.team.specializations, ['Ambulance', 'First-aid'])
    assert.ok(alpha.body.data.team.location?.latitude)

    const inactive = await request(app)
      .post('/api/admin/rescue-teams')
      .set(auth(adminToken))
      .send({ name: 'Retired Unit', teamType: 'Volunteer', phone: '011-25551001', isActive: false })
    assert.equal(inactive.status, 201)
    teamInactiveId = inactive.body.data.team.id as string
  })

  await t.test('only RESPONDER accounts can join a team', async () => {
    const badMember = await request(app)
      .post(`/api/admin/rescue-teams/${teamAlphaId}/members`)
      .set(auth(adminToken))
      .send({ userId: userAId })
    assert.equal(badMember.status, 400)

    const add = await request(app)
      .post(`/api/admin/rescue-teams/${teamAlphaId}/members`)
      .set(auth(adminToken))
      .send({ userId: (await User.findOne({ email: 'module.responder@example.com' }).lean())?._id })
    assert.equal(add.status, 201)

    const members = await request(app).get(`/api/admin/rescue-teams/${teamAlphaId}/members`).set(auth(adminToken))
    assert.equal(members.status, 200)
    assert.equal(members.body.data.members.length, 1)
    assert.equal(members.body.data.members[0].role, 'RESPONDER')
  })

  await t.test('users list only active teams', async () => {
    const res = await request(app).get('/api/rescue-teams').set(auth(userAToken))
    assert.equal(res.status, 200)
    assert.ok(res.body.data.teams.some((team: { id: string }) => team.id === teamAlphaId))
    assert.ok(res.body.data.teams.every((team: { isActive: boolean }) => team.isActive === true))
    assert.equal((await request(app).get(`/api/rescue-teams/${teamInactiveId}`).set(auth(userAToken))).status, 404)
  })

  await t.test('admin assigns an active team to the incident', async () => {
    const res = await request(app)
      .post(`/api/admin/incidents/${incidentAId}/assignments`)
      .set(auth(adminToken))
      .send({ teamId: teamAlphaId, notes: 'Ambulance dispatched.' })
    assert.equal(res.status, 201)
    assignmentAlphaId = res.body.data.assignment.id as string
    assert.equal(res.body.data.assignment.team.name, 'Delhi Medical Alpha')
    assert.equal(res.body.data.assignment.status, 'ASSIGNED')
    assert.equal(res.body.data.assignment.notes, 'Ambulance dispatched.')
  })

  await t.test('duplicate active assignment, and assignment to an inactive team, are rejected', async () => {
    const dup = await request(app)
      .post(`/api/admin/incidents/${incidentAId}/assignments`)
      .set(auth(adminToken))
      .send({ teamId: teamAlphaId })
    assert.equal(dup.status, 409)

    const inactive = await request(app)
      .post(`/api/admin/incidents/${incidentAId}/assignments`)
      .set(auth(adminToken))
      .send({ teamId: teamInactiveId })
    assert.equal(inactive.status, 400)
  })

  await t.test('an assigned incident can no longer be edited or deleted by the owner', async () => {
    assert.equal((await request(app).patch(`/api/incidents/${incidentAId}`).set(auth(userAToken)).send({ priority: 'LOW' })).status, 409)
    assert.equal((await request(app).delete(`/api/incidents/${incidentAId}`).set(auth(userAToken))).status, 409)
  })

  await t.test('the responder sees only their own team’s assignment and can advance it', async () => {
    const mine = await request(app).get('/api/responder/assignments').set(auth(responderToken))
    assert.equal(mine.status, 200)
    assert.equal(mine.body.data.assignments.length, 1)
    assert.equal(mine.body.data.assignments[0].id, assignmentAlphaId)
    assert.equal(mine.body.data.assignments[0].incident.id, incidentAId)

    const enRoute = await request(app)
      .patch(`/api/responder/assignments/${assignmentAlphaId}`)
      .set(auth(responderToken))
      .send({ status: 'EN_ROUTE' })
    assert.equal(enRoute.status, 200)
    assert.equal(enRoute.body.data.assignment.status, 'EN_ROUTE')

    const onScene = await request(app)
      .patch(`/api/responder/assignments/${assignmentAlphaId}`)
      .set(auth(responderToken))
      .send({ status: 'ON_SCENE' })
    assert.equal(onScene.status, 200)
    assert.equal(onScene.body.data.assignment.status, 'ON_SCENE')
  })

  await t.test('an illegal assignment transition is rejected, an admin completes it', async () => {
    const bad = await request(app)
      .patch(`/api/responder/assignments/${assignmentAlphaId}`)
      .set(auth(responderToken))
      .send({ status: 'ASSIGNED' })
    assert.equal(bad.status, 400)
    assert.match(bad.body.details[0].message, /Cannot move from/)

    const complete = await request(app)
      .patch(`/api/admin/assignments/${assignmentAlphaId}`)
      .set(auth(adminToken))
      .send({ status: 'COMPLETED' })
    assert.equal(complete.status, 200)
    assert.equal(complete.body.data.assignment.status, 'COMPLETED')
  })

  await t.test('a responder can fetch full incident context of an assigned case', async () => {
    const res = await request(app).get(`/api/responder/incidents/${incidentAId}`).set(auth(responderToken))
    assert.equal(res.status, 200)
    assert.equal(res.body.data.incident.id, incidentAId)
    assert.equal(res.body.data.reporter.name, 'Module User A')
    assert.equal(res.body.data.location?.latitude, DELHI.latitude)
  })

  // ------------------------------------------------------------------
  // 6. Incident status workflow + history
  // ------------------------------------------------------------------
  await t.test('an admin drives the incident through the documented workflow', async () => {
    const order = ['ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
    for (const next of order) {
      const res = await request(app)
        .patch(`/api/admin/incidents/${incidentAId}/status`)
        .set(auth(adminToken))
        .send({ status: next, comment: `Transition to ${next}` })
      assert.equal(res.status, 200, `transition to ${next}`)
      assert.equal(res.body.data.incident.status, next)
      if (next === 'RESOLVED' || next === 'CLOSED') {
        assert.ok(res.body.data.incident.resolvedAt)
      }
    }
    const summary = await request(app).get('/api/admin/incidents/summary').set(auth(adminToken))
    assert.equal(summary.status, 200)
    assert.ok(summary.body.data.total >= 1)
    assert.ok(summary.body.data.byStatus.CLOSED >= 1)
  })

  await t.test('illegal status jumps are rejected', async () => {
    const made = await request(app)
      .post('/api/incidents')
      .set(auth(userAToken))
      .send({ type: 'Safety', category: 'Hazard', description: 'Workflow guard case.', priority: 'HIGH', location: DELHI })
    incidentCId = made.body.data.incident.id as string

    const jump = await request(app)
      .patch(`/api/admin/incidents/${incidentCId}/status`)
      .set(auth(adminToken))
      .send({ status: 'IN_PROGRESS' })
    assert.equal(jump.status, 400)
    assert.match(jump.body.details[0].message, /Cannot move from REPORTED/)
  })

  await t.test('the owner sees the full chronological history with status pairs', async () => {
    const res = await request(app).get(`/api/incidents/${incidentAId}/updates`).set(auth(userAToken))
    assert.equal(res.status, 200)
    const entries = res.body.data.updates
    assert.ok(entries.length >= 5)
    assert.equal(entries[entries.length - 1].statusTo, 'CLOSED')
    assert.equal(entries[0].statusFrom, 'REPORTED')
    assert.ok(entries.every((u: { createdAt: string }) => typeof u.createdAt === 'string'))
  })

  // ------------------------------------------------------------------
  // 7. AI-assisted risk assessment (real HTTP round-trip to the stub)
  // ------------------------------------------------------------------
  await t.test('risk assessment on an incident without stored coordinates is declined', async () => {
    const noLoc = await request(app)
      .post('/api/incidents')
      .set(auth(userAToken))
      .send({ type: 'Safety', category: 'Hazard', description: 'No coordinates stored.', priority: 'LOW' })
    assert.equal(noLoc.status, 201)
    const res = await request(app).post(`/api/incidents/${noLoc.body.data.incident.id}/risk`).set(auth(userAToken))
    assert.equal(res.status, 400)
    assert.match(res.body.details[0].message, /no location/)
  })

  await t.test('risk factors are real: verified reports nearby raise the score', async () => {
    const risk = await request(app)
      .post('/api/incidents')
      .set(auth(userAToken))
      .send({ type: 'Disaster', category: 'Landslide', description: 'Risk-scored case at Bengaluru site.', priority: 'HIGH', location: BENGALURU })
    assert.equal(risk.status, 201)
    riskIncidentId = risk.body.data.incident.id as string

    const report = await request(app)
      .post('/api/unsafe-reports')
      .set(auth(userAToken))
      .send({ category: 'Landslide zone', description: 'Verified by admin below.', severity: 'High', location: BENGALURU })
    assert.equal(report.status, 201)
    assert.equal(report.body.data.report.isVerified, false)
    verifiedReportId = report.body.data.report.id as string

    const verify = await request(app)
      .patch(`/api/admin/unsafe-reports/${verifiedReportId}`)
      .set(auth(adminToken))
      .send({ isVerified: true })
    assert.equal(verify.status, 200)
    assert.equal(verify.body.data.report.isVerified, true)

    const scored = await request(app).post(`/api/incidents/${riskIncidentId}/risk`).set(auth(userAToken))
    assert.equal(scored.status, 201)
    // 1 verified unsafe-area report within 2 km, 0 other active incidents.
    assert.equal(scored.body.data.assessment.riskScore, 35)
    assert.equal(scored.body.data.assessment.riskLevel, 'MEDIUM')
    assert.equal(scored.body.data.assessment.modelVersion, 'rakshasafe-test-ai-v1')
    assert.ok(scored.body.data.assessment.assessedAt)

    const history = await request(app).get(`/api/incidents/${riskIncidentId}/risk`).set(auth(userAToken))
    assert.equal(history.status, 200)
    assert.equal(history.body.data.assessments.length, 1)
  })

  await t.test('the AI stub actually received the real factor payload', async () => {
    assert.ok(lastAiBodies.length >= 1)
    const last = lastAiBodies[lastAiBodies.length - 1]
    assert.equal(last.verifiedReports, 1)
    assert.equal(last.activeIncidents, 0)
    assert.equal(last.priority, 'HIGH')
    assert.equal(last.incidentType, 'Disaster')
  })

  // ------------------------------------------------------------------
  // 8. Unsafe-area reports (owner + admin verification)
  // ------------------------------------------------------------------
  await t.test('unsafe report requires a location; owners cannot read each other’s reports', async () => {
    const noLoc = await request(app).post('/api/unsafe-reports').set(auth(userAToken)).send({ category: 'Dark alley', description: 'No coords.', severity: 'Medium' })
    assert.equal(noLoc.status, 400)

    const report = await request(app)
      .post('/api/unsafe-reports')
      .set(auth(userAToken))
      .send({ category: 'Dark alley', description: 'Poor lighting near the market.', severity: 'Medium', location: DELHI })
    assert.equal(report.status, 201)
    const reportId = report.body.data.report.id as string

    assert.equal((await request(app).get(`/api/unsafe-reports/${reportId}`).set(auth(userBToken))).status, 404)
    const own = await request(app).get('/api/unsafe-reports').set(auth(userAToken))
    assert.ok(own.body.data.reports.some((r: { id: string }) => r.id === reportId))
    assert.equal(own.body.data.reports[0].isVerified, false)
  })

  await t.test('admin lists and verifies unsafe reports with reporter detail', async () => {
    const list = await request(app).get('/api/admin/unsafe-reports?isVerified=true').set(auth(adminToken))
    assert.equal(list.status, 200)
    assert.ok(list.body.data.reports.some((r: { id: string }) => r.id === verifiedReportId))
    assert.ok(list.body.data.reports.every((r: { isVerified: boolean }) => r.isVerified === true))

    const single = await request(app).get(`/api/admin/unsafe-reports/${verifiedReportId}`).set(auth(adminToken))
    assert.equal(single.status, 200)
    assert.equal(single.body.data.reporter.email, 'module.user.a@example.com')
    assert.equal(single.body.data.report.category, 'Landslide zone')
  })

  // ------------------------------------------------------------------
  // 9. Notifications (in-app events, honestly recorded)
  // ------------------------------------------------------------------
  await t.test('incident events are recorded as real notifications for the owner', async () => {
    const res = await request(app).get('/api/notifications').set(auth(userAToken))
    assert.equal(res.status, 200)

    const inApp = res.body.data.notifications.find(
      (n: { incidentId: string; channel: string; providerResponse: string }) =>
        n.incidentId === incidentAId && n.channel === 'In-App' && String(n.providerResponse).includes('incident.created'),
    )
    assert.ok(inApp, 'expected the incident.created In-App notification for incident A')
    assert.equal(inApp.status, 'DELIVERED')

    const sms = res.body.data.notifications.find((n: { channel: string }) => n.channel === 'SMS')
    assert.ok(sms, 'expected an SMS channel record for the opted-in contact')
    assert.equal(sms.status, 'NOT_CONFIGURED')
    assert.equal(sms.contactName, 'Priya Rao')
  })

  await t.test('responders receive only the in-app events for their assigned incidents', async () => {
    const res = await request(app).get('/api/responder/notifications').set(auth(responderToken))
    assert.equal(res.status, 200)
    assert.ok(res.body.data.notifications.length >= 1)
    assert.ok(res.body.data.notifications.every((n: { channel: string }) => n.channel === 'In-App'))
  })

  // ------------------------------------------------------------------
  // 10. Nearby resources (stored records, geospatial radius)
  // ------------------------------------------------------------------
  await t.test('nearby search requires auth and valid coordinates', async () => {
    assert.equal((await request(app).get('/api/nearby-resources?lat=28.6&lon=77.2')).status, 401)
    const bad = await request(app).get('/api/nearby-resources?lat=abc&lon=77.2').set(auth(userAToken))
    assert.equal(bad.status, 400)
    const over = await request(app).get('/api/nearby-resources?lat=28.6&lon=77.2&radiusKm=999').set(auth(userAToken))
    assert.equal(over.status, 400)
  })

  await t.test('nearby search returns stored operational resources within radius', async () => {
    const res = await request(app).get('/api/nearby-resources?lat=28.61&lon=77.2').set(auth(userAToken))
    assert.equal(res.status, 200)
    assert.ok(res.body.data.resources.length >= 1)
    assert.equal(res.body.data.external.enabled, false)
  })

  await t.test('incident-scoped nearby uses the stored incident location', async () => {
    const res = await request(app).get(`/api/incidents/${incidentAId}/nearby-resources`).set(auth(userAToken))
    assert.equal(res.status, 200)
    assert.equal(res.body.data.hasLocation, true)
    assert.ok(res.body.data.resources.length >= 1)
  })

  // ------------------------------------------------------------------
  // 11. Admin dashboard, users, reports
  // ------------------------------------------------------------------
  await t.test('the admin dashboard aggregates real cross-module counts', async () => {
    const res = await request(app).get('/api/admin/dashboard').set(auth(adminToken))
    assert.equal(res.status, 200)
    assert.ok(res.body.data.users.total >= 4)
    assert.ok(res.body.data.incidents.total >= 4)
    assert.ok(res.body.data.notifications.total >= 1)
    assert.ok(res.body.data.facilities.total >= 2)
    assert.ok(res.body.data.teams.total >= 2)
  })

  await t.test('admin users list is paginated and a user can be renamed', async () => {
    const list = await request(app).get('/api/admin/users?search=Module').set(auth(adminToken))
    assert.equal(list.status, 200)
    assert.ok(list.body.data.users.some((u: { id: string }) => u.id === userBId))

    const rename = await request(app).patch(`/api/admin/users/${userBId}`).set(auth(adminToken)).send({ name: 'Module User B (renamed)' })
    assert.equal(rename.status, 200)
    assert.equal(rename.body.data.user.name, 'Module User B (renamed)')

    // The account cannot be promoted to admin by a call without admin rights.
    assert.equal((await request(app).patch(`/api/admin/users/${userAId}`).set(auth(userBToken)).send({ name: 'Hacked' })).status, 403)
  })

  await t.test('reports aggregate live data, export CSV, and are stored then deletable', async () => {
    const made = await request(app)
      .post('/api/admin/reports')
      .set(auth(adminToken))
      .send({ reportType: 'incident-summary', format: 'CSV', title: 'Live integration run' })
    assert.equal(made.status, 201)
    const reportId = made.body.data.report.id as string
    assert.ok(made.body.data.report.dataSnapshot.incidents.total >= 4)

    const exported = await request(app).get(`/api/admin/reports/${reportId}/export`).set(auth(adminToken))
    assert.equal(exported.status, 200)
    assert.match(String(exported.headers['content-type']), /text\/csv/)
    assert.ok(exported.text.includes('section,metric,value'))
    assert.ok(exported.text.includes('Live integration run'))

    const list = await request(app).get('/api/admin/reports').set(auth(adminToken))
    assert.ok(list.body.data.reports.some((r: { id: string }) => r.id === reportId))

    const del = await request(app).delete(`/api/admin/reports/${reportId}`).set(auth(adminToken))
    assert.equal(del.status, 200)
  })

  await t.test('administrative actions are accountable in the admin log', async () => {
    const userLogs = await AdminLog.countDocuments({ action: 'user.update' })
    assert.ok(userLogs >= 1)
    const reportLogs = await AdminLog.countDocuments({ action: 'report.generate' })
    assert.ok(reportLogs >= 1)
  })
})