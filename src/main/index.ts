import { join } from 'node:path'
import { app, BrowserWindow, dialog, shell, type NativeImage } from 'electron'
import { DEFAULT_APP_NAME } from '@shared/settings'
import { createContainer } from './container'
import { applyAppIcon } from './infra/app-icon'
import { closeDatabase } from './infra/database'
import { installFileLog } from './infra/file-log'
import { APP_USER_MODEL_ID } from './infra/shortcuts'
import { registerIpcHandlers } from './ipc'

const isDev = !app.isPackaged

/** Ícone padrão do produto até a configuração inicial gerar o da marca. */
const DEFAULT_ICON = join(__dirname, '../../build/icon.png')

function createMainWindow(icon: NativeImage | string = DEFAULT_ICON): BrowserWindow {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: DEFAULT_APP_NAME,
    backgroundColor: '#f3f4f5',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  // Links externos abrem no navegador; a janela do app nunca navega para fora.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault()
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  return win
}

// GESTAO_USER_DATA: pasta de dados alternativa (gravação das demonstrações e testes), só fora do instalador.
const altUserData = process.env['GESTAO_USER_DATA']
if (altUserData && !app.isPackaged) app.setPath('userData', altUserData)

installFileLog()
process.on('uncaughtException', (error) => console.error('[uncaught]', error))
process.on('unhandledRejection', (error) => console.error('[unhandled]', error))

app.whenReady().then(async () => {
  console.info(`[startup] versão ${app.getVersion()}, empacotado: ${app.isPackaged}`)
  app.setAppUserModelId(APP_USER_MODEL_ID)
  let appName = DEFAULT_APP_NAME
  let icon: NativeImage | null = null
  try {
    const container = await createContainer()
    appName = (await container.settings.get()).branding.appName
    icon = container.icons.load()
    container.updates.start()
    registerIpcHandlers(container, (name) => {
      appName = name
      icon = container.icons.load()
      for (const w of BrowserWindow.getAllWindows()) w.setTitle(name)
    })
  } catch (error) {
    console.error('[startup]', error)
    dialog.showErrorBox(
      'Não foi possível abrir o banco de dados',
      `${error instanceof Error ? error.message : String(error)}\n\nO app será fechado. Restaure um backup ou chame o suporte.`
    )
    app.exit(1)
    return
  }
  createMainWindow(icon ?? DEFAULT_ICON).setTitle(appName)
  applyAppIcon(icon)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(icon ?? DEFAULT_ICON)
  })
})

app.on('will-quit', () => {
  void closeDatabase()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
