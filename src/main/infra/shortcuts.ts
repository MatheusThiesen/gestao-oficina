import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { app, shell } from 'electron'

export const APP_USER_MODEL_ID = 'br.com.gestaooficina.app'

/** Pastas onde o instalador (NSIS, por usuário) cria atalhos. */
function shortcutDirs(): string[] {
  return [app.getPath('desktop'), join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')]
}

function fileName(name: string): string {
  return [...name].filter((ch) => ch.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(ch)).join('').trim() + '.lnk'
}

/**
 * Recria os atalhos do Windows com o nome e o ícone da marca, apagando os de nome antigo.
 * Só no app instalado no Windows; em outros casos não faz nada.
 */
export function updateWindowsShortcuts(appName: string, previousName: string, icoPath: string): boolean {
  if (process.platform !== 'win32' || !app.isPackaged) return false

  for (const dir of shortcutDirs()) {
    if (!existsSync(dir)) continue
    const oldPath = join(dir, fileName(previousName))
    const newPath = join(dir, fileName(appName))
    // Só mexe onde já existia atalho (respeita quem apagou o da Área de Trabalho).
    const hadShortcut = existsSync(oldPath) || existsSync(newPath)
    if (!hadShortcut) continue
    if (oldPath !== newPath && existsSync(oldPath)) rmSync(oldPath)
    shell.writeShortcutLink(newPath, existsSync(newPath) ? 'replace' : 'create', {
      target: process.execPath,
      icon: icoPath,
      iconIndex: 0,
      appUserModelId: APP_USER_MODEL_ID,
      description: appName
    })
  }
  return true
}
