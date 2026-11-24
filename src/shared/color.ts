/**
 * Paleta da marca derivada de duas cores escolhidas pelo usuário (principal e menu).
 * Funções puras: usadas pela tela (variáveis CSS) e pelo PDF.
 */

export interface Hsl {
  h: number
  s: number
  l: number
}

const HEX = /^#([0-9a-f]{6})$/i

export function isHexColor(value: string): boolean {
  return HEX.test(value)
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = HEX.exec(hex)
  if (!m) throw new RangeError(`Cor inválida: ${hex}`)
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s: s * 100, l: l * 100 }
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = clamp(s, 0, 100) / 100
  const lig = clamp(l, 0, 100) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}

/** Luminância relativa (WCAG). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const INK = '#17191c'
const WHITE = '#ffffff'

function adjust(hex: string, dl: number): string {
  const hsl = hexToHsl(hex)
  return hslToHex({ ...hsl, l: hsl.l + dl })
}

/** Escurece até atingir o contraste pedido contra `background`. */
function ensureContrast(hex: string, background: string, ratio: number, direction: -1 | 1): string {
  let color = hex
  for (let i = 0; i < 20 && contrastRatio(color, background) < ratio; i++) color = adjust(color, 4 * direction)
  return color
}

export interface BrandPalette {
  brand: string
  brandHover: string
  /** Links e textos de destaque sobre fundo branco. */
  brandText: string
  /** Texto sobre o botão principal. */
  brandForeground: string
  /** Ícone ativo sobre o menu. */
  brandOnSide: string
  side: string
  sideHover: string
  sideBorder: string
  sideText: string
  sideMuted: string
  /** Texto do item ativo/hover no menu. */
  sideStrong: string
}

export function derivePalette(primary: string, sidebar: string): BrandPalette {
  const darkSide = luminance(sidebar) < 0.3
  const sideStep = darkSide ? 1 : -1
  return {
    brand: primary,
    brandHover: adjust(primary, -7),
    brandText: ensureContrast(primary, WHITE, 4.5, -1),
    brandForeground: contrastRatio(WHITE, primary) >= 3 ? WHITE : INK,
    brandOnSide: ensureContrast(primary, sidebar, 3, darkSide ? 1 : -1),
    side: sidebar,
    sideHover: adjust(sidebar, 5 * sideStep),
    sideBorder: adjust(sidebar, 8 * sideStep),
    sideText: darkSide ? '#c9cdd2' : '#3d4247',
    sideMuted: darkSide ? '#8d939a' : '#6b7178',
    sideStrong: darkSide ? WHITE : INK
  }
}

export const COLOR_PRESETS: { name: string; primary: string; sidebar: string }[] = [
  { name: 'Vermelho', primary: '#c8121a', sidebar: '#1f2124' },
  { name: 'Azul', primary: '#1d5bd8', sidebar: '#16202e' },
  { name: 'Verde', primary: '#16803c', sidebar: '#18221c' },
  { name: 'Laranja', primary: '#e0620b', sidebar: '#211d1a' },
  { name: 'Amarelo', primary: '#f2b705', sidebar: '#1c1c1c' },
  { name: 'Roxo', primary: '#6d3fc0', sidebar: '#1e1a29' }
]

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
