export type DashboardPeriod = 'week' | 'month'

export interface DashboardQuery {
  period: DashboardPeriod
  /** 0 = atual, -1 = anterior… */
  offset: number
}

export interface MoneyPoint {
  /** ISO do início do dia/mês. */
  date: string
  label: string
  revenueCents: number
  profitCents: number
}

export interface PeriodSummary {
  revenueCents: number
  profitCents: number
  partsRevenueCents: number
  laborRevenueCents: number
  delivered: number
  averageTicketCents: number
}

export interface DashboardData {
  today: {
    date: string
    inShop: number
    ready: number
    deliveredToday: number
    revenueTodayCents: number
    quotesCreatedToday: number
    awaiting: { count: number; totalCents: number; expiringSoon: number }
    keys: { inUse: number; total: number }
    readyList: { quoteId: number; workOrderNumber: number; customerName: string; plate: string; keyTagNumber: number | null; totalCents: number }[]
    awaitingList: { quoteId: number; number: number; customerName: string; plate: string; sentAt: string | null; validUntil: string; totalCents: number }[]
  }
  period: {
    period: DashboardPeriod
    offset: number
    label: string
    from: string
    to: string
    current: PeriodSummary
    previous: PeriodSummary
    quotesSent: number
    quotesApproved: number
    days: MoneyPoint[]
  }
  months: MoneyPoint[]
}
