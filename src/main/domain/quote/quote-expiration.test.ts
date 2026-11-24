import { describe, expect, it } from 'vitest'
import { shouldExpire } from './quote-expiration'

const now = new Date(2026, 10, 23, 10, 0)

describe('expiração do orçamento', () => {
  it('expira o aguardando aprovação depois da validade', () => {
    expect(shouldExpire('AGUARDANDO_APROVACAO', new Date(2026, 10, 22), now)).toBe(true)
    expect(shouldExpire('AGUARDANDO_APROVACAO', new Date(2026, 10, 24), now)).toBe(false)
  })

  it('não expira rascunho nem orçamento já respondido', () => {
    expect(shouldExpire('RASCUNHO', new Date(2026, 0, 1), now)).toBe(false)
    expect(shouldExpire('APROVADO', new Date(2026, 0, 1), now)).toBe(false)
  })
})
