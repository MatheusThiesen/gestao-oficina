import { describe, expect, it } from 'vitest'
import { renderQuoteHtml, type QuotePdfData } from './quote-template'

const fonts = { barlowRegular: 'a', barlowSemiBold: 'b', barlowCondensed: 'c', sairaItalic: 'd' }

const data: QuotePdfData = {
  title: 'Orçamento',
  number: '1042',
  issuedAt: new Date(2026, 10, 23),
  validUntil: new Date(2026, 11, 3),
  shop: { name: 'Oficina <Teste>', cnpj: '12100120000140', address: '', whatsapp: '51999990000', logoDataUrl: null },
  brand: { primaryColor: '#c8121a', sidebarColor: '#1f2124' },
  customer: { name: 'Carla Menezes', document: '43148291093', whatsapp: '51998765432' },
  vehicle: { plate: 'QRS2D47', label: 'Chevrolet Onix 1.0 2019', color: 'Prata', entryKm: 48_210 },
  notes: 'Cliente relatou ruído.',
  items: [
    { type: 'PECA', description: 'Pastilha', quantityMilli: 1000, unitPriceCents: 16_800, totalCents: 16_800, perHour: false },
    { type: 'MAO_DE_OBRA', description: 'Substituição', quantityMilli: 1500, unitPriceCents: 12_000, totalCents: 18_000, perHour: true }
  ],
  totals: { partsCents: 16_800, laborCents: 18_000, discountCents: 0, totalCents: 34_800 },
  paymentMethod: 'Pix',
  expectedDeliveryAt: new Date(2026, 10, 24, 17, 0),
  warrantyDays: 90,
  validityDays: 10
}

describe('PDF do orçamento', () => {
  const html = renderQuoteHtml(data, fonts)

  it('traz dados do cliente, veículo, itens e total', () => {
    expect(html).toContain('Nº 1042')
    expect(html).toContain('Válido até 03/12/2026')
    expect(html).toContain('CPF ***.482.910-**')
    expect(html).toContain('48.210 km na entrada')
    expect(html).toContain('1,5 h')
    expect(html).toMatch(/R\$\s348,00/)
    expect(html).toContain('24/11/2026, 17h, após aprovação')
  })

  it('escapa texto digitado pelo usuário', () => {
    expect(html).toContain('Oficina &lt;Teste&gt;')
    expect(html).not.toContain('Oficina <Teste>')
  })

  it('usa a cor da marca e omite desconto zerado', () => {
    expect(html).toContain('border-bottom: 3px solid #c8121a')
    expect(html).not.toContain('Desconto')
  })

  it('deixa claro quando o serviço não tem garantia', () => {
    const sem = renderQuoteHtml({ ...data, warrantyDays: 0 }, fonts)
    expect(sem).toContain('não inclusa neste serviço')
    expect(sem).not.toContain('dias para peças e serviço')
  })
})
