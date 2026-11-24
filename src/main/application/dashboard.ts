import type { DashboardData, DashboardQuery } from '@shared/dashboard'
import { byDay, byRanges, isToday, summarize } from '../domain/dashboard/aggregate'
import { addDays, lastMonths, periodLabel, periodRange, previousRange, shortMonth, startOfDay } from '../domain/dashboard/periods'
import type { DashboardRepository } from '../infra/repositories/dashboard-repository'

const MONTHS_IN_TREND = 6
/** Orçamento "vence logo" se a validade acaba em até 2 dias. */
const EXPIRING_DAYS = 2

export async function getDashboard(repo: DashboardRepository, q: DashboardQuery, now = new Date()): Promise<DashboardData> {
  const range = periodRange(q.period, q.offset, now)
  const previous = previousRange(q.period, q.offset, now)
  const months = lastMonths(MONTHS_IN_TREND, now)
  const today = { from: startOfDay(now), to: addDays(startOfDay(now), 1) }

  // Uma consulta cobre tudo: do mais antigo ao mais recente intervalo usado.
  const from = new Date(Math.min(previous.from.getTime(), months[0]!.from.getTime()))
  const to = new Date(Math.max(range.to.getTime(), today.to.getTime()))

  const [orders, active, awaiting, createdToday, approval, keyTotal] = await Promise.all([
    repo.deliveredOrders(from, to),
    repo.activeOrders(),
    repo.awaitingApproval(),
    repo.countQuotesCreated(today.from, today.to),
    repo.approvalStats(range.from, range.to),
    repo.activeKeyTagCount()
  ])

  const deliveredToday = orders.filter((o) => isToday(o.deliveredAt, now))
  const expiringLimit = addDays(today.from, EXPIRING_DAYS + 1)
  const ready = active.filter((o) => o.status === 'PRONTO')

  return {
    today: {
      date: now.toISOString(),
      inShop: active.length,
      ready: ready.length,
      deliveredToday: deliveredToday.length,
      revenueTodayCents: deliveredToday.reduce((s, o) => s + o.totalCents, 0),
      quotesCreatedToday: createdToday,
      awaiting: {
        count: awaiting.length,
        totalCents: awaiting.reduce((s, a) => s + a.totalCents, 0),
        expiringSoon: awaiting.filter((a) => a.validUntil < expiringLimit).length
      },
      keys: { inUse: active.filter((o) => o.keyTag).length, total: keyTotal },
      readyList: ready.map((o) => ({
        quoteId: o.quoteId,
        workOrderNumber: o.number,
        customerName: o.quote.customer.name,
        plate: o.vehicle.plate,
        keyTagNumber: o.keyTag?.number ?? null,
        totalCents: o.quote.totalCents
      })),
      awaitingList: awaiting.slice(0, 8).map((a) => ({
        quoteId: a.id,
        number: a.number,
        customerName: a.customer.name,
        plate: a.vehicle.plate,
        sentAt: a.sentAt?.toISOString() ?? null,
        validUntil: a.validUntil.toISOString(),
        totalCents: a.totalCents
      }))
    },
    period: {
      period: q.period,
      offset: q.offset,
      label: periodLabel(q.period, range),
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      current: summarize(orders, range),
      previous: summarize(orders, previous),
      quotesSent: approval.sent,
      quotesApproved: approval.approved,
      days: byDay(orders, range)
    },
    months: byRanges(orders, months, (r) => shortMonth(r.from))
  }
}
