/** Garantia de cada item conta a partir da entrega da OS. */
export function warrantyUntil(deliveredAt: Date, warrantyDays: number): Date {
  const until = new Date(deliveredAt)
  until.setDate(until.getDate() + warrantyDays)
  return until
}

export function isUnderWarranty(deliveredAt: Date, warrantyDays: number, now: Date): boolean {
  return warrantyUntil(deliveredAt, warrantyDays).getTime() >= now.getTime()
}

const OIL_CHANGE = /(^|[^\p{L}])óleo($|[^\p{L}])/iu

/** Um serviço conta como troca de óleo se algum item fala de óleo (ex.: "Óleo 5W30", "Troca de óleo e filtro"). */
export function isOilChange(itemDescriptions: readonly string[]): boolean {
  return itemDescriptions.some((d) => OIL_CHANGE.test(d))
}

export interface OilChangeForecast {
  lastAt: Date
  lastKm: number
  nextKm: number
  nextAt: Date
  /** Negativo quando já passou. Nulo quando o km atual é desconhecido. */
  kmRemaining: number | null
}

/** Próxima troca: última troca + N km ou + M meses, o que vier primeiro. */
export function forecastOilChange(
  last: { at: Date; km: number },
  currentKm: number | null,
  rule: { km: number; months: number }
): OilChangeForecast {
  const nextAt = new Date(last.at)
  nextAt.setMonth(nextAt.getMonth() + rule.months)
  const nextKm = last.km + rule.km
  return {
    lastAt: last.at,
    lastKm: last.km,
    nextKm,
    nextAt,
    kmRemaining: currentKm === null ? null : nextKm - currentKm
  }
}
