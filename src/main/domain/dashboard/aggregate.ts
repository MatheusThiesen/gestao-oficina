import type { MoneyPoint, PeriodSummary } from '@shared/dashboard'
import { divRound } from '../integer-math'
import { daysOf, startOfDay, type DateRange } from './periods'

/** Uma OS entregue, já com o faturado e o custo das peças. */
export interface DeliveredOrder {
  deliveredAt: Date
  totalCents: number
  partsCents: number
  laborCents: number
  partsCostCents: number
}

/** Lucro bruto = faturado − custo das peças (mão de obra não tem custo registrado). */
export const profitOf = (o: DeliveredOrder): number => o.totalCents - o.partsCostCents

const inRange = (d: Date, r: DateRange) => d >= r.from && d < r.to

export function summarize(orders: readonly DeliveredOrder[], range: DateRange): PeriodSummary {
  const list = orders.filter((o) => inRange(o.deliveredAt, range))
  const revenue = list.reduce((s, o) => s + o.totalCents, 0)
  return {
    revenueCents: revenue,
    profitCents: list.reduce((s, o) => s + profitOf(o), 0),
    partsRevenueCents: list.reduce((s, o) => s + o.partsCents, 0),
    laborRevenueCents: list.reduce((s, o) => s + o.laborCents, 0),
    delivered: list.length,
    averageTicketCents: list.length ? divRound(revenue, list.length) : 0
  }
}

/** Faturamento e lucro por dia do período (dias sem entrega ficam zerados). */
export function byDay(orders: readonly DeliveredOrder[], range: DateRange): MoneyPoint[] {
  return daysOf(range).map((day) => {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
    const s = summarize(orders, { from: day, to: next })
    return {
      date: day.toISOString(),
      label: `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`,
      revenueCents: s.revenueCents,
      profitCents: s.profitCents
    }
  })
}

export function byRanges(
  orders: readonly DeliveredOrder[],
  ranges: readonly DateRange[],
  label: (r: DateRange) => string
): MoneyPoint[] {
  return ranges.map((r) => {
    const s = summarize(orders, r)
    return { date: r.from.toISOString(), label: label(r), revenueCents: s.revenueCents, profitCents: s.profitCents }
  })
}

export function isToday(d: Date, now: Date): boolean {
  return startOfDay(d).getTime() === startOfDay(now).getTime()
}
