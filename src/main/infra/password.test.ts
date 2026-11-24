import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('senha', () => {
  it('confere a senha certa e recusa a errada', () => {
    const stored = hashPassword('balcão123')
    expect(stored.startsWith('scrypt$')).toBe(true)
    expect(stored).not.toContain('balcão123')
    expect(verifyPassword('balcão123', stored)).toBe(true)
    expect(verifyPassword('balcao123', stored)).toBe(false)
  })

  it('usa sal aleatório', () => {
    expect(hashPassword('1234')).not.toBe(hashPassword('1234'))
  })

  it('recusa hash malformado', () => {
    expect(verifyPassword('x', 'qualquer-coisa')).toBe(false)
  })
})
