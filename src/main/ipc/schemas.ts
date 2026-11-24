import { z } from 'zod'

const text = (max: number) => z.string().max(max).optional()
const id = z.number().int().positive()

export const idInput = z.object({ id })
export const searchInput = z.object({ search: text(100) })

export const customerInput = z.object({
  id: id.optional(),
  type: z.enum(['PF', 'PJ']),
  name: z.string().max(120),
  document: text(20),
  whatsapp: text(20),
  email: text(120),
  address: text(250),
  notes: text(1000)
})

export const vehicleInput = z.object({
  id: id.optional(),
  plate: z.string().max(10),
  brand: text(40),
  model: text(60),
  year: z.number().int().nullable().optional(),
  color: text(30),
  fuel: text(20),
  vin: text(20),
  currentKm: z.number().int().nullable().optional(),
  ownerId: id.nullable().optional()
})

export const vehicleLookup = z.union([z.object({ id }), z.object({ plate: z.string().min(1).max(10) })])

const cents = z.number().int().min(-1_000_000_000).max(1_000_000_000)

export const quoteItemInput = z.object({
  type: z.enum(['PECA', 'MAO_DE_OBRA']),
  description: z.string().max(200),
  partId: id.nullable().optional(),
  serviceId: id.nullable().optional(),
  quantityMilli: z.number().int().min(0).max(100_000_000),
  unitCostCents: cents.nullable().optional(),
  markupBp: z.number().int().nullable().optional(),
  unitPriceCents: cents.nullable().optional(),
  warrantyDays: z.number().int().min(0).max(3650).nullable().optional()
})

export const quoteDraftInput = z.object({
  id: id.optional(),
  customerId: id.nullable().optional(),
  newCustomer: customerInput.nullable().optional(),
  vehicleId: id.nullable().optional(),
  newVehicle: vehicleInput.nullable().optional(),
  entryKm: z.number().int().min(0).max(3_000_000).nullable().optional(),
  validityDays: z.number().int(),
  paymentMethod: z.string().max(40).nullable().optional(),
  expectedDeliveryAt: z.iso.datetime().nullable().optional(),
  hourlyRateCents: cents,
  discountBp: z.number().int(),
  warrantyDays: z.number().int(),
  notes: z.string().max(2000).nullable().optional(),
  items: z.array(quoteItemInput).max(200)
})

export const calculateInput = z.object({ items: z.array(quoteItemInput).max(200), discountBp: z.number().int().min(0).max(10_000) })

export const setupInput = z.object({
  appName: z.string().max(60),
  primaryColor: z.string().max(7),
  sidebarColor: z.string().max(7),
  logoDataUrl: z.string().max(3_000_000).nullable().optional(),
  iconPngDataUrl: z.string().max(2_000_000),
  password: z.string().max(200).nullable().optional(),
  shop: z.object({
    name: z.string().max(120),
    cnpj: z.string().max(20),
    address: z.string().max(250),
    whatsapp: z.string().max(20)
  }),
  hourlyRateCents: z.number().int(),
  defaultMarkupBp: z.number().int(),
  validityDays: z.number().int(),
  warrantyDays: z.number().int(),
  keyTagCount: z.number().int(),
  oilChangeKm: z.number().int(),
  oilChangeMonths: z.number().int()
})

export const unlockInput = z.object({ password: z.string().max(200) })
