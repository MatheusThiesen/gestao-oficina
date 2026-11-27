import { formatDate, formatMoney } from '@shared/format'
import type { QuoteStatus, WorkOrderStatus } from '@shared/status'
import type { ApproveInput, KeyTagOptions, SendResult, WorkflowAction } from '@shared/workflow'
import { isValidPhone, onlyDigits } from '../domain/validation/identifiers'
import { computeValidUntil } from '../domain/quote/quote-rules'
import { assertAllowed, suggestKeyTag, WorkflowError } from '../domain/quote/workflow'
import type { QuoteFull, QuoteRepository } from '../infra/repositories/quote-repository'
import type { SettingsRepository } from '../infra/repositories/settings-repository'
import type { VehicleRepository } from '../infra/repositories/vehicle-repository'
import type { WorkflowRepository } from '../infra/repositories/workflow-repository'
import { NotFoundError, ValidationError } from './errors'
import { generateQuotePdf, type QuotePdfDeps } from './quote-pdf'
import { toView } from './quotes'

export interface WorkflowDeps extends QuotePdfDeps {
  quotes: QuoteRepository
  workflow: WorkflowRepository
  vehicles: VehicleRepository
  settings: SettingsRepository
}

async function load(deps: WorkflowDeps, id: number, action: WorkflowAction): Promise<QuoteFull> {
  const q = await deps.quotes.findFull(id)
  if (!q) throw new NotFoundError('Orçamento')
  try {
    assertAllowed(
      { quote: q.status as QuoteStatus, workOrder: (q.workOrder?.status as WorkOrderStatus) ?? null, superseded: !!q.next },
      action
    )
  } catch (error) {
    if (error instanceof WorkflowError) throw new ValidationError(error.message)
    throw error
  }
  return q
}

export async function keyTagOptions(deps: WorkflowDeps): Promise<KeyTagOptions> {
  const { active, inUse } = await deps.workflow.keyTagUsage()
  const used = new Set(inUse)
  return { free: active.filter((n) => !used.has(n)).sort((a, b) => a - b), suggested: suggestKeyTag(active, inUse) }
}

/** Confere se a chave existe, está ativa e livre; devolve o id. */
async function resolveKeyTag(deps: WorkflowDeps, number: number | null): Promise<number | null> {
  if (number === null) return null
  const { free } = await keyTagOptions(deps)
  if (!free.includes(number)) throw ValidationError.fields({ keyTagNumber: `A chave ${String(number).padStart(2, '0')} não está livre.` })
  return deps.workflow.keyTagId(number)
}

/** Gera o PDF, marca como aguardando aprovação e monta a mensagem do WhatsApp. */
export async function sendQuote(deps: WorkflowDeps, id: number, now = new Date()): Promise<SendResult> {
  const q = await load(deps, id, 'send')
  if (q.items.length === 0) throw new ValidationError('Adicione ao menos um item antes de enviar.')
  await deps.workflow.markSent(id, now, computeValidUntil(now, q.validityDays))
  const { path } = await generateQuotePdf(deps, id)
  const settings = await deps.settings.get()
  const phone = onlyDigits(q.customer.whatsapp ?? '')
  const validUntil = computeValidUntil(now, q.validityDays)
  const vehicle = [q.vehicle.brand, q.vehicle.model].filter(Boolean).join(' ') || 'veículo'
  const message =
    `Olá, ${q.customer.name.split(' ')[0]}! Aqui é da ${settings.shop.name || settings.branding.appName}. ` +
    `Segue o orçamento nº ${q.number} do ${vehicle} (placa ${q.vehicle.plate}): total de ${formatMoney(q.totalCents)}, ` +
    `válido até ${formatDate(validUntil)}. O PDF vai em anexo. Para aprovar, é só responder esta mensagem.`
  return {
    pdfPath: path,
    message,
    whatsappUrl: isValidPhone(phone) ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}` : null
  }
}

/** Registra a aprovação com a cópia do orçamento como foi aprovado e, se pedido, abre a OS. */
export async function approveQuote(deps: WorkflowDeps, input: ApproveInput, now = new Date()): Promise<{ workOrderNumber: number | null }> {
  const q = await load(deps, input.id, 'approve')
  const approvedBy = input.approvedBy.trim()
  if (approvedBy.length < 2) throw ValidationError.fields({ approvedBy: 'Informe quem aprovou.' })
  if (q.items.length === 0) throw new ValidationError('O orçamento não tem itens.')
  const keyTagId = input.openWorkOrder ? await resolveKeyTag(deps, input.keyTagNumber) : null

  const workOrderNumber = await deps.workflow.approve({
    quoteId: q.id,
    approvedAt: now,
    channel: input.channel,
    approvedBy,
    snapshot: JSON.stringify(toView(q)),
    workOrder: input.openWorkOrder ? { vehicleId: q.vehicleId, entryKm: q.entryKm, keyTagId } : null
  })
  return { workOrderNumber }
}

export async function openWorkOrder(deps: WorkflowDeps, id: number, keyTagNumber: number | null, now = new Date()): Promise<{ workOrderNumber: number }> {
  const q = await load(deps, id, 'openWorkOrder')
  const keyTagId = await resolveKeyTag(deps, keyTagNumber)
  return { workOrderNumber: await deps.workflow.openWorkOrder(q.id, { vehicleId: q.vehicleId, entryKm: q.entryKm, keyTagId }, now) }
}

export async function refuseQuote(deps: WorkflowDeps, id: number, reason: string | null, now = new Date()): Promise<void> {
  await load(deps, id, 'refuse')
  await deps.workflow.refuse(id, now, reason?.trim() || null)
}

/** Volta para rascunho com validade contando de novo a partir de hoje. */
export async function reopenQuote(deps: WorkflowDeps, id: number, now = new Date()): Promise<void> {
  const q = await load(deps, id, 'reopen')
  await deps.workflow.reopen(id, computeValidUntil(now, q.validityDays))
}

export async function markReady(deps: WorkflowDeps, id: number, now = new Date()): Promise<void> {
  const q = await load(deps, id, 'markReady')
  await deps.workflow.setWorkOrderStatus(q.workOrder!.id, { status: 'PRONTO', readyAt: now })
}

export async function backToExecution(deps: WorkflowDeps, id: number): Promise<void> {
  const q = await load(deps, id, 'backToExecution')
  await deps.workflow.setWorkOrderStatus(q.workOrder!.id, { status: 'EM_EXECUCAO', readyAt: null })
}

/** Entrega (pago): registra como o cliente pagou, a garantia começa a contar e a chave fica livre. */
export async function deliver(
  deps: WorkflowDeps,
  id: number,
  exitKm: number | null,
  paymentMethod: string | null = null,
  now = new Date()
): Promise<void> {
  const q = await load(deps, id, 'deliver')
  const entry = q.workOrder!.entryKm ?? q.entryKm
  if (exitKm != null && entry != null && exitKm < entry) {
    throw ValidationError.fields({ exitKm: `O km de saída não pode ser menor que o de entrada (${entry}).` })
  }
  if (paymentMethod) await deps.workflow.setPaymentMethod(q.id, paymentMethod)
  await deps.workflow.setWorkOrderStatus(q.workOrder!.id, { status: 'ENTREGUE', deliveredAt: now, exitKm })
  if (exitKm) await deps.vehicles.bumpKm(q.vehicleId, exitKm)
}

export async function cancelWorkOrder(deps: WorkflowDeps, id: number, reason: string, now = new Date()): Promise<void> {
  const q = await load(deps, id, 'cancelWorkOrder')
  if (reason.trim().length < 3) throw ValidationError.fields({ reason: 'Informe o motivo do cancelamento.' })
  await deps.workflow.setWorkOrderStatus(q.workOrder!.id, { status: 'CANCELADA', canceledAt: now, cancelReason: reason.trim() })
}
