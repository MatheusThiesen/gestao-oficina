import type { CatalogPart, CatalogService } from '@shared/quotes'
import type { Db } from '../database'
import type { Prisma } from '../prisma/generated/client'

export const quoteFullInclude = {
  customer: { select: { id: true, name: true, whatsapp: true, document: true } },
  vehicle: { select: { id: true, plate: true, brand: true, model: true, year: true, color: true, currentKm: true } },
  items: { orderBy: { position: 'asc' } },
  approval: true,
  next: { select: { id: true } },
  workOrder: { include: { keyTag: { select: { number: true } } } }
} satisfies Prisma.QuoteInclude

export type QuoteFull = Prisma.QuoteGetPayload<{ include: typeof quoteFullInclude }>

export type QuoteItemRow = Omit<Prisma.QuoteItemCreateManyInput, 'quoteId'>

export type QuoteHeader = Omit<Prisma.QuoteUncheckedCreateInput, 'items' | 'number' | 'id'>

export class QuoteRepository {
  constructor(private readonly db: Db) {}

  findFull(id: number): Promise<QuoteFull | null> {
    return this.db.quote.findUnique({ where: { id }, include: quoteFullInclude })
  }

  /** Cria o orçamento com o próximo número e os itens, numa transação. */
  async create(header: QuoteHeader, items: QuoteItemRow[]): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const last = await tx.quote.aggregate({ _max: { number: true } })
      const number = Math.max(last._max.number ?? 0, 1000) + 1
      const quote = await tx.quote.create({ data: { ...header, number, items: { create: items } } })
      return quote.id
    })
  }

  /** Atualiza cabeçalho e substitui os itens, numa transação. */
  async update(id: number, header: Partial<QuoteHeader>, items: QuoteItemRow[]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.quoteItem.deleteMany({ where: { quoteId: id } })
      await tx.quote.update({ where: { id }, data: { ...header, items: { create: items } } })
    })
  }

  async searchParts(search: string): Promise<CatalogPart[]> {
    const term = search.trim()
    return this.db.part.findMany({
      where: term ? { OR: [{ name: { contains: term } }, { code: { contains: term } }] } : {},
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, code: true, name: true, brand: true, lastCostCents: true, defaultMarkupBp: true }
    })
  }

  async searchServices(search: string): Promise<CatalogService[]> {
    const term = search.trim()
    return this.db.service.findMany({
      where: term ? { name: { contains: term } } : {},
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, name: true, defaultHoursMilli: true, fixedPriceCents: true }
    })
  }
}
