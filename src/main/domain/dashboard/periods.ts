import type { DashboardPeriod } from '@shared/dashboard'

export interface DateRange {
  /** Inclusivo, 00:00 local. */
  from: Date
  /** Exclusivo. */
  to: Date
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
}

/** Semana de segunda a domingo; mês do calendário. `offset` -1 = período anterior. */
export function periodRange(period: DashboardPeriod, offset: number, now: Date): DateRange {
  if (period === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() + offset, 1),
      to: new Date(now.getFullYear(), now.getMonth() + offset + 1, 1)
    }
  }
  const today = startOfDay(now)
  const mondayOffset = (today.getDay() + 6) % 7 // domingo → 6
  const from = addDays(today, -mondayOffset + offset * 7)
  return { from, to: addDays(from, 7) }
}

export function previousRange(period: DashboardPeriod, offset: number, now: Date): DateRange {
  return periodRange(period, offset - 1, now)
}

export function periodLabel(period: DashboardPeriod, range: DateRange): string {
  if (period === 'month') return `${capitalize(MONTHS[range.from.getMonth()]!)} de ${range.from.getFullYear()}`
  const last = addDays(range.to, -1)
  return `${fmt(range.from)} a ${fmt(last)}`
}

export function daysOf(range: DateRange): Date[] {
  const days: Date[] = []
  for (let d = range.from; d < range.to; d = addDays(d, 1)) days.push(d)
  return days
}

/** Os últimos `count` meses, terminando no mês de `now` (mais antigo primeiro). */
export function lastMonths(count: number, now: Date): DateRange[] {
  return Array.from({ length: count }, (_, i) => periodRange('month', i - count + 1, now))
}

export function shortMonth(d: Date): string {
  return `${MONTHS[d.getMonth()]!.slice(0, 3)}/${String(d.getFullYear()).slice(2)}`
}

function fmt(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
