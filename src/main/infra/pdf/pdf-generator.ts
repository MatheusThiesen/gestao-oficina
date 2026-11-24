import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { BrowserWindow } from 'electron'
import barlowRegular from '../../../renderer/src/assets/fonts/Barlow-Regular.ttf?asset'
import barlowSemiBold from '../../../renderer/src/assets/fonts/Barlow-SemiBold.ttf?asset'
import barlowCondensed from '../../../renderer/src/assets/fonts/BarlowCondensed-SemiBold.ttf?asset'
import sairaItalic from '../../../renderer/src/assets/fonts/Saira-Italic.ttf?asset'
import type { PdfFonts } from './quote-template'

let cachedFonts: PdfFonts | null = null

/** Fontes embutidas como data URL: o PDF não depende de nada instalado no computador. */
export function pdfFonts(): PdfFonts {
  const toDataUrl = (path: string) => `data:font/ttf;base64,${readFileSync(path).toString('base64')}`
  cachedFonts ??= {
    barlowRegular: toDataUrl(barlowRegular),
    barlowSemiBold: toDataUrl(barlowSemiBold),
    barlowCondensed: toDataUrl(barlowCondensed),
    sairaItalic: toDataUrl(sairaItalic)
  }
  return cachedFonts
}

/** Renderiza o HTML numa janela oculta (sem JavaScript) e grava o PDF A4 em `outputPath`. */
export async function htmlToPdf(html: string, outputPath: string): Promise<void> {
  const tempHtml = join(tmpdir(), `orcamento-${process.pid}-${Date.now()}.html`)
  writeFileSync(tempHtml, html, 'utf8')
  const win = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false }
  })
  try {
    await win.loadFile(tempHtml)
    await win.webContents.executeJavaScript('document.fonts.ready', true).catch(() => undefined)
    const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, pdf)
  } finally {
    win.destroy()
    rmSync(tempHtml, { force: true })
  }
}
