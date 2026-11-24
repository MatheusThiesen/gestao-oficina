import { describe, expect, it } from 'vitest'
import { byDay, summarize, type DeliveredOrder } from './aggregate'
import { lastMonths, periodLabel, periodRange } from './periods'

const now = new Date(2026, 10, 23, 15, 0) // segunda, 23/11/2026

describe('períodos', () => {
  it('semana vai de segunda a domingo', () => {
    const w = periodRange('week', 0, now)
    expect(w.from).toEqual(new Date(2026, 10, 23))
    expect(w.to).toEqual(new Date(2026, 10, 30))
    expect(periodLabel('week', w)).toBe('23/11 a 29/11')
    const sunday = periodRange('week', 0, new Date(2026, 10, 29, 10))
    expect(sunday.from).toEqual(new Date(2026, 10, 23))
    expect(periodRange('week', -1, now).from).toEqual(new Date(2026, 10, 16))
  })

  it('mês do calendário, com navegação para trás atravessando o ano', () => {
    const m = periodRange('month', 0, now)
    expect(m.from).toEqual(new Date(2026, 10, 1))
    expect(m.to).toEqual(new Date(2026, 11, 1))
    expect(periodLabel('month', m)).toBe('Novembro de 2026')
    expect(periodRange('month', -11, now).from).toEqual(new Date(2025, 11, 1))
    expect(lastMonths(6, now).map((r) => r.from.getMonth())).toEqual([5, 6, 7, 8, 9, 10])
  })
})

describe('faturamento × lucro', () => {
  const orders: DeliveredOrder[] = [
    { deliveredAt: new Date(2026, 10, 18, 17), totalCents: 69_000, partsCents: 45_000, laborCents: 24_000, partsCostCents: 35_400 },
    { deliveredAt: new Date(2026, 10, 18, 9), totalCents: 31_000, partsCents: 19_500, laborCents: 11_500, partsCostCents: 15_000 },
    { deliveredAt: new Date(2026, 9, 2, 17), totalCents: 118_000, partsCents: 88_400, laborCents: 29_600, partsCostCents: 68_000 }
  ]

  it('soma o período e calcula lucro bruto e ticket médio', () => {
    const s = summarize(orders, periodRange('month', 0, now))
    expect(s.revenueCents).toBe(100_000)
    expect(s.profitCents).toBe(100_000 - 50_400)
    expect(s.delivered).toBe(2)
    expect(s.averageTicketCents).toBe(50_000)
  })

  it('distribui por dia, com dias vazios zerados', () => {
    const days = byDay(orders, periodRange('week', -1, now)) // 16/11 a 22/11
    expect(days).toHaveLength(7)
    expect(days[2]).toMatchObject({ label: '18/11', revenueCents: 100_000, profitCents: 49_600 })
    expect(days[0]!.revenueCents).toBe(0)
  })
})
