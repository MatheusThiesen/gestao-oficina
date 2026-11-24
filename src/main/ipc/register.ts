import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import type { IpcChannel, IpcInput, IpcOutput, IpcResult } from '@shared/ipc'
import { NotFoundError, ValidationError } from '../application/errors'

type Handler<C extends IpcChannel> = (input: IpcInput<C>) => Promise<IpcOutput<C>> | IpcOutput<C>

/** Canais liberados com o app bloqueado: o resto só responde depois da senha. */
const OPEN_WHEN_LOCKED: ReadonlySet<IpcChannel> = new Set(['app:info', 'branding:get', 'auth:unlock'])
let isLocked: () => boolean = () => false

export function setLockCheck(check: () => boolean): void {
  isLocked = check
}

/** Registra um handler tipado que sempre devolve IpcResult, nunca lança para o renderer. */
export function handle<C extends IpcChannel>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel, async (_event, input: IpcInput<C>): Promise<IpcResult<IpcOutput<C>>> => {
    if (isLocked() && !OPEN_WHEN_LOCKED.has(channel)) {
      return { ok: false, error: 'Programa bloqueado. Digite a senha.' }
    }
    try {
      return { ok: true, data: await handler(input) }
    } catch (error) {
      return toFailure(channel, error)
    }
  })
}

function toFailure(channel: string, error: unknown): { ok: false; error: string; fields?: Record<string, string> } {
  if (error instanceof ValidationError) return { ok: false, error: error.message, fields: error.fields }
  if (error instanceof NotFoundError) return { ok: false, error: error.message }
  if (error instanceof ZodError) {
    console.warn(`[ipc] ${channel} entrada inválida`, error.issues)
    return { ok: false, error: 'Dados inválidos enviados pela tela.' }
  }
  if (isUniqueViolation(error)) return { ok: false, error: 'Já existe um cadastro com esse valor.' }
  console.error(`[ipc] ${channel}`, error)
  return { ok: false, error: 'Erro inesperado. Tente de novo; se continuar, chame o suporte.' }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}
