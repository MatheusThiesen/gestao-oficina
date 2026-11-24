const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const integer = new Intl.NumberFormat('pt-BR')
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatMoney = (cents: number): string => brl.format(cents / 100)
export const formatKm = (km: number): string => integer.format(km)
export const formatDate = (value: Date | string): string => date.format(new Date(value))
/** Número de documento com 4 dígitos, como no protótipo (OS 0987). */
export const formatDocNumber = (n: number): string => String(n).padStart(4, '0')
export const formatKeyTag = (n: number): string => String(n).padStart(2, '0')

/** (51) 99876-5432 ou (51) 3344-9080. Deixa como veio se não tiver 10/11 dígitos. */
export function formatPhone(value: string | null | undefined): string {
  const d = (value ?? '').replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return value ?? ''
}

/** CPF 000.000.000-00 ou CNPJ 00.000.000/0000-00. */
export function formatDocument(value: string | null | undefined): string {
  const d = (value ?? '').replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return value ?? ''
}

/** Documento parcialmente oculto para listas (***.482.910-**). */
export function maskDocument(value: string | null | undefined): string {
  const d = (value ?? '').replace(/\D/g, '')
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
  if (d.length === 14) return `${d.slice(0, 2)}.***.***/${d.slice(8, 12)}-${d.slice(12)}`
  return ''
}

/** "48.210" → 48210; vazio → null. */
export function parseInteger(value: string): number | null {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) : null
}

/**
 * Converte texto pt-BR em inteiro na escala pedida, sem ponto flutuante.
 * parseScaled('1.234,5', 2) → 123450 (centavos); parseScaled('1,5', 3) → 1500 (milésimos).
 * Devolve null se não for número.
 */
export function parseScaled(value: string, decimals: number): number | null {
  const clean = value.trim().replace(/\s|R\$|%/g, '')
  if (!clean) return null
  const match = /^(-?)([\d.]*)(?:,(\d*))?$/.exec(clean)
  if (!match) return null
  const [, sign, intPart = '', fracPart = ''] = match
  const intDigits = intPart.replace(/\./g, '')
  if (!intDigits && !fracPart) return null
  const frac = (fracPart + '0'.repeat(decimals)).slice(0, decimals)
  const roundUp = Number(fracPart[decimals] ?? '0') >= 5 ? 1 : 0
  const n = Number(intDigits || '0') * 10 ** decimals + Number(frac || '0') + roundUp
  return sign ? -n : n
}

const decimalFormat = (min: number, max: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })
const money2 = decimalFormat(2, 2)
const upTo3 = decimalFormat(0, 3)
const upTo2 = decimalFormat(0, 2)

/** 12000 → "120,00" (para campos de valor, sem "R$"). */
export const centsToInput = (cents: number): string => money2.format(cents / 100)
/** 1500 → "1,5" */
export const milliToInput = (milli: number): string => upTo3.format(milli / 1000)
/** 4000 → "40"; 3750 → "37,5" */
export const bpToInput = (bp: number): string => upTo2.format(bp / 100)

const compact = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** Eixos e indicadores: "R$ 950", "R$ 1,2 mil", "R$ 2,4 mi". */
export function formatMoneyCompact(cents: number): string {
  const value = cents / 100
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${compact.format(value / 1_000_000)} mi`
  if (abs >= 1_000) return `R$ ${compact.format(value / 1_000)} mil`
  return `R$ ${compact.format(Math.round(value))}`
}

/** Percentual com uma casa: 0.2345 → "23,5%". */
export function formatPercent(ratio: number): string {
  return `${compact.format(ratio * 100)}%`
}
