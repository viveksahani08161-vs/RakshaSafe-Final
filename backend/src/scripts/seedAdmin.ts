/**
 * Seed (create or promote) an administrator account.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_NAME="Site Admin"; $env:ADMIN_EMAIL="admin@rakshasafe.local";
 *   $env:ADMIN_PHONE="+910000000001"; $env:ADMIN_PASSWORD="change-me-123";
 *   npm run seed:admin
 *
 * Required env vars: ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD.
 * Optional: ADMIN_NAME (default "Administrator"), MONGO_URI.
 */
import mongoose from 'mongoose'
import { User, UserRole } from '../models/User.js'
import { hashPassword } from '../utils/password.js'
import { isEmail, isPhone } from '../validators/auth.js'

async function main(): Promise<void> {
  const name = (process.env.ADMIN_NAME ?? 'Administrator').trim()
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
  const phone = (process.env.ADMIN_PHONE ?? '').trim()
  const password = process.env.ADMIN_PASSWORD ?? ''
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakshasafe'

  if (!isEmail(email)) {
    console.error('[seed] ADMIN_EMAIL must be a valid email address.')
    process.exit(1)
  }
  if (!isPhone(phone)) {
    console.error('[seed] ADMIN_PHONE must be a valid phone number.')
    process.exit(1)
  }
  if (password.length < 8 || password.length > 128) {
    console.error('[seed] ADMIN_PASSWORD must be between 8 and 128 characters.')
    process.exit(1)
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })

  const existing = await User.findOne({ $or: [{ email }, { phone }] })
  if (existing && String(existing.email) !== email && String(existing.phone) !== phone) {
    console.error('[seed] Email and phone belong to different existing accounts. Aborting.')
    await mongoose.disconnect()
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)
  if (existing) {
    existing.name = name
    existing.email = email
    existing.phone = phone
    existing.passwordHash = passwordHash
    existing.role = UserRole.ADMIN
    await existing.save()
    console.log(`[seed] Promoted/updated admin: ${email} (${existing._id})`)
  } else {
    const created = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: UserRole.ADMIN,
    })
    console.log(`[seed] Created admin: ${email} (${created._id})`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[seed] Failed:', (err as Error).message)
  process.exit(1)
})
