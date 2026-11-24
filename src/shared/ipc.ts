/**
 * Contrato IPC entre renderer e main.
 * Cada canal declara a entrada e a saída. O preload expõe `invoke` tipado a partir daqui,
 * e o main registra um handler para cada canal (validando a entrada com zod).
 */
import type { BackupStatus, RestoreResult } from './backup'
import type { DashboardData, DashboardQuery } from './dashboard'
import type { CatalogBrand, CatalogModel } from './vehicle-catalog'
import type { DocumentListQuery, DocumentListResult, KeyTagView } from './documents'
import type {
  CatalogPart,
  CatalogService,
  QuoteCalculation,
  QuoteDraftInput,
  QuoteItemInput,
  QuoteView
} from './quotes'
import type { AppSettings, BrandingView, SetupInput } from './settings'
import type { AppEvent, AppEvents, UpdateStatus } from './updates'
import type {
  CustomerDetail,
  CustomerInput,
  CustomerListItem,
  VehicleDetail,
  VehicleInput,
  VehicleListItem
} from './registry'

export interface AppInfo {
  version: string
  userDataPath: string
  databasePath: string
}

export interface IpcContract {
  'app:info': { input: void; output: AppInfo }
  'dashboard:get': { input: DashboardQuery; output: DashboardData }
  'documents:list': { input: DocumentListQuery; output: DocumentListResult }
  'keyTags:list': { input: void; output: KeyTagView[] }
  'customers:list': { input: { search?: string }; output: CustomerListItem[] }
  'customers:get': { input: { id: number }; output: CustomerDetail }
  'customers:save': { input: CustomerInput; output: { id: number } }
  'vehicles:list': { input: { search?: string }; output: VehicleListItem[] }
  'vehicles:get': { input: { id?: number; plate?: string }; output: VehicleDetail | null }
  'vehicles:save': { input: VehicleInput; output: { id: number; plate: string } }
  'settings:get': { input: void; output: AppSettings }
  'branding:get': { input: void; output: BrandingView }
  'setup:save': { input: SetupInput; output: BrandingView }
  'auth:unlock': { input: { password: string }; output: BrandingView }
  'auth:lock': { input: void; output: BrandingView }
  'backup:status': { input: void; output: BackupStatus }
  'backup:create': { input: void; output: { path: string } }
  'backup:saveAs': { input: void; output: { path: string } | null }
  'backup:openFolder': { input: void; output: void }
  'backup:restore': { input: void; output: RestoreResult }
  'updates:status': { input: void; output: UpdateStatus }
  'updates:check': { input: void; output: UpdateStatus }
  'updates:install': { input: void; output: void }
  'quotes:get': { input: { id: number }; output: QuoteView }
  'quotes:save': { input: QuoteDraftInput; output: { id: number } }
  'quotes:calculate': { input: { items: QuoteItemInput[]; discountBp: number }; output: QuoteCalculation }
  'quotes:pdf': { input: { id: number }; output: { path: string } }
  'quotes:openPdfFolder': { input: void; output: void }
  'vehicleCatalog:brands': { input: { search?: string }; output: CatalogBrand[] }
  'vehicleCatalog:models': { input: { brand: string; search?: string }; output: CatalogModel[] }
  'vehicleCatalog:logo': { input: { brand: string }; output: string | null }
  'catalog:parts': { input: { search?: string }; output: CatalogPart[] }
  'catalog:services': { input: { search?: string }; output: CatalogService[] }
}

export type IpcChannel = keyof IpcContract
export type IpcInput<C extends IpcChannel> = IpcContract[C]['input']
export type IpcOutput<C extends IpcChannel> = IpcContract[C]['output']

/** Resultado padronizado para o renderer saber se o main falhou sem depender de exceções serializadas. */
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> }

export interface AppApi {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: IpcInput<C> extends void ? [] : [IpcInput<C>]
  ): Promise<IpcResult<IpcOutput<C>>>
  /** Escuta um evento do main. Devolve a função para parar de escutar. */
  on<E extends AppEvent>(event: E, listener: (payload: AppEvents[E]) => void): () => void
}
