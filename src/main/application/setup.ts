import { isHexColor } from '@shared/color'
import type { AppSettings, BrandingView, SetupInput } from '@shared/settings'
import { isValidCnpj, isValidPhone, onlyDigits } from '../domain/validation/identifiers'
import { applyAppIcon, type AppIconStore } from '../infra/app-icon'
import { LogoError, type LogoStore } from '../infra/logo-store'
import { updateWindowsShortcuts } from '../infra/shortcuts'
import type { KeyTagRepository } from '../infra/repositories/key-tag-repository'
import type { SettingsRepository } from '../infra/repositories/settings-repository'
import { ValidationError } from './errors'
import { MIN_PASSWORD_LENGTH, type SessionLock } from './session-lock'

export interface SetupDeps {
  settings: SettingsRepository
  keyTags: KeyTagRepository
  logos: LogoStore
  icons: AppIconStore
  lock: SessionLock
}

export async function getBranding(deps: SetupDeps): Promise<BrandingView> {
  const s = await deps.settings.get()
  return {
    setupCompleted: s.setupCompleted,
    appName: s.branding.appName,
    primaryColor: s.branding.primaryColor,
    sidebarColor: s.branding.sidebarColor,
    logoDataUrl: deps.logos.readDataUrl(s.branding.logoFile),
    hasPassword: deps.lock.passwordSet,
    locked: deps.lock.isLocked
  }
}

export function validateSetup(input: SetupInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.appName.trim().length < 2) errors.appName = 'Informe o nome do programa.'
  if (input.appName.trim().length > 40) errors.appName = 'Use no máximo 40 caracteres.'
  if (!isHexColor(input.primaryColor)) errors.primaryColor = 'Cor inválida.'
  if (!isHexColor(input.sidebarColor)) errors.sidebarColor = 'Cor inválida.'
  if (input.shop.name.trim().length < 2) errors['shop.name'] = 'Informe o nome da empresa.'
  const cnpj = onlyDigits(input.shop.cnpj)
  if (cnpj && !isValidCnpj(cnpj)) errors['shop.cnpj'] = 'CNPJ inválido.'
  const phone = onlyDigits(input.shop.whatsapp)
  if (phone && !isValidPhone(phone)) errors['shop.whatsapp'] = 'Telefone inválido. Use DDD + número.'
  if (input.hourlyRateCents < 0) errors.hourlyRateCents = 'Valor inválido.'
  if (input.defaultMarkupBp < 0 || input.defaultMarkupBp > 100_000) errors.defaultMarkupBp = 'Markup inválido.'
  if (input.validityDays < 1 || input.validityDays > 365) errors.validityDays = 'Entre 1 e 365 dias.'
  if (input.warrantyDays < 0 || input.warrantyDays > 3650) errors.warrantyDays = 'Garantia inválida.'
  if (input.keyTagCount < 0 || input.keyTagCount > 200) errors.keyTagCount = 'Entre 0 e 200 chaves.'
  if (input.oilChangeKm < 1000 || input.oilChangeKm > 100_000) errors.oilChangeKm = 'Entre 1.000 e 100.000 km.'
  if (input.oilChangeMonths < 1 || input.oilChangeMonths > 36) errors.oilChangeMonths = 'Entre 1 e 36 meses.'
  if (typeof input.password === 'string' && input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return errors
}

/** Salva nome, logo, cores, dados da empresa e padrões, e marca a configuração inicial como feita. */
export async function saveSetup(deps: SetupDeps, input: SetupInput): Promise<AppSettings> {
  const errors = validateSetup(input)
  if (Object.keys(errors).length > 0) throw ValidationError.fields(errors)

  const current = await deps.settings.get()
  let logoFile = current.branding.logoFile
  try {
    if (input.logoDataUrl === null) {
      deps.logos.remove()
      logoFile = null
    } else if (input.logoDataUrl) logoFile = deps.logos.save(input.logoDataUrl)
  } catch (error) {
    if (error instanceof LogoError) throw ValidationError.fields({ logo: error.message })
    throw error
  }

  await deps.lock.change(input.password)
  const icon = deps.icons.save(input.iconPngDataUrl)
  applyAppIcon(icon)
  const appName = input.appName.trim()
  try {
    updateWindowsShortcuts(appName, current.branding.shortcutName, deps.icons.icoPath)
  } catch (error) {
    // Atalho é conveniência: falhar aqui não pode impedir salvar a configuração.
    console.warn('[setup] não foi possível atualizar os atalhos', error)
  }

  const next: AppSettings = {
    ...current,
    setupCompleted: true,
    branding: {
      appName,
      shortcutName: appName,
      primaryColor: input.primaryColor.toLowerCase(),
      sidebarColor: input.sidebarColor.toLowerCase(),
      logoFile
    },
    shop: {
      name: input.shop.name.trim(),
      cnpj: onlyDigits(input.shop.cnpj),
      address: input.shop.address.trim(),
      whatsapp: onlyDigits(input.shop.whatsapp)
    },
    hourlyRateCents: input.hourlyRateCents,
    defaultMarkupBp: input.defaultMarkupBp,
    validityDays: input.validityDays,
    warrantyDays: input.warrantyDays,
    keyTagCount: input.keyTagCount,
    oilChangeKm: input.oilChangeKm,
    oilChangeMonths: input.oilChangeMonths
  }
  await deps.settings.save(next)
  await deps.keyTags.ensureCount(next.keyTagCount)
  return next
}
