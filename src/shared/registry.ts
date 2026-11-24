import type { DocumentStatus } from './status'

export type CustomerType = 'PF' | 'PJ'

export interface CustomerInput {
  id?: number
  type: CustomerType
  name: string
  document?: string
  whatsapp?: string
  email?: string
  address?: string
  notes?: string
}

export interface VehicleSummary {
  id: number
  plate: string
  label: string
}

export interface CustomerListItem {
  id: number
  name: string
  type: CustomerType
  whatsapp: string | null
  document: string | null
  vehicles: VehicleSummary[]
  lastServiceAt: string | null
  totalSpentCents: number
}

export interface CustomerDetail extends CustomerInput {
  id: number
  vehicles: VehicleSummary[]
}

export interface VehicleInput {
  id?: number
  plate: string
  brand?: string
  model?: string
  year?: number | null
  color?: string
  fuel?: string
  vin?: string
  currentKm?: number | null
  /** Dono atual. Se mudar, encerra a posse anterior e abre uma nova (histórico preservado). */
  ownerId?: number | null
}

export interface VehicleListItem {
  id: number
  plate: string
  brand: string | null
  label: string
  ownerName: string | null
  currentKm: number | null
  lastServiceAt: string | null
}

export interface VehicleHistoryRow {
  quoteId: number
  date: string
  km: number | null
  document: string
  services: string
  status: DocumentStatus
  /** Data final da garantia (OS entregue). */
  warrantyUntil: string | null
  /** Serviço feito sem garantia. */
  withoutWarranty: boolean
  totalCents: number
}

export interface VehicleOwnerRef {
  id: number
  name: string
  whatsapp: string | null
}

export interface VehicleDetail extends VehicleInput {
  id: number
  label: string
  owner: VehicleOwnerRef | null
  previousOwners: { name: string; startedAt: string; endedAt: string }[]
  history: VehicleHistoryRow[]
  warranties: { description: string; until: string; workOrderNumber: number }[]
  oilChange: { lastAt: string; lastKm: number; nextKm: number; nextAt: string; kmRemaining: number | null } | null
  stats: { workOrders: number; totalCents: number }
}

export const FUELS = ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'GNV', 'Híbrido', 'Elétrico'] as const

export function vehicleLabel(v: { brand?: string | null; model?: string | null; year?: number | null }): string {
  return [v.brand, v.model, v.year].filter(Boolean).join(' ')
}
