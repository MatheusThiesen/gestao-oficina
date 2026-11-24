import type { QuoteStatus, WorkOrderStatus } from '@shared/status'
import { DEFAULT_SETTINGS } from '@shared/settings'
import { calculateQuoteTotals, priceLine, type QuoteLine } from '../../domain/quote/quote-totals'
import type { Db } from '../database'
import { KeyTagRepository } from '../repositories/key-tag-repository'
import { SettingsRepository } from '../repositories/settings-repository'

/**
 * Dados fictícios do protótipo (referencias/prototipo.html), só para desenvolvimento.
 * Roda quando o banco ainda não tem clientes.
 */

const HOUR = DEFAULT_SETTINGS.hourlyRateCents

/** Data local (dd/mm/aaaa como no protótipo) às `time`. */
function at(date: string, time = '09:00'): Date {
  const [d, m, y] = date.split('/').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y!, m! - 1, d!, h, min)
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

type SeedItem = { description: string; partCode?: string; serviceName?: string } & QuoteLine

const part = (description: string, qty: number, costCents: number, markupBp: number, partCode?: string): SeedItem => ({
  type: 'PECA',
  description,
  partCode,
  quantityMilli: Math.round(qty * 1000),
  unitCostCents: costCents,
  markupBp
})

const labor = (description: string, hours: number, serviceName?: string): SeedItem => ({
  type: 'MAO_DE_OBRA',
  description,
  serviceName,
  quantityMilli: Math.round(hours * 1000),
  unitPriceCents: HOUR
})

const fixed = (description: string, priceCents: number, serviceName?: string): SeedItem => ({
  type: 'MAO_DE_OBRA',
  description,
  serviceName,
  quantityMilli: 1000,
  unitPriceCents: priceCents
})

interface SeedQuote {
  number: number
  date: string
  customer: string
  plate: string
  km: number
  status: QuoteStatus
  items: SeedItem[]
  notes?: string
  payment?: string
  workOrder?: {
    number: number
    status: WorkOrderStatus
    key?: number
    deliveredAt?: string
    readyAt?: string
  }
}

const CUSTOMERS = [
  { name: 'Carla Menezes', document: '43148291093', whatsapp: '51998765432', email: 'carla.menezes@email.com' },
  { name: 'Rodrigo Alves', document: '25421533026', whatsapp: '51991230087' },
  { name: 'Fernanda Lima', document: '50490312063', whatsapp: '51984552210' },
  {
    name: 'Transportes Sul Ltda',
    type: 'PJ',
    document: '12100120000140',
    whatsapp: '5133449080',
    address: 'Av. dos Estados, 1500 — Porto Alegre/RS'
  },
  { name: 'Juliana Rocha', document: '76677456099', whatsapp: '51997026631' },
  { name: 'Paulo Souza', document: '14911845236', whatsapp: '51996014418', notes: 'Motorista da Transportes Sul.' },
  { name: 'Marcos Vieira', document: '17465023122', whatsapp: '51992218840' },
  { name: 'Ana Paula Costa', document: '94030987400', whatsapp: '51985407712' },
  { name: 'Luiz Fernando', document: '64854761210', whatsapp: '51993308126' }
]

const VEHICLES = [
  { plate: 'QRS2D47', brand: 'Chevrolet', model: 'Onix 1.0', year: 2019, color: 'Prata', fuel: 'Flex', vin: '9BGKS48U0KG104521', km: 48_210, owner: 'Carla Menezes' },
  { plate: 'IJK5B12', brand: 'Volkswagen', model: 'Gol 1.6', year: 2016, color: 'Branco', fuel: 'Flex', km: 112_400, owner: 'Rodrigo Alves' },
  { plate: 'MNO7C33', brand: 'Hyundai', model: 'HB20 1.0', year: 2020, color: 'Cinza', fuel: 'Flex', km: 61_870, owner: 'Fernanda Lima' },
  { plate: 'ABC1D23', brand: 'Fiat', model: 'Strada 1.4', year: 2018, color: 'Branco', fuel: 'Flex', km: 158_300, owner: 'Transportes Sul Ltda' },
  { plate: 'JKL2M45', brand: 'Fiat', model: 'Fiorino 1.4', year: 2020, color: 'Branco', fuel: 'Flex', km: 98_750, owner: 'Transportes Sul Ltda' },
  { plate: 'DEF4G56', brand: 'Renault', model: 'Kwid 1.0', year: 2021, color: 'Vermelho', fuel: 'Flex', km: 37_920, owner: 'Juliana Rocha' },
  { plate: 'GHI8J90', brand: 'Toyota', model: 'Corolla 2.0', year: 2017, color: 'Preto', fuel: 'Flex', km: 134_500, owner: 'Marcos Vieira' },
  { plate: 'TUV3K21', brand: 'Renault', model: 'Sandero 1.6', year: 2015, color: 'Prata', fuel: 'Flex', km: 141_050, owner: 'Ana Paula Costa' },
  { plate: 'XYZ6L78', brand: 'Volkswagen', model: 'Saveiro 1.6', year: 2019, color: 'Branco', fuel: 'Flex', km: 87_330, owner: 'Luiz Fernando' }
]

const PARTS = [
  { code: 'FF-PD-ONIX', name: 'Pastilha de freio dianteira Onix', brand: 'Cobreq', cost: 12_000, markup: 4_000 },
  { code: 'FF-DD-ONIX', name: 'Disco de freio dianteiro Onix', brand: 'Fremax', cost: 18_000, markup: 3_500 },
  { code: 'AC-KCD-HB20', name: 'Kit correia dentada HB20', brand: 'Gates', cost: 23_800, markup: 2_500 },
  { code: 'LR-5W30', name: 'Óleo 5W30 (litro)', brand: 'Mobil', cost: 3_250, markup: 3_000 },
  { code: 'AC-PSL55', name: 'Filtro de óleo PSL 55', brand: 'Tecfil', cost: 1_890, markup: 3_000 }
]

const SERVICES = [
  { name: 'Substituição de pastilhas e discos', hours: 1.5 },
  { name: 'Troca da correia dentada', fixed: 11_500 },
  { name: 'Troca de óleo e filtro', fixed: 5_990 },
  { name: 'Alinhamento e balanceamento', fixed: 11_500 }
]

const QUOTES: SeedQuote[] = [
  // Histórico (OS entregues)
  {
    number: 701, date: '15/03/2025', customer: 'Carla Menezes', plate: 'QRS2D47', km: 31_200, status: 'APROVADO',
    items: [part('Pneu 185/65 R15', 2, 39_200, 2_500)],
    workOrder: { number: 712, status: 'ENTREGUE', deliveredAt: '15/03/2025' }
  },
  {
    number: 795, date: '20/09/2025', customer: 'Carla Menezes', plate: 'QRS2D47', km: 36_400, status: 'APROVADO',
    items: [part('Lonas de freio traseiras', 1, 12_000, 2_500), fixed('Troca das lonas traseiras', 11_000)],
    workOrder: { number: 801, status: 'ENTREGUE', deliveredAt: '20/09/2025' }
  },
  {
    number: 930, date: '10/06/2026', customer: 'Transportes Sul Ltda', plate: 'JKL2M45', km: 92_100, status: 'APROVADO',
    items: [
      fixed('Retífica do cabeçote', 320_000),
      part('Jogo de juntas do cabeçote', 1, 120_000, 3_500),
      labor('Montagem do cabeçote', 2.5)
    ],
    workOrder: { number: 941, status: 'ENTREGUE', deliveredAt: '13/06/2026' }
  },
  {
    number: 952, date: '14/07/2026', customer: 'Rodrigo Alves', plate: 'IJK5B12', km: 108_900, status: 'APROVADO',
    items: [
      part('Kit correia dentada com bomba d’água', 1, 70_000, 3_000),
      labor('Troca da correia e bomba d’água', 6),
      part('Vela de ignição', 4, 5_000, 3_000),
      fixed('Limpeza dos bicos injetores', 5_000)
    ],
    workOrder: { number: 960, status: 'ENTREGUE', deliveredAt: '15/07/2026' }
  },
  {
    number: 980, date: '12/08/2026', customer: 'Carla Menezes', plate: 'QRS2D47', km: 44_900, status: 'APROVADO',
    items: [
      part('Óleo 5W30 (litro)', 4, 3_250, 3_000, 'LR-5W30'),
      part('Filtro de óleo', 1, 2_000, 3_000),
      fixed('Alinhamento e balanceamento', 11_500, 'Alinhamento e balanceamento')
    ],
    workOrder: { number: 987, status: 'ENTREGUE', deliveredAt: '12/08/2026' }
  },
  {
    number: 995, date: '18/09/2026', customer: 'Transportes Sul Ltda', plate: 'ABC1D23', km: 151_200, status: 'APROVADO',
    items: [
      part('Kit de embreagem', 1, 150_000, 3_000),
      labor('Troca do kit de embreagem', 6),
      part('Cilindro mestre de embreagem', 1, 42_000, 2_500)
    ],
    workOrder: { number: 1002, status: 'ENTREGUE', deliveredAt: '19/09/2026' }
  },
  {
    number: 1001, date: '02/10/2026', customer: 'Carla Menezes', plate: 'QRS2D47', km: 46_750, status: 'APROVADO',
    items: [
      part('Amortecedor traseiro', 2, 28_000, 3_000),
      part('Kit batente e coifa', 2, 6_000, 3_000),
      fixed('Troca dos amortecedores traseiros', 29_600)
    ],
    workOrder: { number: 1003, status: 'ENTREGUE', deliveredAt: '02/10/2026' }
  },

  // Lista atual do protótipo (1035–1042)
  {
    number: 1035, date: '18/11/2026', customer: 'Luiz Fernando', plate: 'XYZ6L78', km: 87_330, status: 'APROVADO',
    items: [
      part('Pastilha de freio dianteira', 1, 15_000, 3_000),
      part('Fluido de freio DOT 4', 1, 4_000, 2_500),
      labor('Revisão do sistema de freios', 2),
      part('Lonas de freio traseiras', 1, 16_400, 2_500)
    ],
    workOrder: { number: 1004, status: 'ENTREGUE', deliveredAt: '18/11/2026' }
  },
  {
    number: 1036, date: '19/11/2026', customer: 'Ana Paula Costa', plate: 'TUV3K21', km: 141_050, status: 'RECUSADO',
    items: [part('Pneu 185/65 R15', 4, 20_000, 2_500), fixed('Montagem e balanceamento', 15_000)]
  },
  {
    number: 1037, date: '20/11/2026', customer: 'Marcos Vieira', plate: 'GHI8J90', km: 134_500, status: 'AGUARDANDO_APROVACAO',
    items: [
      part('Kit de embreagem Corolla', 1, 160_000, 3_000),
      labor('Troca do kit de embreagem', 8),
      part('Atuador hidráulico', 1, 40_000, 1_000)
    ],
    notes: 'Embreagem patinando em subida. Atuador com vazamento.'
  },
  {
    number: 1038, date: '21/11/2026', customer: 'Juliana Rocha', plate: 'DEF4G56', km: 37_920, status: 'APROVADO',
    items: [
      part('Óleo 5W30 (litro)', 4, 3_250, 3_000, 'LR-5W30'),
      part('Filtro de óleo', 1, 2_000, 3_000),
      part('Filtro de ar', 1, 2_800, 2_500),
      fixed('Troca de óleo e filtros', 5_990, 'Troca de óleo e filtro')
    ],
    workOrder: { number: 1005, status: 'PRONTO', key: 2, readyAt: '21/11/2026' }
  },
  {
    number: 1039, date: '21/11/2026', customer: 'Paulo Souza', plate: 'ABC1D23', km: 158_300, status: 'APROVADO',
    items: [
      part('Amortecedor dianteiro', 2, 35_000, 3_000),
      part('Kit batente e coifa dianteiro', 2, 10_000, 3_000),
      labor('Troca dos amortecedores dianteiros', 5),
      fixed('Alinhamento e balanceamento', 12_000, 'Alinhamento e balanceamento'),
      part('Bieleta', 2, 10_000, 2_500)
    ]
  },
  {
    number: 1040, date: '22/11/2026', customer: 'Fernanda Lima', plate: 'MNO7C33', km: 61_870, status: 'APROVADO',
    items: [
      part('Kit correia dentada HB20', 1, 23_800, 2_500, 'AC-KCD-HB20'),
      fixed('Troca da correia dentada', 11_500, 'Troca da correia dentada')
    ],
    workOrder: { number: 1006, status: 'EM_EXECUCAO', key: 7 }
  },
  {
    number: 1041, date: '22/11/2026', customer: 'Rodrigo Alves', plate: 'IJK5B12', km: 112_400, status: 'AGUARDANDO_APROVACAO',
    items: [
      part('Kit de embreagem', 1, 64_000, 3_500),
      labor('Troca do kit de embreagem', 3),
      part('Fluido de embreagem DOT 4', 1, 3_000, 2_000)
    ]
  },
  {
    number: 1042, date: '23/11/2026', customer: 'Carla Menezes', plate: 'QRS2D47', km: 48_210, status: 'RASCUNHO',
    items: [
      part('Pastilha de freio dianteira', 1, 12_000, 4_000, 'FF-PD-ONIX'),
      part('Disco de freio dianteiro', 2, 18_000, 3_500, 'FF-DD-ONIX'),
      labor('Substituição de pastilhas e discos', 1.5, 'Substituição de pastilhas e discos')
    ],
    notes: 'Pastilha dianteira com 2 mm e disco abaixo da espessura mínima. Cliente relatou ruído ao frear.'
  }
]

/** Serviços do dia a dia entregues nos últimos meses, para o painel ter histórico. */
const ROUTINE: { items: () => SeedItem[] }[] = [
  { items: () => [part('Óleo 5W30 (litro)', 4, 3_250, 3_000, 'LR-5W30'), part('Filtro de óleo PSL 55', 1, 1_890, 3_000, 'AC-PSL55'), fixed('Troca de óleo e filtro', 5_990, 'Troca de óleo e filtro')] },
  { items: () => [fixed('Alinhamento e balanceamento', 11_500, 'Alinhamento e balanceamento')] },
  { items: () => [part('Pastilha de freio dianteira', 1, 11_000, 4_000), labor('Troca de pastilhas', 1)] },
  { items: () => [part('Bateria 60 Ah', 1, 38_000, 3_000), fixed('Instalação da bateria', 3_000)] },
  { items: () => [part('Pneu 175/70 R14', 2, 31_000, 2_500), fixed('Montagem e balanceamento', 8_000)] },
  { items: () => [part('Amortecedor dianteiro', 2, 30_000, 3_000), labor('Troca dos amortecedores', 3)] },
  { items: () => [labor('Diagnóstico com scanner', 1)] },
  { items: () => [part('Vela de ignição', 4, 4_500, 3_500), part('Cabo de vela', 1, 9_000, 3_000), labor('Troca de velas e cabos', 1)] }
]

const PLATES = ['QRS2D47', 'IJK5B12', 'MNO7C33', 'ABC1D23', 'JKL2M45', 'DEF4G56', 'GHI8J90', 'TUV3K21', 'XYZ6L78']
const OWNER: Record<string, string> = {
  QRS2D47: 'Carla Menezes', IJK5B12: 'Rodrigo Alves', MNO7C33: 'Fernanda Lima', ABC1D23: 'Transportes Sul Ltda',
  JKL2M45: 'Transportes Sul Ltda', DEF4G56: 'Juliana Rocha', GHI8J90: 'Marcos Vieira', TUV3K21: 'Ana Paula Costa', XYZ6L78: 'Luiz Fernando'
}

/** ~2 por semana entre setembro e novembro, determinístico (mesmo resultado a cada seed). */
function routineQuotes(): SeedQuote[] {
  const quotes: SeedQuote[] = []
  let day = new Date(2026, 8, 1)
  for (let i = 0; i < 26; i++) {
    day = addDays(day, 2 + ((i * 5) % 4))
    if (day >= new Date(2026, 10, 22)) break
    const plate = PLATES[(i * 4) % PLATES.length]!
    const date = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}/${day.getFullYear()}`
    quotes.push({
      number: 2001 + i,
      date,
      customer: OWNER[plate]!,
      plate,
      km: 30_000 + i * 1_500,
      status: 'APROVADO',
      items: ROUTINE[(i * 3) % ROUTINE.length]!.items(),
      workOrder: { number: 3001 + i, status: 'ENTREGUE', deliveredAt: date }
    })
  }
  return quotes
}

const PURCHASES = [
  {
    supplier: 'Distribuidora Freio Forte', invoice: '48.221', date: '23/11/2026',
    items: [{ code: 'FF-PD-ONIX', qty: 1, cost: 12_000 }, { code: 'FF-DD-ONIX', qty: 2, cost: 18_000 }]
  },
  { supplier: 'AutoPeças Central', invoice: '10.554', date: '22/11/2026', items: [{ code: 'AC-KCD-HB20', qty: 1, cost: 23_800, workOrder: 1006 }] },
  { supplier: 'Lubrificantes RS', invoice: '3.912', date: '21/11/2026', items: [{ code: 'LR-5W30', qty: 24, cost: 3_250 }] },
  { supplier: 'AutoPeças Central', invoice: '10.540', date: '21/11/2026', items: [{ code: 'AC-PSL55', qty: 10, cost: 1_890 }] }
]

export async function seedIfEmpty(db: Db): Promise<boolean> {
  if ((await db.customer.count()) > 0) return false

  const settings = new SettingsRepository(db)
  await settings.save(DEFAULT_SETTINGS)
  await new KeyTagRepository(db).ensureCount(DEFAULT_SETTINGS.keyTagCount)

  await db.$transaction(async (tx) => {
    const customerId = new Map<string, number>()
    for (const c of CUSTOMERS) {
      const created = await tx.customer.create({ data: { type: 'PF', ...c } })
      customerId.set(c.name, created.id)
    }

    const vehicleId = new Map<string, number>()
    for (const { owner, km, ...v } of VEHICLES) {
      const created = await tx.vehicle.create({ data: { ...v, currentKm: km } })
      vehicleId.set(v.plate, created.id)
      await tx.vehicleOwnership.create({
        data: { vehicleId: created.id, customerId: customerId.get(owner)!, startedAt: at('01/01/2025') }
      })
    }

    const partId = new Map<string, number>()
    for (const p of PARTS) {
      const created = await tx.part.create({
        data: { code: p.code, name: p.name, brand: p.brand, lastCostCents: p.cost, defaultMarkupBp: p.markup }
      })
      partId.set(p.code, created.id)
    }

    const serviceId = new Map<string, number>()
    for (const s of SERVICES) {
      const created = await tx.service.create({
        data: {
          name: s.name,
          defaultHoursMilli: s.hours ? Math.round(s.hours * 1000) : null,
          fixedPriceCents: s.fixed ?? null
        }
      })
      serviceId.set(s.name, created.id)
    }

    const keyTagId = new Map((await tx.keyTag.findMany()).map((k) => [k.number, k.id]))
    const workOrderId = new Map<number, number>()

    for (const q of [...QUOTES, ...routineQuotes()]) {
      const createdAt = at(q.date, '09:30')
      const totals = calculateQuoteTotals(q.items, 0)
      const quote = await tx.quote.create({
        data: {
          number: q.number,
          customerId: customerId.get(q.customer)!,
          vehicleId: vehicleId.get(q.plate)!,
          entryKm: q.km,
          status: q.status,
          validityDays: DEFAULT_SETTINGS.validityDays,
          validUntil: addDays(createdAt, DEFAULT_SETTINGS.validityDays),
          paymentMethod: q.payment ?? 'Pix',
          hourlyRateCents: HOUR,
          warrantyDays: DEFAULT_SETTINGS.warrantyDays,
          notes: q.notes,
          totalCents: totals.totalCents,
          sentAt: q.status === 'RASCUNHO' ? null : createdAt,
          createdAt,
          items: {
            create: q.items.map((item, position) => {
              const priced = priceLine(item)
              return {
                type: item.type,
                description: item.description,
                partId: item.partCode ? partId.get(item.partCode) : undefined,
                serviceId: item.serviceName ? serviceId.get(item.serviceName) : undefined,
                quantityMilli: item.quantityMilli,
                unitCostCents: item.type === 'PECA' ? item.unitCostCents : null,
                markupBp: item.type === 'PECA' ? item.markupBp : null,
                unitPriceCents: priced.unitPriceCents,
                totalCents: priced.totalCents,
                warrantyDays: DEFAULT_SETTINGS.warrantyDays,
                position
              }
            })
          }
        },
        include: { items: true }
      })

      if (q.status === 'APROVADO') {
        await tx.quoteApproval.create({
          data: {
            quoteId: quote.id,
            approvedAt: at(q.date, '11:00'),
            channel: 'WHATSAPP',
            approvedBy: q.customer,
            snapshot: JSON.stringify({ ...quote, totals })
          }
        })
      }

      if (q.workOrder) {
        const wo = q.workOrder
        const created = await tx.workOrder.create({
          data: {
            number: wo.number,
            quoteId: quote.id,
            vehicleId: quote.vehicleId,
            status: wo.status,
            entryKm: q.km,
            keyTagId: wo.key ? keyTagId.get(wo.key) : null,
            openedAt: at(q.date, '11:30'),
            readyAt: wo.readyAt ? at(wo.readyAt, '16:00') : wo.deliveredAt ? at(wo.deliveredAt, '16:00') : null,
            deliveredAt: wo.deliveredAt ? at(wo.deliveredAt, '17:30') : null
          }
        })
        workOrderId.set(wo.number, created.id)
      }
    }

    const supplierId = new Map<string, number>()
    for (const p of PURCHASES) {
      if (!supplierId.has(p.supplier)) {
        supplierId.set(p.supplier, (await tx.supplier.create({ data: { name: p.supplier } })).id)
      }
      await tx.partPurchase.create({
        data: {
          supplierId: supplierId.get(p.supplier)!,
          invoiceNumber: p.invoice,
          purchasedAt: at(p.date, '08:30'),
          items: {
            create: p.items.map((i) => ({
              partId: partId.get(i.code)!,
              quantityMilli: i.qty * 1000,
              unitCostCents: i.cost,
              workOrderId: 'workOrder' in i && i.workOrder ? workOrderId.get(i.workOrder) : null
            }))
          }
        }
      })
    }
  })

  return true
}
