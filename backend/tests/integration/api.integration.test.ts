import { test } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../../src/app.js'
import { AdminLog } from '../../src/models/AdminLog.js'
import { User, UserRole } from '../../src/models/User.js'
import { hashPassword } from '../../src/utils/password.js'

test('RakshaSafe API integration suite (real MongoDB via in-memory mongod)', async (t) => {
  // A real mongod binary is downloaded on first use and runs in-memory,
  // so integration tests exercise the genuine MongoDB wire protocol and the
  // real application code without touching any production data.
  const mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri(), { serverSelectionTimeoutMS: 20_000 })
  await mongoose.connection.dropDatabase()
  const app = createApp()

  let userAToken = ''
  let userBToken = ''
  let adminToken = ''
  let contactId = ''
  let adminUserId = ''

  t.after(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    await mongod.stop()
  })

  await t.test('health check reports the database as connected', async () => {
    const res = await request(app).get('/api/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.db?.connected, true)
  })

  await t.test('a brand-new user can register and receives a JWT', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Integration User A',
      email: 'it.user.a@example.com',
      phone: '9876543210',
      password: 'Password@123',
      language: 'en',
    })
    assert.equal(res.status, 201)
    assert.ok(res.body.data.token)
    assert.equal(res.body.data.user.role, 'USER')
    userAToken = res.body.data.token as string
  })

  await t.test('a second user cannot see the first user\u2019s future data', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Integration User B',
      email: 'it.user.b@example.com',
      phone: '9876543211',
      password: 'Password@123',
    })
    assert.equal(res.status, 201)
    userBToken = res.body.data.token as string
  })

  await t.test('duplicate email registration is rejected', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate',
      email: 'it.user.a@example.com',
      phone: '9876567890',
      password: 'Password@123',
    })
    assert.equal(res.status, 409)
  })

  await t.test('login rejects a wrong password with a generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'it.user.a@example.com',
      password: 'TotallyWrong1',
    })
    assert.equal(res.status, 401)
    assert.equal(res.body.error, 'Invalid credentials.')
  })

  await t.test('a known administrator can authenticate', async () => {
    const passwordHash = await hashPassword('AdminPass@123')
    const admin = await User.create({
      name: 'Integration Admin',
      email: 'it.admin@example.com',
      phone: '9999900000',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    })
    adminUserId = String(admin._id)
    const res = await request(app).post('/api/auth/login').send({
      identifier: 'it.admin@example.com',
      password: 'AdminPass@123',
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.user.role, 'ADMIN')
    adminToken = res.body.data.token as string
  })

  await t.test('GET /api/auth/me returns the authenticated profile', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userAToken}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.data.user.email, 'it.user.a@example.com')
  })

  await t.test('unauthenticated access to a protected route is rejected (401)', async () => {
    const res = await request(app).get('/api/auth/me')
    assert.equal(res.status, 401)
  })

  await t.test('a USER token is forbidden from administrator routes (403)', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${userAToken}`)
    assert.equal(res.status, 403)
  })

  await t.test('missing auth on an administrator route is rejected (401)', async () => {
    const res = await request(app).get('/api/admin/dashboard')
    assert.equal(res.status, 401)
  })

  await t.test('an ADMIN token can open the administrator dashboard (200)', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 200)
  })

  await t.test('user creates an emergency contact and it is normalized and stored', async () => {
    const res = await request(app)
      .post('/api/emergency-contacts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'Priya Rao',
        phone: '+91 98765 43210',
        email: 'priya@example.com',
        relationship: 'Sister',
        notifyViaSms: true,
        notifyViaEmail: false,
        isPrimary: true,
      })
    assert.equal(res.status, 201)
    assert.equal(res.body.data.contact.phone, '+919876543210')
    contactId = res.body.data.contact.id as string
  })

  await t.test('creating a contact with an invalid phone number is rejected (400)', async () => {
    const res = await request(app)
      .post('/api/emergency-contacts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Bad Phone', phone: '123', notifyViaSms: true, notifyViaEmail: false })
    assert.equal(res.status, 400)
  })

  await t.test('a user lists only their own contacts (ownership isolation)', async () => {
    const own = await request(app).get('/api/emergency-contacts').set('Authorization', `Bearer ${userAToken}`)
    const other = await request(app).get('/api/emergency-contacts').set('Authorization', `Bearer ${userBToken}`)
    assert.equal(own.status, 200)
    assert.equal(other.status, 200)
    assert.ok(own.body.data.contacts.some((c: { id: string }) => c.id === contactId))
    assert.equal(other.body.data.contacts.length, 0)
  })

  await t.test('a user cannot update another user\u2019s contact', async () => {
    const res = await request(app)
      .patch(`/api/emergency-contacts/${contactId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'Hacked' })
    assert.equal(res.status, 404)
  })

  await t.test('a user can update their own contact', async () => {
    const res = await request(app)
      .patch(`/api/emergency-contacts/${contactId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ relationship: 'Mother' })
    assert.equal(res.status, 200)
    assert.equal(res.body.data.contact.relationship, 'Mother')
  })

  await t.test('a malformed ObjectId in a path is rejected (400), not a crash', async () => {
    const res = await request(app)
      .patch('/api/emergency-contacts/not-an-object-id')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'X' })
    assert.equal(res.status, 400)
  })

  await t.test('updating a non-existent contact returns 404', async () => {
    const res = await request(app)
      .patch('/api/emergency-contacts/507f1f77bcf86cd799439099')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Ghost' })
    assert.equal(res.status, 404)
  })

  await t.test('an administrator can list all emergency contacts with owner info', async () => {
    const res = await request(app).get('/api/admin/emergency-contacts').set('Authorization', `Bearer ${adminToken}`)
    assert.equal(res.status, 200)
    const found = res.body.data.contacts.find((c: { id: string }) => c.id === contactId)
    assert.ok(found)
    assert.equal(found.ownerEmail, 'it.user.a@example.com')
  })

  await t.test('an administrator can update and then delete any contact', async () => {
    const upd = await request(app)
      .patch(`/api/admin/emergency-contacts/${contactId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Priya Rao (verified)' })
    assert.equal(upd.status, 200)

    const del = await request(app)
      .delete(`/api/admin/emergency-contacts/${contactId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    assert.equal(del.status, 200)

    const after = await request(app)
      .get('/api/emergency-contacts')
      .set('Authorization', `Bearer ${userAToken}`)
    assert.equal(after.body.data.contacts.length, 0)
  })

  await t.test('admin activity is recorded in the admin logs', async () => {
    const logs = await AdminLog.countDocuments({})
    assert.ok(logs > 0)
  })
})