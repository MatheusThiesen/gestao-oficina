import type { CustomerDetail, CustomerInput, CustomerListItem, CustomerType } from '@shared/registry'
import { vehicleLabel } from '@shared/registry'
import type { Db } from '../database'
import type { Prisma } from '../prisma/generated/client'

const currentVehicles = {
  ownerships: {
    where: { endedAt: null },
    include: { vehicle: { select: { id: true, plate: true, brand: true, model: true, year: true } } }
  }
} satisfies Prisma.CustomerInclude

export class CustomerRepository {
  constructor(private readonly db: Db) {}

  async list(search: string): Promise<CustomerListItem[]> {
    const customers = await this.db.customer.findMany({
      where: searchWhere(search),
      include: {
        ...currentVehicles,
        quotes: {
          where: { next: null, workOrder: { isNot: null } },
          select: { totalCents: true, workOrder: { select: { status: true, openedAt: true } } }
        }
      },
      orderBy: { name: 'asc' },
      take: 200
    })

    return customers.map((c) => {
      const delivered = c.quotes.filter((q) => q.workOrder?.status === 'ENTREGUE')
      const lastOpened = c.quotes
        .map((q) => q.workOrder?.openedAt.getTime() ?? 0)
        .reduce((max, t) => Math.max(max, t), 0)
      return {
        id: c.id,
        name: c.name,
        type: c.type as CustomerType,
        whatsapp: c.whatsapp,
        document: c.document,
        vehicles: c.ownerships.map((o) => ({ id: o.vehicle.id, plate: o.vehicle.plate, label: vehicleLabel(o.vehicle) })),
        lastServiceAt: lastOpened ? new Date(lastOpened).toISOString() : null,
        totalSpentCents: delivered.reduce((sum, q) => sum + q.totalCents, 0)
      }
    })
  }

  async get(id: number): Promise<CustomerDetail | null> {
    const c = await this.db.customer.findUnique({ where: { id }, include: currentVehicles })
    if (!c) return null
    return {
      id: c.id,
      type: c.type as CustomerType,
      name: c.name,
      document: c.document ?? undefined,
      whatsapp: c.whatsapp ?? undefined,
      email: c.email ?? undefined,
      address: c.address ?? undefined,
      notes: c.notes ?? undefined,
      vehicles: c.ownerships.map((o) => ({ id: o.vehicle.id, plate: o.vehicle.plate, label: vehicleLabel(o.vehicle) }))
    }
  }

  async findIdByDocument(document: string): Promise<number | null> {
    const c = await this.db.customer.findUnique({ where: { document }, select: { id: true } })
    return c?.id ?? null
  }

  async save(input: Required<Pick<CustomerInput, 'type' | 'name'>> & CustomerInput): Promise<number> {
    const data = {
      type: input.type,
      name: input.name,
      document: input.document || null,
      whatsapp: input.whatsapp || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null
    }
    if (input.id) {
      await this.db.customer.update({ where: { id: input.id }, data })
      return input.id
    }
    return (await this.db.customer.create({ data })).id
  }
}

function searchWhere(raw: string): Prisma.CustomerWhereInput {
  const search = raw.trim()
  if (!search) return {}
  const digits = search.replace(/\D/g, '')
  const or: Prisma.CustomerWhereInput[] = [
    { name: { contains: search } },
    { ownerships: { some: { endedAt: null, vehicle: { plate: { contains: search.replace(/[^a-z0-9]/gi, '').toUpperCase() } } } } }
  ]
  if (digits.length >= 3) or.push({ whatsapp: { contains: digits } }, { document: { contains: digits } })
  return { OR: or }
}
