import type {
  ApprovalChannel,
  QuoteCalculation,
  QuoteDraftInput,
  QuoteItemInput,
  QuoteItemType,
  QuoteView
} from '@shared/quotes'
import { vehicleLabel } from '@shared/registry'
import type { DocumentStatus, QuoteStatus, WorkOrderStatus } from '@shared/status'
import { computeValidUntil, isEditable, validateDraft, type DraftItem } from '../domain/quote/quote-rules'
import { allowedActions } from '../domain/quote/workflow'
import { calculateQuoteTotals, priceLine, type QuoteLine } from '../domain/quote/quote-totals'
import type { CustomerRepository } from '../infra/repositories/customer-repository'
import type { QuoteFull, QuoteItemRow, QuoteRepository } from '../infra/repositories/quote-repository'
import type { VehicleRepository } from '../infra/repositories/vehicle-repository'
import { NotFoundError, ValidationError } from './errors'
import { saveCustomer, saveVehicle } from './registry'

export interface QuoteDeps {
  quotes: QuoteRepository
  customers: CustomerRepository
  vehicles: VehicleRepository
}

export function toLine(item: QuoteItemInput): QuoteLine {
  return item.type === 'PECA'
    ? {
        type: 'PECA',
        quantityMilli: item.quantityMilli,
        unitCostCents: item.unitCostCents ?? 0,
        markupBp: item.markupBp ?? 0
      }
    : { type: 'MAO_DE_OBRA', quantityMilli: item.quantityMilli, unitPriceCents: item.unitPriceCents ?? 0 }
}

export function calculateQuote(items: QuoteItemInput[], discountBp: number): QuoteCalculation {
  const lines = items.map(toLine)
  return { items: lines.map(priceLine), totals: calculateQuoteTotals(lines, discountBp) }
}

export async function saveQuoteDraft(deps: QuoteDeps, input: QuoteDraftInput, now = new Date()): Promise<{ id: number }> {
  const draftItems: DraftItem[] = input.items.map((i) => ({ description: i.description, line: toLine(i) }))
  const errors = validateDraft({ ...input, items: draftItems })
  if (!input.customerId && !input.newCustomer) errors.customer = 'Informe o cliente.'
  if (!input.vehicleId && !input.newVehicle) errors.plate = 'Informe a placa do veículo.'
  if (Object.keys(errors).length > 0) throw ValidationError.fields(errors)

  const existing = input.id ? await deps.quotes.findFull(input.id) : null
  if (input.id && !existing) throw new NotFoundError('Orçamento')
  if (existing && (!isEditable(existing.status as QuoteStatus) || existing.next)) {
    throw new ValidationError('Este orçamento não pode mais ser alterado. Crie uma nova versão.')
  }

  const customerId = input.customerId ?? (await saveCustomer(deps.customers, input.newCustomer!).catch(prefix('customer.'))).id
  const vehicleId =
    input.vehicleId ??
    (await saveVehicle(deps.vehicles, { ...input.newVehicle!, ownerId: customerId }).catch(prefix('vehicle.'))).id

  const totals = calculateQuoteTotals(
    draftItems.map((d) => d.line),
    input.discountBp
  )
  const header = {
    customerId,
    vehicleId,
    entryKm: input.entryKm ?? null,
    validityDays: input.validityDays,
    validUntil: computeValidUntil(existing?.sentAt ?? existing?.createdAt ?? now, input.validityDays),
    paymentMethod: input.paymentMethod || null,
    expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null,
    hourlyRateCents: input.hourlyRateCents,
    discountBp: input.discountBp,
    warrantyDays: input.warrantyDays,
    notes: input.notes?.trim() || null,
    totalCents: totals.totalCents
  }
  const rows = toItemRows(input.items, input.warrantyDays)

  const id = existing
    ? (await deps.quotes.update(existing.id, header, rows), existing.id)
    : await deps.quotes.create({ ...header, status: 'RASCUNHO' satisfies QuoteStatus }, rows)

  if (input.entryKm) await deps.vehicles.bumpKm(vehicleId, input.entryKm)
  return { id }
}

/** Erros de cliente/veículo novos voltam com prefixo para a tela saber qual campo marcar. */
function prefix(p: string) {
  return (error: unknown): never => {
    if (error instanceof ValidationError) {
      throw ValidationError.fields(Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [p + k, v])))
    }
    throw error
  }
}

/** Cada item herda a garantia do orçamento (0 = sem garantia). */
function toItemRows(items: QuoteItemInput[], quoteWarrantyDays: number): QuoteItemRow[] {
  return items.map((item, position) => {
    const priced = priceLine(toLine(item))
    const isPart = item.type === 'PECA'
    return {
      type: item.type,
      description: item.description.trim(),
      partId: isPart ? (item.partId ?? null) : null,
      serviceId: isPart ? null : (item.serviceId ?? null),
      quantityMilli: item.quantityMilli,
      unitCostCents: isPart ? (item.unitCostCents ?? 0) : null,
      markupBp: isPart ? (item.markupBp ?? 0) : null,
      unitPriceCents: priced.unitPriceCents,
      totalCents: priced.totalCents,
      warrantyDays: quoteWarrantyDays,
      position
    }
  })
}

export async function getQuoteView(repo: QuoteRepository, id: number): Promise<QuoteView> {
  const q = await repo.findFull(id)
  if (!q) throw new NotFoundError('Orçamento')
  return toView(q)
}

export function toView(q: QuoteFull): QuoteView {
  const items = q.items.map((i) => ({
    id: i.id,
    type: i.type as QuoteItemType,
    description: i.description,
    partId: i.partId,
    serviceId: i.serviceId,
    quantityMilli: i.quantityMilli,
    unitCostCents: i.unitCostCents,
    markupBp: i.markupBp,
    unitPriceCents: i.unitPriceCents,
    totalCents: i.totalCents,
    warrantyDays: i.warrantyDays
  }))
  const status = q.status as QuoteStatus
  const wo = q.workOrder

  return {
    id: q.id,
    number: q.number,
    version: q.version,
    previousId: q.previousId,
    nextId: q.next?.id ?? null,
    status,
    displayStatus: (wo?.status ?? status) as DocumentStatus,
    editable: isEditable(status) && !q.next,
    actions: allowedActions({ quote: status, workOrder: (wo?.status as WorkOrderStatus) ?? null, superseded: !!q.next }),
    refusal: q.refusedAt ? { at: q.refusedAt.toISOString(), reason: q.refusalReason } : null,
    createdAt: q.createdAt.toISOString(),
    sentAt: q.sentAt?.toISOString() ?? null,
    validUntil: q.validUntil.toISOString(),
    customer: { id: q.customer.id, name: q.customer.name, whatsapp: q.customer.whatsapp },
    vehicle: {
      id: q.vehicle.id,
      plate: q.vehicle.plate,
      label: vehicleLabel(q.vehicle),
      currentKm: q.vehicle.currentKm,
      brand: q.vehicle.brand
    },
    entryKm: q.entryKm,
    validityDays: q.validityDays,
    paymentMethod: q.paymentMethod,
    expectedDeliveryAt: q.expectedDeliveryAt?.toISOString() ?? null,
    hourlyRateCents: q.hourlyRateCents,
    discountBp: q.discountBp,
    warrantyDays: q.warrantyDays,
    notes: q.notes,
    items,
    // Totais recalculados a partir das linhas gravadas (custo/markup/preço copiados).
    totals: calculateQuoteTotals(items.map(toLine), q.discountBp),
    approval: q.approval
      ? {
          approvedAt: q.approval.approvedAt.toISOString(),
          channel: q.approval.channel as ApprovalChannel,
          approvedBy: q.approval.approvedBy
        }
      : null,
    workOrder: wo
      ? {
          id: wo.id,
          number: wo.number,
          status: wo.status as WorkOrderStatus,
          keyTagNumber: wo.keyTag?.number ?? null,
          openedAt: wo.openedAt.toISOString(),
          readyAt: wo.readyAt?.toISOString() ?? null,
          deliveredAt: wo.deliveredAt?.toISOString() ?? null,
          canceledAt: wo.canceledAt?.toISOString() ?? null,
          cancelReason: wo.cancelReason,
          entryKm: wo.entryKm,
          exitKm: wo.exitKm
        }
      : null
  }
}
