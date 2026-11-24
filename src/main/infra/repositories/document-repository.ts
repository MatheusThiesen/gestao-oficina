import { DOCUMENT_FILTERS, type DocumentFilter, type DocumentListItem } from '@shared/documents'
import type { DocumentStatus, QuoteStatus, WorkOrderStatus } from '@shared/status'
import type { Db } from '../database'
import type { Prisma } from '../prisma/generated/client'

const WORK_ORDER_FILTERS: readonly string[] = ['EM_EXECUCAO', 'PRONTO', 'ENTREGUE']
const ACTIVE_WORK_ORDER: WorkOrderStatus[] = ['EM_EXECUCAO', 'PRONTO']

const listInclude = {
  customer: { select: { name: true } },
  vehicle: { select: { plate: true, model: true, year: true } },
  workOrder: { select: { number: true, status: true, keyTag: { select: { number: true } } } }
} satisfies Prisma.QuoteInclude

type QuoteForList = Prisma.QuoteGetPayload<{ include: typeof listInclude }>

/** Leitura da lista unificada de orçamentos e OS (sempre a versão vigente de cada orçamento). */
export class DocumentRepository {
  constructor(private readonly db: Db) {}

  async list(search: string, filter: DocumentFilter): Promise<DocumentListItem[]> {
    const rows = await this.db.quote.findMany({
      where: { AND: [{ next: null }, statusWhere(filter), searchWhere(search)] },
      include: listInclude,
      orderBy: [{ createdAt: 'desc' }, { number: 'desc' }]
    })
    return rows.map(toListItem)
  }

  async countByFilter(): Promise<Record<DocumentFilter, number>> {
    const rows = await this.db.quote.findMany({
      where: { next: null },
      select: { status: true, workOrder: { select: { status: true } } }
    })
    const counts = Object.fromEntries(DOCUMENT_FILTERS.map((f) => [f, 0])) as Record<DocumentFilter, number>
    for (const row of rows) {
      counts.TODOS++
      const status = (row.workOrder?.status ?? row.status) as DocumentFilter
      if (status in counts) counts[status]++
    }
    return counts
  }

  async quotesAwaitingApproval(): Promise<{ id: number; validUntil: Date }[]> {
    return this.db.quote.findMany({
      where: { status: 'AGUARDANDO_APROVACAO' satisfies QuoteStatus },
      select: { id: true, validUntil: true }
    })
  }

  async markExpired(ids: number[]): Promise<void> {
    if (ids.length === 0) return
    await this.db.quote.updateMany({ where: { id: { in: ids } }, data: { status: 'EXPIRADO' satisfies QuoteStatus } })
  }
}

function statusWhere(filter: DocumentFilter): Prisma.QuoteWhereInput {
  if (filter === 'TODOS') return {}
  if (WORK_ORDER_FILTERS.includes(filter)) return { workOrder: { status: filter } }
  return { status: filter, workOrder: null }
}

/** Busca por placa, cliente, nº do orçamento, nº da OS ou nº da chave (só OS ativa). */
function searchWhere(raw: string): Prisma.QuoteWhereInput {
  const search = raw.trim()
  if (!search) return {}

  const or: Prisma.QuoteWhereInput[] = [
    { customer: { name: { contains: search } } },
    { vehicle: { plate: { contains: search.replace(/[^a-z0-9]/gi, '').toUpperCase() || search } } }
  ]

  if (/^\d+$/.test(search)) {
    const n = Number(search)
    or.push(
      { number: n },
      { workOrder: { number: n } },
      { workOrder: { keyTag: { number: n }, status: { in: ACTIVE_WORK_ORDER } } }
    )
  }
  return { OR: or }
}

function toListItem(q: QuoteForList): DocumentListItem {
  const vehicle = [q.vehicle.model, q.vehicle.year].filter(Boolean).join(' ')
  return {
    quoteId: q.id,
    quoteNumber: q.number,
    quoteVersion: q.version,
    workOrderNumber: q.workOrder?.number ?? null,
    date: q.createdAt.toISOString(),
    customerName: q.customer.name,
    plate: q.vehicle.plate,
    vehicleLabel: vehicle,
    keyTagNumber:
      q.workOrder && ACTIVE_WORK_ORDER.includes(q.workOrder.status as WorkOrderStatus)
        ? (q.workOrder.keyTag?.number ?? null)
        : null,
    status: (q.workOrder?.status ?? q.status) as DocumentStatus,
    totalCents: q.totalCents
  }
}
