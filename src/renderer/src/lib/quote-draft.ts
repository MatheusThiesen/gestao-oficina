import {
  bpToInput,
  centsToInput,
  formatKm,
  milliToInput,
  parseInteger,
  parseScaled
} from '@shared/format'
import type { QuoteDraftInput, QuoteItemInput, QuoteItemType, QuoteView } from '@shared/quotes'
import type { CustomerInput, VehicleInput } from '@shared/registry'
import type { AppSettings } from '@shared/settings'
import type { PickedCustomer } from '@/components/customer-picker'

/**
 * Estado do editor: os campos numéricos ficam como texto (o usuário digita "1," antes de "1,5").
 * A conversão para inteiros acontece só aqui; regras e cálculos ficam no main.
 */
export interface ItemDraft {
  key: string
  type: QuoteItemType
  description: string
  partId: number | null
  serviceId: number | null
  qty: string
  cost: string
  markup: string
  price: string
  warrantyDays: number | null
}

export interface VehicleRef {
  id: number
  plate: string
  label: string
  currentKm: number | null
  brand: string | null
}

export interface QuoteDraft {
  id?: number
  plate: string
  vehicle: VehicleRef | null
  newVehicle: VehicleInput | null
  customer: PickedCustomer | null
  newCustomer: CustomerInput | null
  entryKm: string
  validityDays: string
  paymentMethod: string
  expectedDeliveryAt: string // datetime-local
  hourlyRate: string
  discount: string
  warrantyDays: string
  notes: string
  items: ItemDraft[]
}

let keySeq = 0
const newKey = () => `i${++keySeq}`

export function newPartItem(settings: AppSettings): ItemDraft {
  return {
    key: newKey(),
    type: 'PECA',
    description: '',
    partId: null,
    serviceId: null,
    qty: '1',
    cost: '0,00',
    markup: bpToInput(settings.defaultMarkupBp),
    price: '',
    warrantyDays: null
  }
}

export function newLaborItem(hourlyRateCents: number): ItemDraft {
  return {
    key: newKey(),
    type: 'MAO_DE_OBRA',
    description: '',
    partId: null,
    serviceId: null,
    qty: '1',
    cost: '',
    markup: '',
    price: centsToInput(hourlyRateCents),
    warrantyDays: null
  }
}

export function emptyDraft(settings: AppSettings, plate = ''): QuoteDraft {
  return {
    plate,
    vehicle: null,
    newVehicle: null,
    customer: null,
    newCustomer: null,
    entryKm: '',
    validityDays: String(settings.validityDays),
    paymentMethod: 'Pix',
    expectedDeliveryAt: '',
    hourlyRate: centsToInput(settings.hourlyRateCents),
    discount: '0',
    warrantyDays: String(settings.warrantyDays),
    notes: '',
    items: []
  }
}

export function draftFromView(q: QuoteView): QuoteDraft {
  return {
    id: q.id,
    plate: q.vehicle.plate,
    vehicle: q.vehicle,
    newVehicle: null,
    customer: q.customer,
    newCustomer: null,
    entryKm: q.entryKm != null ? formatKm(q.entryKm) : '',
    validityDays: String(q.validityDays),
    paymentMethod: q.paymentMethod ?? '',
    expectedDeliveryAt: q.expectedDeliveryAt ? toLocalInput(q.expectedDeliveryAt) : '',
    hourlyRate: centsToInput(q.hourlyRateCents),
    discount: bpToInput(q.discountBp),
    warrantyDays: String(q.warrantyDays),
    notes: q.notes ?? '',
    items: q.items.map((i) => ({
      key: newKey(),
      type: i.type,
      description: i.description,
      partId: i.partId ?? null,
      serviceId: i.serviceId ?? null,
      qty: milliToInput(i.quantityMilli),
      cost: i.unitCostCents != null ? centsToInput(i.unitCostCents) : '',
      markup: i.markupBp != null ? bpToInput(i.markupBp) : '',
      price: centsToInput(i.unitPriceCents),
      warrantyDays: i.warrantyDays ?? null
    }))
  }
}

export function itemToInput(i: ItemDraft): QuoteItemInput {
  return {
    type: i.type,
    description: i.description,
    partId: i.partId,
    serviceId: i.serviceId,
    quantityMilli: parseScaled(i.qty, 3) ?? 0,
    unitCostCents: i.type === 'PECA' ? (parseScaled(i.cost, 2) ?? 0) : null,
    markupBp: i.type === 'PECA' ? (parseScaled(i.markup, 2) ?? 0) : null,
    unitPriceCents: i.type === 'MAO_DE_OBRA' ? (parseScaled(i.price, 2) ?? 0) : null,
    warrantyDays: i.warrantyDays
  }
}

export function draftToInput(d: QuoteDraft): QuoteDraftInput {
  return {
    id: d.id,
    customerId: d.newCustomer ? null : (d.customer?.id ?? null),
    newCustomer: d.newCustomer,
    vehicleId: d.newVehicle ? null : (d.vehicle?.id ?? null),
    newVehicle: d.newVehicle ? { ...d.newVehicle, plate: d.plate } : null,
    entryKm: parseInteger(d.entryKm),
    validityDays: parseInteger(d.validityDays) ?? 0,
    paymentMethod: d.paymentMethod || null,
    expectedDeliveryAt: d.expectedDeliveryAt ? new Date(d.expectedDeliveryAt).toISOString() : null,
    hourlyRateCents: parseScaled(d.hourlyRate, 2) ?? 0,
    discountBp: parseScaled(d.discount, 2) ?? 0,
    warrantyDays: parseInteger(d.warrantyDays) ?? 0,
    notes: d.notes,
    items: d.items.map(itemToInput)
  }
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
