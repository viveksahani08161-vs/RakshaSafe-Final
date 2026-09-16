import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/** Hash a plain-text password. Never store or return plain-text passwords. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/** Compare a plain-text password against a stored hash. */
export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}
