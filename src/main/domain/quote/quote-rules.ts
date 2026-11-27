import type { QuoteStatus, WorkOrderStatus } from '@shared/status'
import type { QuoteLine } from './quote-totals'

/**
 * Rascunho e aguardando aprovação podem ser editados. Depois de aprovado, só com a OS aberta (em execução
 * ou pronta): no meio do serviço podem entrar peças e mão de obra. Entregue (pago) ou cancelada trava de vez.
 * Aprovado sem OS, recusado e expirado ficam somente leitura.
 */
export function isEditable(status: QuoteStatus, workOrder: WorkOrderStatus | null = null): boolean {
  if (workOrder) return status === 'APROVADO' && (workOrder === 'EM_EXECUCAO' || workOrder === 'PRONTO')
  return status === 'RASCUNHO' || status === 'AGUARDANDO_APROVACAO'
}

export function computeValidUntil(base: Date, validityDays: number): Date {
  const until = new Date(base)
  until.setDate(until.getDate() + validityDays)
  until.setHours(23, 59, 59, 999)
  return until
}

export interface DraftItem {
  description: string
  line: QuoteLine
}

export interface DraftRulesInput {
  items: DraftItem[]
  discountBp: number
  validityDays: number
  warrantyDays: number
  hourlyRateCents: number
}

/** Erros por campo. Item n usa a chave `items.n`. */
export function validateDraft(d: DraftRulesInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (d.discountBp < 0 || d.discountBp > 10_000) errors.discountBp = 'Desconto entre 0% e 100%.'
  if (d.validityDays < 1 || d.validityDays > 365) errors.validityDays = 'Validade entre 1 e 365 dias.'
  if (d.warrantyDays < 0 || d.warrantyDays > 3650) errors.warrantyDays = 'Garantia inválida.'
  if (d.hourlyRateCents < 0) errors.hourlyRateCents = 'Valor da hora inválido.'

  d.items.forEach((item, i) => {
    const problem = itemProblem(item)
    if (problem) errors[`items.${i}`] = problem
  })
  return errors
}

function itemProblem({ description, line }: DraftItem): string | null {
  if (!description.trim()) return 'Informe a descrição do item.'
  if (line.quantityMilli <= 0) return 'Quantidade deve ser maior que zero.'
  if (line.type === 'PECA') {
    if (line.unitCostCents < 0) return 'Custo não pode ser negativo.'
    if (line.markupBp < 0 || line.markupBp > 100_000) return 'Markup entre 0% e 1000%.'
  } else if (line.unitPriceCents < 0) return 'Valor não pode ser negativo.'
  return null
}

/** Para enviar ao cliente precisa ter ao menos um item com valor. */
export function canSend(items: readonly DraftItem[]): string | null {
  return items.length === 0 ? 'Adicione ao menos um item antes de enviar.' : null
}
