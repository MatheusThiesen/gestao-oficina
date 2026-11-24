import { derivePalette } from '@shared/color'

const SIZE = 256

/**
 * Gera o ícone do aplicativo (PNG 256×256): a logo centralizada com fundo transparente
 * ou, sem logo, as iniciais do nome num quadrado arredondado na cor principal.
 */
export async function renderAppIcon(opts: {
  appName: string
  logoDataUrl: string | null
  primaryColor: string
}): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível.')

  if (opts.logoDataUrl) await drawLogo(ctx, opts.logoDataUrl)
  else await drawInitials(ctx, opts.appName, opts.primaryColor)
  return canvas.toDataURL('image/png')
}

async function drawLogo(ctx: CanvasRenderingContext2D, dataUrl: string): Promise<void> {
  const img = await loadImage(dataUrl)
  const w = img.naturalWidth || SIZE
  const h = img.naturalHeight || SIZE
  const scale = Math.min((SIZE - 8) / w, (SIZE - 8) / h)
  const dw = w * scale
  const dh = h * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh)
}

async function drawInitials(ctx: CanvasRenderingContext2D, appName: string, primary: string): Promise<void> {
  const palette = derivePalette(primary, '#1f2124')
  ctx.fillStyle = primary
  ctx.beginPath()
  ctx.roundRect(8, 8, SIZE - 16, SIZE - 16, 48)
  ctx.fill()

  const font = 'italic 800 112px Saira'
  await document.fonts.load(font).catch(() => undefined)
  ctx.font = font
  ctx.fillStyle = palette.brandForeground
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials(appName), SIZE / 2, SIZE / 2 + 6)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível ler a imagem da logo.'))
    img.src = src
  })
}

const CONNECTORS = new Set(['da', 'das', 'de', 'do', 'dos', 'e', '&'])

/** "Oficina do Zé" → "OZ"; "Garagem" → "GA". Ignora conectivos. */
export function initials(name: string): string {
  const all = name.trim().split(/\s+/).filter(Boolean)
  const words = all.filter((w) => !CONNECTORS.has(w.toLowerCase()))
  if (words.length === 0) words.push(...all)
  const letters = words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}
