import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/updates'

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000

/**
 * Atualização automática pelas Releases do GitHub (configuradas em electron-builder.yml → publish).
 * Baixa em segundo plano e instala ao reiniciar ou ao fechar o programa.
 */
export class UpdateService {
  private status: UpdateStatus
  private timer: NodeJS.Timeout | null = null

  constructor() {
    this.status = { state: app.isPackaged ? 'idle' : 'disabled', currentVersion: app.getVersion() }
    if (!app.isPackaged) return

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = console

    autoUpdater.on('checking-for-update', () => this.set({ state: 'checking' }))
    autoUpdater.on('update-not-available', () =>
      this.set({ state: 'up-to-date', checkedAt: new Date().toISOString() })
    )
    autoUpdater.on('update-available', (info) =>
      this.set({ state: 'downloading', version: info.version, percent: 0, checkedAt: new Date().toISOString() })
    )
    autoUpdater.on('download-progress', (p) => this.set({ state: 'downloading', percent: Math.round(p.percent) }))
    autoUpdater.on('update-downloaded', (info) => this.set({ state: 'ready', version: info.version, percent: 100 }))
    autoUpdater.on('error', (error) =>
      this.set({ state: 'error', error: friendlyError(error), checkedAt: new Date().toISOString() })
    )
  }

  get current(): UpdateStatus {
    return this.status
  }

  /** Primeira verificação logo após abrir e depois periodicamente. */
  start(): void {
    if (!app.isPackaged) return
    setTimeout(() => void this.check(), 10_000)
    this.timer = setInterval(() => void this.check(), CHECK_EVERY_MS)
  }

  async check(): Promise<UpdateStatus> {
    if (!app.isPackaged || this.status.state === 'downloading' || this.status.state === 'ready') return this.status
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.set({ state: 'error', error: friendlyError(error) })
    }
    return this.status
  }

  install(): void {
    if (this.status.state !== 'ready') return
    if (this.timer) clearInterval(this.timer)
    autoUpdater.quitAndInstall(false, true)
  }

  private set(patch: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...patch }
    if (patch.state && patch.state !== 'error') delete this.status.error
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('updates:status', this.status)
  }
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::/i.test(message)) return 'Sem conexão com a internet.'
  if (/404/.test(message)) return 'Nenhuma versão publicada encontrada.'
  return 'Não foi possível verificar atualizações.'
}
