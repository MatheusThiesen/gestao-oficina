import type { Db } from '../database'

const KEY = 'security'

/** Hash da senha de acesso, guardado à parte das configurações (que vão para a tela). */
export class SecurityRepository {
  constructor(private readonly db: Db) {}

  async getPasswordHash(): Promise<string | null> {
    const row = await this.db.setting.findUnique({ where: { key: KEY } })
    return row ? ((JSON.parse(row.value) as { passwordHash: string | null }).passwordHash ?? null) : null
  }

  async setPasswordHash(passwordHash: string | null): Promise<void> {
    const value = JSON.stringify({ passwordHash })
    await this.db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
  }
}
