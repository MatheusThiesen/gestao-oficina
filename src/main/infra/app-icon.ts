import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, nativeImage, type NativeImage } from 'electron'
import { buildIco } from './ico'

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

/** Ícone do aplicativo gerado a partir da marca: icon.png (janela/Dock) e icon.ico (atalhos do Windows). */
export class AppIconStore {
  constructor(private readonly dir: string) {}

  get pngPath(): string {
    return join(this.dir, 'icon.png')
  }

  get icoPath(): string {
    return join(this.dir, 'icon.ico')
  }

  save(pngDataUrl: string): NativeImage {
    const image = nativeImage.createFromDataURL(pngDataUrl)
    if (image.isEmpty() || !pngDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('Ícone inválido.')
    }
    mkdirSync(this.dir, { recursive: true })
    writeFileSync(this.pngPath, image.toPNG())
    const ico = buildIco(
      ICO_SIZES.map((size) => ({ size, png: image.resize({ width: size, height: size, quality: 'best' }).toPNG() }))
    )
    writeFileSync(this.icoPath, ico)
    return image
  }

  load(): NativeImage | null {
    if (!existsSync(this.pngPath)) return null
    const image = nativeImage.createFromPath(this.pngPath)
    return image.isEmpty() ? null : image
  }
}

/** Troca o ícone das janelas abertas (barra de tarefas no Windows) e do Dock no Mac. */
export function applyAppIcon(image: NativeImage | null): void {
  if (!image) return
  for (const win of BrowserWindow.getAllWindows()) win.setIcon(image)
  if (process.platform === 'darwin') app.dock?.setIcon(image)
}
