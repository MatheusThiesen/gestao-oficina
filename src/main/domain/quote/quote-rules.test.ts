import { describe, expect, it } from 'vitest'
import { computeValidUntil, isEditable, validateDraft } from './quote-rules'

describe('regras do orçamento', () => {
  it('aprovado, recusado e expirado ficam somente leitura', () => {
    expect(isEditable('RASCUNHO')).toBe(true)
    expect(isEditable('AGUARDANDO_APROVACAO')).toBe(true)
    expect(isEditable('APROVADO')).toBe(false)
    expect(isEditable('RECUSADO')).toBe(false)
    expect(isEditable('EXPIRADO')).toBe(false)
  })

  it('validade vai até o fim do último dia', () => {
    const until = computeValidUntil(new Date(2026, 10, 23, 9, 30), 10)
    expect(until.getDate()).toBe(3)
    expect(until.getMonth()).toBe(11)
    expect(until.getHours()).toBe(23)
  })

  it('aponta o item inválido', () => {
    const errors = validateDraft({
      discountBp: 0,
      validityDays: 10,
      warrantyDays: 90,
      hourlyRateCents: 12_000,
      items: [
        { description: 'Pastilha', line: { type: 'PECA', quantityMilli: 1000, unitCostCents: 100, markupBp: 3000 } },
        { description: ' ', line: { type: 'MAO_DE_OBRA', quantityMilli: 1000, unitPriceCents: 100 } },
        { description: 'Óleo', line: { type: 'PECA', quantityMilli: 0, unitCostCents: 100, markupBp: 3000 } }
      ]
    })
    expect(Object.keys(errors)).toEqual(['items.1', 'items.2'])
  })
})
