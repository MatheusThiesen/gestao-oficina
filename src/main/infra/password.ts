import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LEN = 32
const COST = 16_384 // N do scrypt

/** Gera "scrypt$N$salt$hash" (salt e hash em base64). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password.normalize('NFKC'), salt, KEY_LEN, { N: COST })
  return ['scrypt', COST, salt.toString('base64'), hash.toString('base64')].join('$')
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, cost, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'scrypt' || !cost || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = scryptSync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(cost)
  })
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
