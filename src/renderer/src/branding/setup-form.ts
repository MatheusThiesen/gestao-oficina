import { isHexColor } from '@shared/color'
import { bpToInput, centsToInput, formatDocument, formatKm, formatPhone, parseInteger, parseScaled } from '@shared/format'
import type { AppSettings, BrandingView, SetupInput } from '@shared/settings'
import { renderAppIcon } from './render-icon'

export type PasswordMode = 'none' | 'keep' | 'set' | 'remove'

/** Estado dos campos de configuração (assistente e tela Configurações). Números ficam como texto. */
export interface SetupForm {
  appName: string
  logoDataUrl: string | null
  logoChanged: boolean
  primaryColor: string
  sidebarColor: string
  shopName: string
  cnpj: string
  whatsapp: string
  address: string
  hourlyRate: string
  markup: string
  validityDays: string
  warrantyDays: string
  keyTagCount: string
  oilChangeKm: string
  oilChangeMonths: string
  passwordMode: PasswordMode
  password: string
  passwordConfirm: string
}

export type SetForm = (patch: Partial<SetupForm>) => void

export function formFromSettings(settings: AppSettings, branding: BrandingView): SetupForm {
  return {
    appName: branding.setupCompleted ? branding.appName : '',
    logoDataUrl: branding.logoDataUrl,
    logoChanged: false,
    primaryColor: branding.primaryColor,
    sidebarColor: branding.sidebarColor,
    shopName: settings.shop.name,
    cnpj: formatDocument(settings.shop.cnpj),
    whatsapp: formatPhone(settings.shop.whatsapp),
    address: settings.shop.address,
    hourlyRate: centsToInput(settings.hourlyRateCents),
    markup: bpToInput(settings.defaultMarkupBp),
    validityDays: String(settings.validityDays),
    warrantyDays: String(settings.warrantyDays),
    keyTagCount: String(settings.keyTagCount),
    oilChangeKm: formatKm(settings.oilChangeKm),
    oilChangeMonths: String(settings.oilChangeMonths),
    passwordMode: branding.hasPassword ? 'keep' : 'none',
    password: '',
    passwordConfirm: ''
  }
}

/** Senha escolhida está completa (ou não há troca de senha). */
export function passwordReady(form: SetupForm): boolean {
  return form.passwordMode !== 'set' || (form.password.length >= 4 && form.password === form.passwordConfirm)
}

/** Monta o SetupInput, incluindo o ícone do app gerado a partir da logo ou das iniciais. */
export async function formToInput(form: SetupForm, branding: BrandingView): Promise<SetupInput> {
  const appName = form.appName.trim()
  const iconPngDataUrl = await renderAppIcon({
    appName: appName || 'App',
    logoDataUrl: form.logoDataUrl,
    primaryColor: isHexColor(form.primaryColor) ? form.primaryColor : branding.primaryColor
  })
  return {
    appName: form.appName,
    primaryColor: form.primaryColor,
    sidebarColor: form.sidebarColor,
    iconPngDataUrl,
    ...(form.logoChanged ? { logoDataUrl: form.logoDataUrl } : {}),
    ...passwordChange(form, branding.hasPassword),
    shop: { name: form.shopName || form.appName, cnpj: form.cnpj, address: form.address, whatsapp: form.whatsapp },
    hourlyRateCents: parseScaled(form.hourlyRate, 2) ?? -1,
    defaultMarkupBp: parseScaled(form.markup, 2) ?? -1,
    validityDays: parseInteger(form.validityDays) ?? 0,
    warrantyDays: parseInteger(form.warrantyDays) ?? -1,
    keyTagCount: parseInteger(form.keyTagCount) ?? -1,
    oilChangeKm: parseInteger(form.oilChangeKm) ?? 0,
    oilChangeMonths: parseInteger(form.oilChangeMonths) ?? 0
  }
}

function passwordChange(form: SetupForm, hadPassword: boolean): { password?: string | null } {
  if (form.passwordMode === 'set') return { password: form.password }
  if (form.passwordMode === 'remove' || (form.passwordMode === 'none' && hadPassword)) return { password: null }
  return {}
}
