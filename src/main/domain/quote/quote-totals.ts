import { BP_100, divRound, QTY_ONE } from '../integer-math'

export type QuoteItemType = 'PECA' | 'MAO_DE_OBRA'

export interface PartLine {
  type: 'PECA'
  quantityMilli: number
  unitCostCents: number
  markupBp: number
}

/** Mão de obra: horas × valor da hora, ou quantidade 1 × preço fixo do serviço. */
export interface LaborLine {
  type: 'MAO_DE_OBRA'
  quantityMilli: number
  unitPriceCents: number
}

export type QuoteLine = PartLine | LaborLine

export interface PricedLine {
  unitPriceCents: number
  totalCents: number
}

export interface QuoteTotals {
  partsCents: number
  laborCents: number
  subtotalCents: number
  discountCents: number
  totalCents: number
  /** Uso interno: nunca vai para o cliente. */
  partsCostCents: number
  /** Uso interno: nunca vai para o cliente. */
  partsProfitCents: number
}

/** Preço unitário da peça = custo × (1 + markup), arredondado ao centavo. */
export function partUnitPrice(unitCostCents: number, markupBp: number): number {
  return divRound(unitCostCents * (BP_100 + markupBp), BP_100)
}

/** Total da linha = preço unitário × quantidade, arredondado ao centavo. */
export function lineTotal(unitPriceCents: number, quantityMilli: number): number {
  return divRound(unitPriceCents * quantityMilli, QTY_ONE)
}

export function priceLine(line: QuoteLine): PricedLine {
  const unitPriceCents =
    line.type === 'PECA' ? partUnitPrice(line.unitCostCents, line.markupBp) : line.unitPriceCents
  return { unitPriceCents, totalCents: lineTotal(unitPriceCents, line.quantityMilli) }
}

export function calculateQuoteTotals(lines: readonly QuoteLine[], discountBp: number): QuoteTotals {
  let partsCents = 0
  let laborCents = 0
  let partsCostCents = 0

  for (const line of lines) {
    const { totalCents } = priceLine(line)
    if (line.type === 'PECA') {
      partsCents += totalCents
      partsCostCents += lineTotal(line.unitCostCents, line.quantityMilli)
    } else {
      laborCents += totalCents
    }
  }

  const subtotalCents = partsCents + laborCents
  const discountCents = divRound(subtotalCents * discountBp, BP_100)

  return {
    partsCents,
    laborCents,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    partsCostCents,
    partsProfitCents: partsCents - partsCostCents
  }
}
