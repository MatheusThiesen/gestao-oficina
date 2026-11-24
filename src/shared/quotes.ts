import type { CustomerInput, VehicleInput } from './registry'
import type { DocumentStatus, QuoteStatus, WorkOrderStatus } from './status'
import type { WorkflowAction } from './workflow'

export type QuoteItemType = 'PECA' | 'MAO_DE_OBRA'

export const PAYMENT_METHODS = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Boleto'] as const

/** Linha como a tela envia. O main recalcula preço e total; não confia nos valores da tela. */
export interface QuoteItemInput {
  type: QuoteItemType
  description: string
  partId?: number | null
  serviceId?: number | null
  quantityMilli: number
  /** Peça: custo e markup copiados para a linha. */
  unitCostCents?: number | null
  markupBp?: number | null
  /** Mão de obra: valor da hora ou preço fixo. */
  unitPriceCents?: number | null
  warrantyDays?: number | null
}

export interface QuoteDraftInput {
  id?: number
  /** Cliente existente ou um novo para cadastrar junto. */
  customerId?: number | null
  newCustomer?: CustomerInput | null
  /** Veículo existente ou um novo (com a placa) para cadastrar junto. */
  vehicleId?: number | null
  newVehicle?: VehicleInput | null
  entryKm?: number | null
  validityDays: number
  paymentMethod?: string | null
  expectedDeliveryAt?: string | null
  hourlyRateCents: number
  discountBp: number
  warrantyDays: number
  notes?: string | null
  items: QuoteItemInput[]
}

export interface PricedItem {
  unitPriceCents: number
  totalCents: number
}

export interface QuoteTotalsView {
  partsCents: number
  laborCents: number
  subtotalCents: number
  discountCents: number
  totalCents: number
  partsCostCents: number
  partsProfitCents: number
}

export interface QuoteCalculation {
  items: PricedItem[]
  totals: QuoteTotalsView
}

export interface QuoteItemView extends Omit<QuoteItemInput, 'unitPriceCents'>, PricedItem {
  id: number
}

export interface QuoteView {
  id: number
  number: number
  version: number
  previousId: number | null
  nextId: number | null
  status: QuoteStatus
  /** Status mostrado no cabeçalho: o da OS, se houver. */
  displayStatus: DocumentStatus
  editable: boolean
  /** Ações de status permitidas agora (calculadas no processo principal). */
  actions: WorkflowAction[]
  refusal: { at: string; reason: string | null } | null
  createdAt: string
  sentAt: string | null
  validUntil: string
  customer: { id: number; name: string; whatsapp: string | null }
  vehicle: { id: number; plate: string; label: string; currentKm: number | null; brand: string | null }
  entryKm: number | null
  validityDays: number
  paymentMethod: string | null
  expectedDeliveryAt: string | null
  hourlyRateCents: number
  discountBp: number
  warrantyDays: number
  notes: string | null
  items: QuoteItemView[]
  totals: QuoteTotalsView
  approval: { approvedAt: string; channel: ApprovalChannel; approvedBy: string } | null
  workOrder: {
    id: number
    number: number
    status: WorkOrderStatus
    keyTagNumber: number | null
    openedAt: string
    readyAt: string | null
    deliveredAt: string | null
    canceledAt: string | null
    cancelReason: string | null
    entryKm: number | null
    exitKm: number | null
  } | null
}

export type ApprovalChannel = 'BALCAO' | 'TELEFONE' | 'WHATSAPP'
export const APPROVAL_CHANNEL_LABEL: Record<ApprovalChannel, string> = {
  BALCAO: 'Balcão',
  TELEFONE: 'Telefone',
  WHATSAPP: 'WhatsApp'
}

export interface CatalogPart {
  id: number
  code: string | null
  name: string
  brand: string | null
  lastCostCents: number
  defaultMarkupBp: number | null
}

export interface CatalogService {
  id: number
  name: string
  defaultHoursMilli: number | null
  fixedPriceCents: number | null
}
