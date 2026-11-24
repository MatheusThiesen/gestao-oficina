import { join } from 'node:path'
import { app } from 'electron'

/** Caminhos do app. Tudo que depende de ambiente (dev × empacotado) passa por aqui. */
export const appPaths = {
  database: () => join(app.getPath('userData'), 'dados.db'),
  branding: () => join(app.getPath('userData'), 'marca'),
  /** No app empacotado as migrations vão em resources/migrations (extraResources do electron-builder). */
  migrations: () =>
    app.isPackaged ? join(process.resourcesPath, 'migrations') : join(app.getAppPath(), 'prisma', 'migrations'),
  /** Catálogo FIPE + logos das marcas (extraResources no instalador). */
  vehicleCatalog: () =>
    app.isPackaged ? join(process.resourcesPath, 'vehicle-catalog') : join(app.getAppPath(), 'resources', 'vehicle-catalog'),
  /** Documentos/<nome do programa> (PDFs e backups). */
  documents: (appName: string) => join(app.getPath('documents'), safeFolderName(appName))
}

function safeFolderName(name: string): string {
  const cleaned = [...name].filter((ch) => ch.charCodeAt(0) >= 32 && !'<>:"/\\|?*'.includes(ch)).join('')
  return cleaned.trim() || 'Gestão Oficina'
}
