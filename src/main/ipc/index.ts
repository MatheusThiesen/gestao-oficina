import { mkdirSync } from 'node:fs'
import { app, shell } from 'electron'
import { z } from 'zod'
import { DOCUMENT_FILTERS } from '@shared/documents'
import { getDashboard } from '../application/dashboard'
import { NotFoundError } from '../application/errors'
import { listDocuments } from '../application/list-documents'
import { generateQuotePdf, pdfFolder } from '../application/quote-pdf'
import { calculateQuote, getQuoteView, saveQuoteDraft } from '../application/quotes'
import { getVehicleDetail, saveCustomer, saveVehicle } from '../application/registry'
import { getBranding, saveSetup } from '../application/setup'
import type { Container } from '../container'
import { appPaths } from '../infra/paths'
import { registerBackupHandlers } from './backup-handlers'
import { handle, setLockCheck } from './register'
import {
  brandInput,
  modelSearchInput,
  unlockInput,
  calculateInput,
  setupInput,
  customerInput,
  idInput,
  quoteDraftInput,
  searchInput,
  vehicleInput,
  vehicleLookup
} from './schemas'

const dashboardQuery = z.object({
  period: z.enum(['week', 'month']),
  offset: z.number().int().min(-120).max(0)
})

const documentListQuery = z.object({
  search: z.string().max(100).optional(),
  filter: z.enum(DOCUMENT_FILTERS).optional()
})

/** `onBrandingChanged` atualiza o título da janela quando o nome do programa muda. */
export function registerIpcHandlers(c: Container, onBrandingChanged: (appName: string) => void): void {
  handle('app:info', () => ({
    version: app.getVersion(),
    userDataPath: app.getPath('userData'),
    databasePath: appPaths.database()
  }))

  handle('dashboard:get', (input) => getDashboard(c.dashboard, dashboardQuery.parse(input)))

  handle('documents:list', (input) => listDocuments(c.documents, documentListQuery.parse(input ?? {})))

  handle('keyTags:list', () => c.keyTags.listWithUsage())

  handle('customers:list', (input) => c.customers.list(searchInput.parse(input ?? {}).search ?? ''))
  handle('customers:get', async (input) => {
    const customer = await c.customers.get(idInput.parse(input).id)
    if (!customer) throw new NotFoundError('Cliente')
    return customer
  })
  handle('customers:save', (input) => saveCustomer(c.customers, customerInput.parse(input)))

  handle('vehicles:list', (input) => c.vehicles.list(searchInput.parse(input ?? {}).search ?? ''))
  handle('vehicles:get', async (input) => {
    const where = vehicleLookup.parse(input)
    return getVehicleDetail(c.vehicles, where, await c.settings.get())
  })
  handle('vehicles:save', (input) => saveVehicle(c.vehicles, vehicleInput.parse(input)))

  handle('settings:get', () => c.settings.get())
  setLockCheck(() => c.lock.isLocked)

  handle('branding:get', () => getBranding(c))
  handle('auth:unlock', async (input) => {
    await c.lock.unlock(unlockInput.parse(input).password)
    return getBranding(c)
  })
  registerBackupHandlers(c)

  handle('updates:status', () => c.updates.current)
  handle('updates:check', () => c.updates.check())
  handle('updates:install', () => c.updates.install())

  handle('auth:lock', () => {
    c.lock.lock()
    return getBranding(c)
  })
  handle('setup:save', async (input) => {
    const saved = await saveSetup(c, setupInput.parse(input))
    onBrandingChanged(saved.branding.appName)
    return getBranding(c)
  })

  handle('quotes:get', (input) => getQuoteView(c.quotes, idInput.parse(input).id))
  handle('quotes:save', (input) => saveQuoteDraft(c, quoteDraftInput.parse(input)))
  handle('quotes:calculate', (input) => {
    const { items, discountBp } = calculateInput.parse(input)
    return calculateQuote(items, discountBp)
  })
  handle('quotes:pdf', async (input) => {
    const result = await generateQuotePdf(c, idInput.parse(input).id)
    // GESTAO_NO_OPEN=1: testes automatizados geram o PDF sem abrir o visualizador.
    if (process.env['GESTAO_NO_OPEN'] !== '1') {
      const error = await shell.openPath(result.path)
      if (error) console.warn('[pdf] não abriu o arquivo', error)
    }
    return result
  })
  handle('quotes:openPdfFolder', async () => {
    const folder = pdfFolder(await c.settings.get())
    mkdirSync(folder, { recursive: true })
    await shell.openPath(folder)
  })
  handle('vehicleCatalog:brands', (input) => c.vehicleCatalog.searchBrands(searchInput.parse(input ?? {}).search ?? ''))
  handle('vehicleCatalog:models', (input) => {
    const { brand, search } = modelSearchInput.parse(input)
    return c.vehicleCatalog.searchModels(brand, search ?? '')
  })
  handle('vehicleCatalog:logo', (input) => c.vehicleCatalog.logoFor(brandInput.parse(input).brand))
  handle('catalog:parts', (input) => c.quotes.searchParts(searchInput.parse(input ?? {}).search ?? ''))
  handle('catalog:services', (input) => c.quotes.searchServices(searchInput.parse(input ?? {}).search ?? ''))
}
