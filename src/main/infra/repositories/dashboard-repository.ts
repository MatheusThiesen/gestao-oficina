import type { QuoteItemType } from '@shared/quotes'
import type { DeliveredOrder } from '../../domain/dashboard/aggregate'
import { calculateQuoteTotals } from '../../domain/quote/quote-totals'
import { toLine } from '../../application/quotes'
import type { Db } from '../database'

const ACTIVE = ['EM_EXECUCAO', 'PRONTO']

/** Consultas de leitura do painel. */
export class DashboardRepository {
  constructor(private readonly db: Db) {}

  /** OS entregues no intervalo, com o faturado e o custo das peças (copiado em cada item). */
  async deliveredOrders(from: Date, to: Date): Promise<DeliveredOrder[]> {
    const orders = await this.db.workOrder.findMany({
      where: { status: 'ENTREGUE', deliveredAt: { gte: from, lt: to } },
      select: {
        deliveredAt: true,
        quote: { select: { totalCents: true, discountBp: true, items: true } }
      }
    })
    return orders.map((o) => {
      const lines = o.quote.items.map((i) =>
        toLine({ ...i, type: i.type as QuoteItemType })
      )
      const t = calculateQuoteTotals(lines, o.quote.discountBp)
      return {
        deliveredAt: o.deliveredAt!,
        totalCents: o.quote.totalCents,
        partsCents: t.partsCents,
        laborCents: t.laborCents,
        partsCostCents: t.partsCostCents
      }
    })
  }

  async activeOrders() {
    return this.db.workOrder.findMany({
      where: { status: { in: ACTIVE } },
      orderBy: { openedAt: 'asc' },
      select: {
        number: true,
        status: true,
        quoteId: true,
        keyTag: { select: { number: true } },
        vehicle: { select: { plate: true } },
        quote: { select: { totalCents: true, customer: { select: { name: true } } } }
      }
    })
  }

  async awaitingApproval() {
    return this.db.quote.findMany({
      where: { status: 'AGUARDANDO_APROVACAO', next: null },
      orderBy: { validUntil: 'asc' },
      select: {
        id: true,
        number: true,
        sentAt: true,
        validUntil: true,
        totalCents: true,
        customer: { select: { name: true } },
        vehicle: { select: { plate: true } }
      }
    })
  }

  countQuotesCreated(from: Date, to: Date): Promise<number> {
    return this.db.quote.count({ where: { createdAt: { gte: from, lt: to }, version: 1 } })
  }

  /** Orçamentos enviados no período e quantos deles foram aprovados. */
  async approvalStats(from: Date, to: Date): Promise<{ sent: number; approved: number }> {
    const where = { sentAt: { gte: from, lt: to } }
    const [sent, approved] = await Promise.all([
      this.db.quote.count({ where }),
      this.db.quote.count({ where: { ...where, approval: { isNot: null } } })
    ])
    return { sent, approved }
  }

  activeKeyTagCount(): Promise<number> {
    return this.db.keyTag.count({ where: { active: true } })
  }
}
