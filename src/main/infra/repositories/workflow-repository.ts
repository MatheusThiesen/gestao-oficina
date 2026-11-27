import type { ApprovalChannel } from '@shared/quotes'
import type { QuoteStatus, WorkOrderStatus } from '@shared/status'
import type { Db } from '../database'

const ACTIVE: WorkOrderStatus[] = ['EM_EXECUCAO', 'PRONTO']

/** Gravações do fluxo de status (orçamento → OS). */
export class WorkflowRepository {
  constructor(private readonly db: Db) {}

  async keyTagUsage(): Promise<{ active: number[]; inUse: number[] }> {
    const [tags, used] = await Promise.all([
      this.db.keyTag.findMany({ where: { active: true }, select: { number: true } }),
      this.db.workOrder.findMany({ where: { status: { in: ACTIVE }, keyTagId: { not: null } }, select: { keyTag: { select: { number: true } } } })
    ])
    return { active: tags.map((t) => t.number), inUse: used.map((u) => u.keyTag!.number) }
  }

  async keyTagId(number: number): Promise<number | null> {
    return (await this.db.keyTag.findUnique({ where: { number }, select: { id: true } }))?.id ?? null
  }

  markSent(quoteId: number, sentAt: Date, validUntil: Date): Promise<unknown> {
    return this.db.quote.update({
      where: { id: quoteId },
      data: { status: 'AGUARDANDO_APROVACAO' satisfies QuoteStatus, sentAt, validUntil }
    })
  }

  /** Aprova (com a cópia de como foi aprovado) e, se pedido, abre a OS — tudo numa transação. */
  async approve(input: {
    quoteId: number
    approvedAt: Date
    channel: ApprovalChannel
    approvedBy: string
    snapshot: string
    workOrder: { vehicleId: number; entryKm: number | null; keyTagId: number | null } | null
  }): Promise<number | null> {
    return this.db.$transaction(async (tx) => {
      await tx.quoteApproval.create({
        data: {
          quoteId: input.quoteId,
          approvedAt: input.approvedAt,
          channel: input.channel,
          approvedBy: input.approvedBy,
          snapshot: input.snapshot
        }
      })
      await tx.quote.update({ where: { id: input.quoteId }, data: { status: 'APROVADO' satisfies QuoteStatus } })
      if (!input.workOrder) return null
      const last = await tx.workOrder.aggregate({ _max: { number: true } })
      const wo = await tx.workOrder.create({
        data: {
          number: Math.max(last._max.number ?? 0, 1000) + 1,
          quoteId: input.quoteId,
          vehicleId: input.workOrder.vehicleId,
          entryKm: input.workOrder.entryKm,
          keyTagId: input.workOrder.keyTagId,
          openedAt: input.approvedAt,
          status: 'EM_EXECUCAO' satisfies WorkOrderStatus
        }
      })
      return wo.number
    })
  }

  async openWorkOrder(quoteId: number, data: { vehicleId: number; entryKm: number | null; keyTagId: number | null }, at: Date): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const last = await tx.workOrder.aggregate({ _max: { number: true } })
      const wo = await tx.workOrder.create({
        data: { number: Math.max(last._max.number ?? 0, 1000) + 1, quoteId, ...data, openedAt: at, status: 'EM_EXECUCAO' }
      })
      return wo.number
    })
  }

  refuse(quoteId: number, at: Date, reason: string | null): Promise<unknown> {
    return this.db.quote.update({
      where: { id: quoteId },
      data: { status: 'RECUSADO' satisfies QuoteStatus, refusedAt: at, refusalReason: reason }
    })
  }

  reopen(quoteId: number, validUntil: Date): Promise<unknown> {
    return this.db.quote.update({
      where: { id: quoteId },
      data: { status: 'RASCUNHO' satisfies QuoteStatus, sentAt: null, refusedAt: null, refusalReason: null, validUntil }
    })
  }

  /** Como o cliente pagou (confirmado na entrega). */
  setPaymentMethod(quoteId: number, paymentMethod: string): Promise<unknown> {
    return this.db.quote.update({ where: { id: quoteId }, data: { paymentMethod } })
  }

  setWorkOrderStatus(
    workOrderId: number,
    data: { status: WorkOrderStatus; readyAt?: Date | null; deliveredAt?: Date; canceledAt?: Date; cancelReason?: string; exitKm?: number | null }
  ): Promise<unknown> {
    return this.db.workOrder.update({ where: { id: workOrderId }, data })
  }
}
