import type { QuoteStatus } from '@shared/status'

/** Só orçamento enviado e ainda sem resposta expira; rascunho não tem validade correndo. */
export function shouldExpire(status: QuoteStatus, validUntil: Date, now: Date): boolean {
  return status === 'AGUARDANDO_APROVACAO' && validUntil.getTime() < now.getTime()
}
