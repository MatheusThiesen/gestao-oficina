import { app } from 'electron'
import { expireOverdueQuotes } from './application/list-documents'
import { initDatabase, type Db } from './infra/database'
import { AppIconStore } from './infra/app-icon'
import { LogoStore } from './infra/logo-store'
import { UpdateService } from './infra/updater'
import { appPaths } from './infra/paths'
import { CustomerRepository } from './infra/repositories/customer-repository'
import { DashboardRepository } from './infra/repositories/dashboard-repository'
import { DocumentRepository } from './infra/repositories/document-repository'
import { QuoteRepository } from './infra/repositories/quote-repository'
import { KeyTagRepository } from './infra/repositories/key-tag-repository'
import { SecurityRepository } from './infra/repositories/security-repository'
import { SettingsRepository } from './infra/repositories/settings-repository'
import { SessionLock } from './application/session-lock'
import { VehicleRepository } from './infra/repositories/vehicle-repository'
import { seedIfEmpty } from './infra/seed/dev-seed'

/** Raiz de composição: cria o banco e os repositórios uma vez e entrega aos handlers IPC. */
export interface Container {
  db: Db
  customers: CustomerRepository
  vehicles: VehicleRepository
  documents: DocumentRepository
  dashboard: DashboardRepository
  quotes: QuoteRepository
  keyTags: KeyTagRepository
  settings: SettingsRepository
  logos: LogoStore
  icons: AppIconStore
  lock: SessionLock
  updates: UpdateService
}

export async function createContainer(): Promise<Container> {
  const db = initDatabase()
  const container: Container = {
    db,
    customers: new CustomerRepository(db),
    vehicles: new VehicleRepository(db),
    documents: new DocumentRepository(db),
    dashboard: new DashboardRepository(db),
    quotes: new QuoteRepository(db),
    keyTags: new KeyTagRepository(db),
    settings: new SettingsRepository(db),
    logos: new LogoStore(appPaths.branding()),
    icons: new AppIconStore(appPaths.branding()),
    lock: new SessionLock(new SecurityRepository(db)),
    updates: new UpdateService()
  }

  if (!app.isPackaged && (await seedIfEmpty(db))) console.info('[db] seed de desenvolvimento aplicado')

  await container.lock.init()
  const settings = await container.settings.get()
  await container.keyTags.ensureCount(settings.keyTagCount)
  await expireOverdueQuotes(container.documents)

  return container
}
