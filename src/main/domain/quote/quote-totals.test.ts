import { describe, expect, it } from 'vitest'
import { divRound } from '../integer-math'
import { calculateQuoteTotals, partUnitPrice, priceLine, type QuoteLine } from './quote-totals'

describe('divRound', () => {
  it('arredonda meio para cima sem ponto flutuante', () => {
    expect(divRound(5, 10)).toBe(1)
    expect(divRound(4, 10)).toBe(0)
    expect(divRound(-5, 10)).toBe(-1)
    expect(divRound(1_234_567, 1_000)).toBe(1_235)
  })
})

describe('cálculo do orçamento', () => {
  const pastilha: QuoteLine = { type: 'PECA', quantityMilli: 1_000, unitCostCents: 12_000, markupBp: 4_000 }
  const discos: QuoteLine = { type: 'PECA', quantityMilli: 2_000, unitCostCents: 18_000, markupBp: 3_500 }
  const maoDeObra: QuoteLine = { type: 'MAO_DE_OBRA', quantityMilli: 1_500, unitPriceCents: 12_000 }

  it('reproduz o exemplo do orçamento 1042 (R$ 834,00)', () => {
    expect(priceLine(pastilha)).toEqual({ unitPriceCents: 16_800, totalCents: 16_800 })
    expect(priceLine(discos)).toEqual({ unitPriceCents: 24_300, totalCents: 48_600 })
    expect(priceLine(maoDeObra)).toEqual({ unitPriceCents: 12_000, totalCents: 18_000 })

    expect(calculateQuoteTotals([pastilha, discos, maoDeObra], 0)).toEqual({
      partsCents: 65_400,
      laborCents: 18_000,
      subtotalCents: 83_400,
      discountCents: 0,
      totalCents: 83_400,
      partsCostCents: 48_000,
      partsProfitCents: 17_400
    })
  })

  it('aplica desconto percentual sobre peças + mão de obra', () => {
    const totals = calculateQuoteTotals([pastilha, discos, maoDeObra], 500) // 5%
    expect(totals.discountCents).toBe(4_170)
    expect(totals.totalCents).toBe(79_230)
  })

  it('arredonda o preço unitário ao centavo antes de multiplicar pela quantidade', () => {
    // 18,90 × 1,30 = 24,57; × 3 = 73,71
    expect(partUnitPrice(1_890, 3_000)).toBe(2_457)
    expect(priceLine({ type: 'PECA', quantityMilli: 3_000, unitCostCents: 1_890, markupBp: 3_000 }).totalCents).toBe(7_371)
    // R$ 0,33 × 1,25 = 0,4125 → R$ 0,41
    expect(partUnitPrice(33, 2_500)).toBe(41)
  })

  it('orçamento vazio é zero', () => {
    expect(calculateQuoteTotals([], 1_000).totalCents).toBe(0)
  })
})
