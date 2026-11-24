import { hashPassword, verifyPassword } from '../infra/password'
import type { SecurityRepository } from '../infra/repositories/security-repository'
import { ValidationError } from './errors'

export const MIN_PASSWORD_LENGTH = 4

/** Estado de bloqueio da sessão. Com senha definida, o app abre bloqueado. */
export class SessionLock {
  private locked = false
  private hasPassword = false

  constructor(private readonly security: SecurityRepository) {}

  async init(): Promise<void> {
    this.hasPassword = (await this.security.getPasswordHash()) !== null
    this.locked = this.hasPassword
  }

  get isLocked(): boolean {
    return this.locked
  }

  get passwordSet(): boolean {
    return this.hasPassword
  }

  async unlock(password: string): Promise<void> {
    const hash = await this.security.getPasswordHash()
    if (hash && !verifyPassword(password, hash)) {
      // Atraso pequeno para desestimular tentativa em sequência.
      await new Promise((r) => setTimeout(r, 600))
      throw ValidationError.fields({ password: 'Senha incorreta.' })
    }
    this.locked = false
  }

  lock(): void {
    if (this.hasPassword) this.locked = true
  }

  /** undefined mantém; null remove; texto define nova senha. */
  async change(password: string | null | undefined): Promise<void> {
    if (password === undefined) return
    if (password === null) {
      await this.security.setPasswordHash(null)
      this.hasPassword = false
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw ValidationError.fields({ password: `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` })
    }
    await this.security.setPasswordHash(hashPassword(password))
    this.hasPassword = true
  }
}
