import { DEFAULT_SETTINGS, type AppSettings } from '@shared/settings'
import type { Db } from '../database'

const KEY = 'app'

export class SettingsRepository {
  constructor(private readonly db: Db) {}

  /** Lê as configurações, completando com os padrões o que ainda não foi salvo. */
  async get(): Promise<AppSettings> {
    const row = await this.db.setting.findUnique({ where: { key: KEY } })
    if (!row) return DEFAULT_SETTINGS
    const saved = JSON.parse(row.value) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      branding: { ...DEFAULT_SETTINGS.branding, ...saved.branding },
      shop: { ...DEFAULT_SETTINGS.shop, ...saved.shop }
    }
  }

  async save(settings: AppSettings): Promise<void> {
    const value = JSON.stringify(settings)
    await this.db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
  }
}
