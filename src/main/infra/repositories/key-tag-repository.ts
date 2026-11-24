import type { KeyTagView } from '@shared/documents'
import type { Db } from '../database'

export class KeyTagRepository {
  constructor(private readonly db: Db) {}

  /** Garante que existam as chaves 1..count (as excedentes ficam inativas, sem apagar histórico). */
  async ensureCount(count: number): Promise<void> {
    const existing = await this.db.keyTag.findMany({ select: { number: true } })
    const have = new Set(existing.map((k) => k.number))
    const missing = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !have.has(n))
    if (missing.length > 0) await this.db.keyTag.createMany({ data: missing.map((number) => ({ number })) })
    await this.db.keyTag.updateMany({ where: { number: { lte: count } }, data: { active: true } })
    await this.db.keyTag.updateMany({ where: { number: { gt: count } }, data: { active: false } })
  }

  /** Chaves ativas, com a OS que está usando cada uma (em execução ou pronta). */
  async listWithUsage(): Promise<KeyTagView[]> {
    const tags = await this.db.keyTag.findMany({
      where: { active: true },
      orderBy: { number: 'asc' },
      include: {
        workOrders: {
          where: { status: { in: ['EM_EXECUCAO', 'PRONTO'] } },
          take: 1,
          include: { vehicle: { select: { plate: true } }, quote: { select: { customer: { select: { name: true } } } } }
        }
      }
    })
    return tags.map((tag) => {
      const wo = tag.workOrders[0]
      return {
        number: tag.number,
        inUse: wo
          ? {
              workOrderNumber: wo.number,
              quoteId: wo.quoteId,
              plate: wo.vehicle.plate,
              customerName: wo.quote.customer.name,
              status: wo.status as 'EM_EXECUCAO' | 'PRONTO'
            }
          : null
      }
    })
  }
}
