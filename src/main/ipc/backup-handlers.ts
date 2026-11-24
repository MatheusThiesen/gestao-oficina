import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { formatDate } from '@shared/format'
import type { AppSettings } from '@shared/settings'
import { BACKUP_EXTENSION } from '../domain/backup/backup-rules'
import type { Container } from '../container'
import { appPaths } from '../infra/paths'
import { updateWindowsShortcuts } from '../infra/shortcuts'
import { handle } from './register'

const FILTERS = [{ name: 'Backup do programa', extensions: [BACKUP_EXTENSION] }]

function parentWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

/** Backup e importação. As janelas de arquivo e a confirmação são nativas (processo principal). */
export function registerBackupHandlers(c: Container): void {
  handle('backup:status', () => c.backups.status())
  handle('backup:create', () => c.backups.create())

  handle('backup:saveAs', async () => {
    const win = parentWindow()
    const options = {
      title: 'Salvar cópia do backup',
      defaultPath: join(app.getPath('desktop'), await c.backups.defaultFileName()),
      filters: FILTERS
    }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    return c.backups.create(result.filePath)
  })

  handle('backup:openFolder', async () => {
    const folder = await c.backups.folder()
    mkdirSync(folder, { recursive: true })
    await shell.openPath(folder)
  })

  handle('backup:restore', async () => {
    const win = parentWindow()
    const pick = {
      title: 'Importar backup',
      properties: ['openFile' as const],
      filters: FILTERS
    }
    const picked = win ? await dialog.showOpenDialog(win, pick) : await dialog.showOpenDialog(pick)
    const path = picked.filePaths[0]
    if (picked.canceled || !path) return { status: 'cancelled' as const }

    const info = c.backups.inspect(path)
    const confirm = {
      type: 'warning' as const,
      buttons: ['Importar e reiniciar', 'Cancelar'],
      defaultId: 1,
      cancelId: 1,
      title: 'Importar backup',
      message: `Importar o backup de "${info.appName || 'oficina'}"?`,
      detail:
        `Feito em ${formatDate(info.createdAt)} às ${new Date(info.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` +
        ` (versão ${info.appVersion}), com ${info.customers} clientes e ${info.quotes} orçamentos.\n\n` +
        'Os dados deste computador serão substituídos pelos do backup. Uma cópia dos dados atuais fica guardada.\n' +
        'O programa vai reiniciar. Se o backup tiver senha, ela continua valendo.'
    }
    const answer = win ? await dialog.showMessageBox(win, confirm) : await dialog.showMessageBox(confirm)
    if (answer.response !== 0) return { status: 'cancelled' as const }

    const localShortcut = (await c.settings.get()).branding.shortcutName
    await c.backups.restore(path)
    syncShortcuts(localShortcut)

    // Responde à tela antes de reiniciar.
    setTimeout(() => {
      app.relaunch()
      app.exit(0)
    }, 300)
    return { status: 'restarting' as const }
  })
}

/** No Windows, os atalhos passam a ter o nome e o ícone da oficina importada. */
function syncShortcuts(previousName: string): void {
  try {
    const db = new Database(appPaths.database(), { readonly: true })
    const row = db.prepare("SELECT value FROM Setting WHERE key = 'app'").get() as { value: string } | undefined
    db.close()
    if (!row) return
    const imported = JSON.parse(row.value) as Partial<AppSettings>
    const name = imported.branding?.appName
    if (name) updateWindowsShortcuts(name, previousName, join(appPaths.branding(), 'icon.ico'))
  } catch (error) {
    console.warn('[backup] atalhos não atualizados', error)
  }
}
