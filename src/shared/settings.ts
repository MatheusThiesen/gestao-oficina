export interface ShopInfo {
  /** Nome que vai no orçamento/PDF. */
  name: string
  cnpj: string
  address: string
  whatsapp: string
}

export interface Branding {
  /** Nome do programa: menu, título da janela, pastas de documentos. */
  appName: string
  primaryColor: string
  sidebarColor: string
  /** Arquivo da logo na pasta de dados do app (definido pelo main). */
  logoFile: string | null
  /** Nome dos atalhos atuais no Windows (o instalador cria com o nome padrão). */
  shortcutName: string
}

export interface AppSettings {
  setupCompleted: boolean
  /** O tour do primeiro acesso já foi visto (ou pulado). */
  tourCompleted: boolean
  branding: Branding
  shop: ShopInfo
  hourlyRateCents: number
  defaultMarkupBp: number
  validityDays: number
  warrantyDays: number
  keyTagCount: number
  oilChangeKm: number
  oilChangeMonths: number
}

export const DEFAULT_APP_NAME = 'Gestão Oficina'

export const DEFAULT_SETTINGS: AppSettings = {
  setupCompleted: false,
  tourCompleted: false,
  branding: {
    appName: DEFAULT_APP_NAME,
    primaryColor: '#c8121a',
    sidebarColor: '#1f2124',
    logoFile: null,
    shortcutName: DEFAULT_APP_NAME
  },
  shop: { name: '', cnpj: '', address: '', whatsapp: '' },
  hourlyRateCents: 12_000,
  defaultMarkupBp: 3_000,
  validityDays: 10,
  warrantyDays: 90,
  keyTagCount: 30,
  oilChangeKm: 10_000,
  oilChangeMonths: 6
}

/** O que a tela recebe para aplicar a marca (logo já como data URL). */
export interface BrandingView {
  setupCompleted: boolean
  tourCompleted: boolean
  /** Há senha de acesso definida. */
  hasPassword: boolean
  /** O app está bloqueado esperando a senha. */
  locked: boolean
  appName: string
  primaryColor: string
  sidebarColor: string
  logoDataUrl: string | null
}

/** Enviado pelo assistente de configuração (e pela tela Configurações). */
export interface SetupInput {
  appName: string
  primaryColor: string
  sidebarColor: string
  /** data:image/...;base64. `null` remove a logo; ausente mantém a atual. */
  logoDataUrl?: string | null
  /** Ícone do aplicativo (PNG 256×256) gerado pela tela a partir da logo ou das iniciais. */
  iconPngDataUrl: string
  /** Senha de acesso: ausente mantém a atual, null remove, texto define. */
  password?: string | null
  shop: ShopInfo
  hourlyRateCents: number
  defaultMarkupBp: number
  validityDays: number
  warrantyDays: number
  keyTagCount: number
  oilChangeKm: number
  oilChangeMonths: number
}
