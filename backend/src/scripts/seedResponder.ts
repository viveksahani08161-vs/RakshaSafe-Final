/**
 * Seed (create or promote) a responder account.
 *
 * Usage (PowerShell):
 *   $env:RESPONDER_NAME="Field Responder"; $env:RESPONDER_EMAIL="responder@rakshasafe.local";
 *   $env:RESPONDER_PHONE="+910000000002"; $env:RESPONDER_PASSWORD="change-me-123";
 *   npm run seed:responder
 *
 * Required env vars: RESPONDER_EMAIL, RESPONDER_PHONE, RESPONDER_PASSWORD.
 * Optional: RESPONDER_NAME (default "Responder"), MONGO_URI, TEAM_ID
 * (when set, the responder is also linked to that rescue team).
 */
import mongoose from 'mongoose'
import { RescueTeam } from '../models/RescueTeam.js'
import { User, UserRole } from '../models/User.js'
import { hashPassword } from '../utils/password.js'
import { isEmail, isPhone } from '../validators/auth.js'

async function main(): Promise<void> {
  const name = (process.env.RESPONDER_NAME ?? 'Responder').trim()
  const email = (process.env.RESPONDER_EMAIL ?? '').trim().toLowerCase()
  const phone = (process.env.RESPONDER_PHONE ?? '').trim()
  const password = process.env.RESPONDER_PASSWORD ?? ''
  const teamId = (process.env.TEAM_ID ?? '').trim()
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakshasafe'

  if (!isEmail(email)) {
    console.error('[seed] RESPONDER_EMAIL must be a valid email address.')
    process.exit(1)
  }
  if (!isPhone(phone)) {
    console.error('[seed] RESPONDER_PHONE must be a valid phone number.')
    process.exit(1)
  }
  if (password.length < 8 || password.length > 128) {
    console.error('[seed] RESPONDER_PASSWORD must be between 8 and 128 characters.')
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
  const user = existing ?? new User({ name, email, phone, passwordHash, role: UserRole.RESPONDER })
  user.name = name
  user.email = email
  user.phone = phone
  user.passwordHash = passwordHash
  user.role = UserRole.RESPONDER
  await user.save()
  console.log(`[seed] Responder ready: ${email} (${user._id})`)

  if (teamId) {
    const team = await RescueTeam.findById(teamId)
    if (!team) {
      console.error(`[seed] TEAM_ID not found: ${teamId}. Responder created without team link.`)
    } else {
      if (!team.members.some((m) => String(m) === String(user._id))) {
        team.members.push(user._id)
        await team.save()
        console.log(`[seed] Linked responder to team: ${team.name} (${team._id})`)
      } else {
        console.log('[seed] Responder already linked to team.')
      }
    }
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[seed] Failed:', (err as Error).message)
  process.exit(1)
})
