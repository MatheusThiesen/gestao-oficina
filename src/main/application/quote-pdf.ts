import { join } from 'node:path'
import type { AppSettings } from '@shared/settings'
import { vehicleLabel } from '@shared/registry'
import type { LogoStore } from '../infra/logo-store'
import { appPaths } from '../infra/paths'
import { htmlToPdf, pdfFonts } from '../infra/pdf/pdf-generator'
import { renderQuoteHtml, type QuotePdfData } from '../infra/pdf/quote-template'
import type { QuoteFull, QuoteRepository } from '../infra/repositories/quote-repository'
import type { SettingsRepository } from '../infra/repositories/settings-repository'
import { NotFoundError } from './errors'
import { toView } from './quotes'

export interface QuotePdfDeps {
  quotes: QuoteRepository
  settings: SettingsRepository
  logos: LogoStore
}

/** Gera o PDF do orçamento em Documentos/<programa>/Orçamentos e devolve o caminho. */
export async function generateQuotePdf(deps: QuotePdfDeps, quoteId: number): Promise<{ path: string }> {
  const quote = await deps.quotes.findFull(quoteId)
  if (!quote) throw new NotFoundError('Orçamento')
  const settings = await deps.settings.get()

  const data = toPdfData(quote, settings, deps.logos.readDataUrl(settings.branding.logoFile))
  const path = join(appPaths.documents(settings.branding.appName), 'Orçamentos', pdfFileName(quote))
  await htmlToPdf(renderQuoteHtml(data, pdfFonts()), path)
  return { path }
}

export function pdfFolder(settings: AppSettings): string {
  return join(appPaths.documents(settings.branding.appName), 'Orçamentos')
}

function pdfFileName(q: QuoteFull): string {
  return `Orcamento-${q.number}${q.version > 1 ? `-v${q.version}` : ''}-${q.vehicle.plate}.pdf`
}

/** Só o que o cliente pode ver: preço e total. Custo, markup e lucro não entram. */
function toPdfData(q: QuoteFull, s: AppSettings, logoDataUrl: string | null): QuotePdfData {
  const view = toView(q)
  return {
    title: 'Orçamento',
    number: q.version > 1 ? `${q.number} v${q.version}` : String(q.number),
    issuedAt: q.sentAt ?? q.createdAt,
    validUntil: q.status === 'APROVADO' ? null : q.validUntil,
    shop: { name: s.shop.name || s.branding.appName, cnpj: s.shop.cnpj, address: s.shop.address, whatsapp: s.shop.whatsapp, logoDataUrl },
    brand: { primaryColor: s.branding.primaryColor, sidebarColor: s.branding.sidebarColor },
    customer: { name: q.customer.name, document: q.customer.document, whatsapp: q.customer.whatsapp },
    vehicle: { plate: q.vehicle.plate, label: vehicleLabel(q.vehicle), color: q.vehicle.color, entryKm: q.entryKm },
    notes: q.notes,
    items: view.items.map((i) => ({
      type: i.type,
      description: i.description,
      quantityMilli: i.quantityMilli,
      unitPriceCents: i.unitPriceCents,
      totalCents: i.totalCents,
      // Mão de obra pelo valor da hora mostra "1,5 h"; preço fixo de serviço mostra só a quantidade.
      perHour: i.type === 'MAO_DE_OBRA' && i.unitPriceCents === q.hourlyRateCents
    })),
    totals: {
      partsCents: view.totals.partsCents,
      laborCents: view.totals.laborCents,
      discountCents: view.totals.discountCents,
      totalCents: view.totals.totalCents
    },
    paymentMethod: q.paymentMethod,
    expectedDeliveryAt: q.expectedDeliveryAt,
    warrantyDays: q.warrantyDays,
    validityDays: q.validityDays
  }
}
