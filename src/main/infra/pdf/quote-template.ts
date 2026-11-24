import { derivePalette } from '@shared/color'
import { formatDate, formatKm, formatMoney, formatPhone, maskDocument, milliToInput, formatDocument } from '@shared/format'

/** Dados do PDF entregue ao cliente. Sem custo, markup ou lucro. */
export interface QuotePdfData {
  title: 'Orçamento' | 'Ordem de serviço'
  number: string
  issuedAt: Date
  validUntil: Date | null
  shop: { name: string; cnpj: string; address: string; whatsapp: string; logoDataUrl: string | null }
  brand: { primaryColor: string; sidebarColor: string }
  customer: { name: string; document: string | null; whatsapp: string | null }
  vehicle: { plate: string; label: string; color: string | null; entryKm: number | null }
  notes: string | null
  items: {
    type: 'PECA' | 'MAO_DE_OBRA'
    description: string
    quantityMilli: number
    unitPriceCents: number
    totalCents: number
    /** Mão de obra cobrada por hora: mostra "1,5 h". */
    perHour: boolean
  }[]
  totals: { partsCents: number; laborCents: number; discountCents: number; totalCents: number }
  paymentMethod: string | null
  expectedDeliveryAt: Date | null
  warrantyDays: number
  validityDays: number
}

export interface PdfFonts {
  barlowRegular: string
  barlowSemiBold: string
  barlowCondensed: string
  sairaItalic: string
}

const esc = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** HTML A4 do orçamento (baseado em referencias/modelo-orcamento-pdf.html), com fontes embutidas. */
export function renderQuoteHtml(d: QuotePdfData, fonts: PdfFonts): string {
  const palette = derivePalette(d.brand.primaryColor, d.brand.sidebarColor)
  const parts = d.items.filter((i) => i.type === 'PECA')
  const labor = d.items.filter((i) => i.type === 'MAO_DE_OBRA')
  const shopLines = [
    [d.shop.cnpj && `CNPJ ${formatDocument(d.shop.cnpj)}`, d.shop.address && esc(d.shop.address)].filter(Boolean).join(' · '),
    d.shop.whatsapp && `WhatsApp ${formatPhone(d.shop.whatsapp)}`
  ].filter(Boolean)
  const customerLine = [d.customer.document && docLabel(d.customer.document), d.customer.whatsapp && formatPhone(d.customer.whatsapp)]
    .filter(Boolean)
    .join(' · ')
  const vehicleLine = [d.vehicle.label, d.vehicle.color?.toLowerCase()].filter(Boolean).join(', ')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(d.title)} ${esc(d.number)} — ${esc(d.shop.name)}</title>
<style>
  @font-face { font-family: Barlow; src: url(${fonts.barlowRegular}); font-weight: 400; }
  @font-face { font-family: Barlow; src: url(${fonts.barlowSemiBold}); font-weight: 600; }
  @font-face { font-family: "Barlow Condensed"; src: url(${fonts.barlowCondensed}); font-weight: 600; }
  @font-face { font-family: Saira; src: url(${fonts.sairaItalic}); font-style: italic; font-weight: 100 900; }

  @page { size: A4; margin: 16mm 16mm 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Barlow, Arial, sans-serif; font-size: 10.5pt; line-height: 1.4; color: #131416; }
  .muted { color: #555b62; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

  header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 10px; border-bottom: 3px solid ${palette.brand}; }
  .shop { display: flex; align-items: center; gap: 14px; }
  .shop img { width: 74px; max-height: 74px; object-fit: contain; }
  .shop .name { font-family: Saira, sans-serif; font-style: italic; font-weight: 800; font-size: 17pt; line-height: 1; text-transform: uppercase; }
  .shop .det { font-size: 8.5pt; color: #555b62; margin-top: 4px; line-height: 1.35; }
  .doc { text-align: right; flex: none; }
  .doc h1 { margin: 0; font-family: Saira, sans-serif; font-style: italic; font-weight: 800; font-size: 22pt; line-height: 1; text-transform: uppercase; }
  .doc .n { font-family: "Barlow Condensed", sans-serif; font-weight: 600; font-size: 14pt; color: ${palette.brandText}; }
  .doc .dates { font-size: 8.5pt; color: #555b62; margin-top: 2px; }

  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 14px 0; font-size: 10pt; }
  .info h3 { font-size: 9pt; font-weight: 600; margin: 0 0 3px; color: #555b62; }
  .veh { display: flex; gap: 10px; align-items: center; }

  .plate { display: inline-flex; flex-direction: column; border: 1.5px solid #131416; border-radius: 3px; overflow: hidden; width: 82px; flex: none; }
  .plate .band { background: #1b3f94; color: #fff; font-family: Arial, sans-serif; font-weight: 700; font-size: 4.5pt; letter-spacing: .25em; text-align: center; padding: 1pt 0 .5pt; }
  .plate .p { font-family: "Barlow Condensed", sans-serif; font-weight: 600; font-size: 13pt; letter-spacing: .06em; text-align: center; line-height: 1.2; }

  p.obs { margin: 0 0 14px; font-size: 10pt; white-space: pre-line; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th { font-size: 9pt; font-weight: 600; text-align: left; padding: 5px 6px; border-bottom: 1px solid #131416; }
  td { padding: 6px; border-bottom: 1px solid #d6d8db; }
  tr { break-inside: avoid; }
  tr.group td { border-bottom: 0; padding-top: 12px; font-weight: 600; }

  .totals { margin-left: auto; width: 240px; margin-top: 8px; font-size: 10pt; break-inside: avoid; }
  .totals div { display: flex; justify-content: space-between; padding: 2px 6px; }
  .totals .t { border-top: 1px solid #131416; margin-top: 4px; padding-top: 6px; font-size: 13pt; font-weight: 600; }

  .cond { margin-top: 18px; font-size: 9.5pt; }
  .cond div { margin-bottom: 2px; }

  .sign { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; margin-top: 44px; font-size: 9pt; color: #555b62; break-inside: avoid; }
  .sign div { border-top: 1px solid #131416; padding-top: 3px; }

  .legal { margin-top: 18px; font-size: 8pt; color: #555b62; }
</style>
</head>
<body>

<header>
  <div class="shop">
    ${d.shop.logoDataUrl ? `<img src="${d.shop.logoDataUrl}" alt="">` : ''}
    <div>
      <div class="name">${esc(d.shop.name)}</div>
      ${shopLines.length ? `<div class="det">${shopLines.join('<br>')}</div>` : ''}
    </div>
  </div>
  <div class="doc">
    <h1>${esc(d.title)}</h1>
    <div class="n">Nº ${esc(d.number)}</div>
    <div class="dates">Emitido em ${formatDate(d.issuedAt)}${d.validUntil ? `<br>Válido até ${formatDate(d.validUntil)}` : ''}</div>
  </div>
</header>

<section class="info">
  <div>
    <h3>Cliente</h3>
    ${esc(d.customer.name)}
    ${customerLine ? `<br><span class="muted">${esc(customerLine)}</span>` : ''}
  </div>
  <div>
    <h3>Veículo</h3>
    <div class="veh">
      <div class="plate"><span class="band">BRASIL</span><span class="p">${esc(d.vehicle.plate)}</span></div>
      <div>${esc(vehicleLine)}${d.vehicle.entryKm != null ? `<br><span class="muted">${formatKm(d.vehicle.entryKm)} km na entrada</span>` : ''}</div>
    </div>
  </div>
</section>

${d.notes ? `<p class="obs"><b>Diagnóstico:</b> ${esc(d.notes)}</p>` : ''}

<table>
  <thead>
    <tr><th>Descrição</th><th class="num" style="width:60px">Qtd</th><th class="num" style="width:100px">Valor un.</th><th class="num" style="width:100px">Total</th></tr>
  </thead>
  <tbody>
    ${group('Peças', parts)}
    ${group('Mão de obra', labor)}
  </tbody>
</table>

<div class="totals">
  ${parts.length ? `<div><span>Peças</span><span class="num">${formatMoney(d.totals.partsCents)}</span></div>` : ''}
  ${labor.length ? `<div><span>Mão de obra</span><span class="num">${formatMoney(d.totals.laborCents)}</span></div>` : ''}
  ${d.totals.discountCents > 0 ? `<div><span>Desconto</span><span class="num">− ${formatMoney(d.totals.discountCents)}</span></div>` : ''}
  <div class="t"><span>Total</span><span class="num">${formatMoney(d.totals.totalCents)}</span></div>
</div>

<div class="cond">
  ${d.paymentMethod ? `<div><b>Pagamento:</b> ${esc(d.paymentMethod)}</div>` : ''}
  ${d.expectedDeliveryAt ? `<div><b>Previsão de entrega:</b> ${deliveryText(d.expectedDeliveryAt)}, após aprovação</div>` : ''}
  ${d.warrantyDays > 0 ? `<div><b>Garantia:</b> ${d.warrantyDays} dias para peças e serviço, a partir da entrega</div>` : ''}
</div>

<div class="sign">
  <div>Assinatura do cliente</div>
  <div>Data</div>
</div>

<p class="legal">Orçamento prévio conforme art. 40 do CDC, válido por ${d.validityDays} dias. O serviço só é executado após aprovação. Serviços adicionais exigem novo orçamento.</p>

</body>
</html>`
}

function group(label: string, items: QuotePdfData['items']): string {
  if (items.length === 0) return ''
  const rows = items
    .map(
      (i) =>
        `<tr><td>${esc(i.description)}</td><td class="num">${milliToInput(i.quantityMilli)}${i.perHour ? ' h' : ''}</td>` +
        `<td class="num">${formatMoney(i.unitPriceCents)}</td><td class="num">${formatMoney(i.totalCents)}</td></tr>`
    )
    .join('\n    ')
  return `<tr class="group"><td colspan="4">${label}</td></tr>\n    ${rows}`
}

function docLabel(document: string): string {
  const digits = document.replace(/\D/g, '')
  return `${digits.length === 14 ? 'CNPJ' : 'CPF'} ${maskDocument(digits)}`
}

/** "24/11/2026, 17h" ou "24/11/2026, 17h30". */
function deliveryText(at: Date): string {
  const minutes = at.getMinutes()
  return `${formatDate(at)}, ${at.getHours()}h${minutes ? String(minutes).padStart(2, '0') : ''}`
}
