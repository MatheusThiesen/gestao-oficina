import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
}
const EXT_BY_MIME: Record<string, string> = Object.fromEntries(Object.entries(MIME_BY_EXT).map(([e, m]) => [m, e]))

export const MAX_LOGO_BYTES = 2 * 1024 * 1024

export class LogoError extends Error {}

/** Guarda a logo da empresa como arquivo na pasta de dados do app. */
export class LogoStore {
  constructor(private readonly dir: string) {}

  /** Decodifica um data URL (png, jpg, webp ou svg) e grava como logo.<ext>. Devolve o nome do arquivo. */
  save(dataUrl: string): string {
    const match = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([a-z0-9+/=]+)$/i.exec(dataUrl)
    if (!match) throw new LogoError('Use uma imagem PNG, JPG, WEBP ou SVG.')
    const mime = match[1]!.toLowerCase()
    const bytes = Buffer.from(match[2]!, 'base64')
    if (bytes.length > MAX_LOGO_BYTES) throw new LogoError('A logo deve ter no máximo 2 MB.')

    this.remove()
    mkdirSync(this.dir, { recursive: true })
    const file = `logo${EXT_BY_MIME[mime]}`
    writeFileSync(join(this.dir, file), bytes)
    return file
  }

  remove(): void {
    if (!existsSync(this.dir)) return
    for (const f of readdirSync(this.dir)) if (f.startsWith('logo.')) rmSync(join(this.dir, f))
  }

  /** Logo como data URL para a tela e o PDF; null se não houver. */
  readDataUrl(file: string | null): string | null {
    if (!file) return null
    const path = join(this.dir, file)
    const mime = MIME_BY_EXT[extname(file).toLowerCase()]
    if (!mime || !existsSync(path)) return null
    return `data:${mime};base64,${readFileSync(path).toString('base64')}`
  }
}
