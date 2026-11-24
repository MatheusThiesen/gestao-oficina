import type { AppSettings } from '@shared/settings'
import type { CustomerInput, VehicleDetail, VehicleHistoryRow, VehicleInput } from '@shared/registry'
import { vehicleLabel } from '@shared/registry'
import type { DocumentStatus } from '@shared/status'
import { formatDocNumber } from '@shared/format'
import { isValidCnpj, isValidCpf, isValidPhone, isValidPlate, normalizePlate, onlyDigits } from '../domain/validation/identifiers'
import { forecastOilChange, isOilChange, isUnderWarranty, warrantyUntil } from '../domain/vehicle/vehicle-history'
import type { CustomerRepository } from '../infra/repositories/customer-repository'
import type { VehicleRepository, VehicleWithHistory } from '../infra/repositories/vehicle-repository'
import { ValidationError } from './errors'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function saveCustomer(repo: CustomerRepository, input: CustomerInput): Promise<{ id: number }> {
  const name = input.name.trim()
  const document = onlyDigits(input.document ?? '')
  const whatsapp = onlyDigits(input.whatsapp ?? '')
  const email = (input.email ?? '').trim()
  const errors: Record<string, string> = {}

  if (name.length < 2) errors.name = 'Informe o nome do cliente.'
  if (document) {
    const valid = input.type === 'PJ' ? isValidCnpj(document) : isValidCpf(document)
    if (!valid) errors.document = input.type === 'PJ' ? 'CNPJ inválido.' : 'CPF inválido.'
    else {
      const owner = await repo.findIdByDocument(document)
      if (owner !== null && owner !== input.id) errors.document = 'Já existe um cliente com esse documento.'
    }
  }
  if (whatsapp && !isValidPhone(whatsapp)) errors.whatsapp = 'Telefone inválido. Use DDD + número.'
  if (email && !EMAIL.test(email)) errors.email = 'E-mail inválido.'
  if (Object.keys(errors).length > 0) throw ValidationError.fields(errors)

  const id = await repo.save({
    ...input,
    name,
    document,
    whatsapp,
    email,
    address: input.address?.trim(),
    notes: input.notes?.trim()
  })
  return { id }
}

export async function saveVehicle(repo: VehicleRepository, input: VehicleInput): Promise<{ id: number; plate: string }> {
  const plate = normalizePlate(input.plate)
  const errors: Record<string, string> = {}
  const thisYear = new Date().getFullYear()

  if (!isValidPlate(plate)) errors.plate = 'Placa inválida. Use ABC1234 ou ABC1D23.'
  else {
    const existing = await repo.findIdByPlate(plate)
    if (existing !== null && existing !== input.id) errors.plate = 'Essa placa já está cadastrada.'
  }
  if (input.year != null && (input.year < 1950 || input.year > thisYear + 1)) errors.year = 'Ano inválido.'
  if (input.currentKm != null && (input.currentKm < 0 || input.currentKm > 3_000_000)) errors.currentKm = 'KM inválido.'
  if (Object.keys(errors).length > 0) throw ValidationError.fields(errors)

  const id = await repo.save({
    ...input,
    plate,
    brand: input.brand?.trim(),
    model: input.model?.trim(),
    vin: input.vin?.trim().toUpperCase()
  })
  return { id, plate }
}

export async function getVehicleDetail(
  repo: VehicleRepository,
  where: { id: number } | { plate: string },
  settings: AppSettings,
  now = new Date()
): Promise<VehicleDetail | null> {
  const v = await repo.findWithHistory('plate' in where ? { plate: normalizePlate(where.plate) } : where)
  if (!v) return null

  const current = v.ownerships.find((o) => o.endedAt === null)
  const delivered = v.quotes.filter((q) => q.workOrder?.status === 'ENTREGUE' && q.workOrder.deliveredAt)

  return {
    id: v.id,
    plate: v.plate,
    brand: v.brand ?? undefined,
    model: v.model ?? undefined,
    year: v.year,
    color: v.color ?? undefined,
    fuel: v.fuel ?? undefined,
    vin: v.vin ?? undefined,
    currentKm: v.currentKm,
    ownerId: current?.customerId ?? null,
    label: vehicleLabel(v),
    owner: current ? { id: current.customer.id, name: current.customer.name, whatsapp: current.customer.whatsapp } : null,
    previousOwners: v.ownerships
      .filter((o) => o.endedAt !== null)
      .map((o) => ({ name: o.customer.name, startedAt: o.startedAt.toISOString(), endedAt: o.endedAt!.toISOString() })),
    history: v.quotes.map(toHistoryRow),
    warranties: activeWarranties(delivered, now),
    oilChange: oilChangeFor(delivered, v.currentKm, settings),
    stats: { workOrders: delivered.length, totalCents: delivered.reduce((s, q) => s + q.totalCents, 0) }
  }
}

type HistoryQuote = VehicleWithHistory['quotes'][number]

function toHistoryRow(q: HistoryQuote): VehicleHistoryRow {
  const wo = q.workOrder
  const maxWarranty = Math.max(0, ...q.items.map((i) => i.warrantyDays ?? 0))
  return {
    quoteId: q.id,
    date: (wo?.openedAt ?? q.createdAt).toISOString(),
    km: q.entryKm,
    document: wo ? `OS ${formatDocNumber(wo.number)}` : `Orç. ${q.number}`,
    services: q.items.map((i) => i.description).join(', '),
    status: (wo?.status ?? q.status) as DocumentStatus,
    warrantyUntil:
      wo?.status === 'ENTREGUE' && wo.deliveredAt && maxWarranty > 0
        ? warrantyUntil(wo.deliveredAt, maxWarranty).toISOString()
        : null,
    withoutWarranty: q.warrantyDays === 0,
    totalCents: q.totalCents
  }
}

function activeWarranties(delivered: HistoryQuote[], now: Date): VehicleDetail['warranties'] {
  return delivered.flatMap((q) =>
    q.items
      .filter((i) => i.warrantyDays && isUnderWarranty(q.workOrder!.deliveredAt!, i.warrantyDays, now))
      .map((i) => ({
        description: i.description,
        until: warrantyUntil(q.workOrder!.deliveredAt!, i.warrantyDays!).toISOString(),
        workOrderNumber: q.workOrder!.number
      }))
  )
}

function oilChangeFor(delivered: HistoryQuote[], currentKm: number | null, settings: AppSettings): VehicleDetail['oilChange'] {
  const last = delivered.find((q) => q.entryKm !== null && isOilChange(q.items.map((i) => i.description)))
  if (!last) return null
  const f = forecastOilChange({ at: last.workOrder!.deliveredAt!, km: last.entryKm! }, currentKm, {
    km: settings.oilChangeKm,
    months: settings.oilChangeMonths
  })
  return { ...f, lastAt: f.lastAt.toISOString(), nextAt: f.nextAt.toISOString() }
}
