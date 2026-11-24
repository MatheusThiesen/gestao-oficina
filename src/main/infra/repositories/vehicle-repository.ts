import type { VehicleInput, VehicleListItem } from '@shared/registry'
import { vehicleLabel } from '@shared/registry'
import type { Db } from '../database'
import type { Prisma } from '../prisma/generated/client'

const detailInclude = {
  ownerships: {
    include: { customer: { select: { id: true, name: true, whatsapp: true } } },
    orderBy: { startedAt: 'desc' }
  },
  quotes: {
    where: { next: null },
    include: {
      items: { orderBy: { position: 'asc' } },
      workOrder: true
    },
    orderBy: { createdAt: 'desc' }
  }
} satisfies Prisma.VehicleInclude

export type VehicleWithHistory = Prisma.VehicleGetPayload<{ include: typeof detailInclude }>

export class VehicleRepository {
  constructor(private readonly db: Db) {}

  async list(search: string): Promise<VehicleListItem[]> {
    const plate = search.replace(/[^a-z0-9]/gi, '').toUpperCase()
    const term = search.trim()
    const vehicles = await this.db.vehicle.findMany({
      where: term
        ? {
            OR: [
              ...(plate ? [{ plate: { contains: plate } }] : []),
              { model: { contains: term } },
              { brand: { contains: term } },
              { ownerships: { some: { endedAt: null, customer: { name: { contains: term } } } } }
            ]
          }
        : {},
      include: {
        ownerships: { where: { endedAt: null }, include: { customer: { select: { name: true } } } },
        workOrders: { select: { openedAt: true }, orderBy: { openedAt: 'desc' }, take: 1 }
      },
      orderBy: { updatedAt: 'desc' },
      take: 200
    })
    return vehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      brand: v.brand,
      label: vehicleLabel(v),
      ownerName: v.ownerships[0]?.customer.name ?? null,
      currentKm: v.currentKm,
      lastServiceAt: v.workOrders[0]?.openedAt.toISOString() ?? null
    }))
  }

  findWithHistory(where: { id: number } | { plate: string }): Promise<VehicleWithHistory | null> {
    return this.db.vehicle.findUnique({ where, include: detailInclude })
  }

  async findIdByPlate(plate: string): Promise<number | null> {
    return (await this.db.vehicle.findUnique({ where: { plate }, select: { id: true } }))?.id ?? null
  }

  async currentOwnerId(vehicleId: number): Promise<number | null> {
    const o = await this.db.vehicleOwnership.findFirst({ where: { vehicleId, endedAt: null }, select: { customerId: true } })
    return o?.customerId ?? null
  }

  /** Salva o veículo e, se o dono mudou, encerra a posse atual e abre outra, numa transação. */
  async save(input: VehicleInput & { plate: string }, now = new Date()): Promise<number> {
    const data = {
      plate: input.plate,
      brand: input.brand || null,
      model: input.model || null,
      year: input.year ?? null,
      color: input.color || null,
      fuel: input.fuel || null,
      vin: input.vin || null,
      currentKm: input.currentKm ?? null
    }

    return this.db.$transaction(async (tx) => {
      const id = input.id
        ? (await tx.vehicle.update({ where: { id: input.id }, data })).id
        : (await tx.vehicle.create({ data })).id

      if (input.ownerId !== undefined) {
        const current = await tx.vehicleOwnership.findFirst({ where: { vehicleId: id, endedAt: null } })
        if (current?.customerId !== input.ownerId) {
          if (current) await tx.vehicleOwnership.update({ where: { id: current.id }, data: { endedAt: now } })
          if (input.ownerId !== null) {
            await tx.vehicleOwnership.create({ data: { vehicleId: id, customerId: input.ownerId, startedAt: now } })
          }
        }
      }
      return id
    })
  }

  /** Atualiza o km atual só se o novo for maior (km nunca volta). */
  async bumpKm(vehicleId: number, km: number): Promise<void> {
    await this.db.vehicle.updateMany({
      where: { id: vehicleId, OR: [{ currentKm: null }, { currentKm: { lt: km } }] },
      data: { currentKm: km }
    })
  }
}
