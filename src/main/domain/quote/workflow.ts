import type { QuoteStatus, WorkOrderStatus } from '@shared/status'
import type { WorkflowAction } from '@shared/workflow'

/** Situação atual de um orçamento (e da OS, se houver). */
export interface WorkflowState {
  quote: QuoteStatus
  workOrder: WorkOrderStatus | null
  /** Existe versão mais nova: esta fica só para consulta. */
  superseded: boolean
}

/**
 * Ações permitidas em cada situação. A tela mostra só estas; o processo principal confere de novo
 * antes de executar (nunca confia na tela).
 */
export function allowedActions(s: WorkflowState): WorkflowAction[] {
  if (s.superseded) return []
  if (s.workOrder) {
    switch (s.workOrder) {
      case 'EM_EXECUCAO':
        return ['markReady', 'cancelWorkOrder']
      case 'PRONTO':
        return ['deliver', 'backToExecution', 'cancelWorkOrder']
      default:
        return [] // ENTREGUE e CANCELADA são finais
    }
  }
  switch (s.quote) {
    case 'RASCUNHO':
      return ['send', 'approve']
    case 'AGUARDANDO_APROVACAO':
      return ['approve', 'refuse', 'send']
    case 'RECUSADO':
    case 'EXPIRADO':
      return ['reopen']
    case 'APROVADO':
      return ['openWorkOrder']
  }
}

export function assertAllowed(s: WorkflowState, action: WorkflowAction): void {
  if (!allowedActions(s).includes(action)) {
    throw new WorkflowError(ACTION_REFUSED[action])
  }
}

export class WorkflowError extends Error {}

const ACTION_REFUSED: Record<WorkflowAction, string> = {
  send: 'Só dá para enviar um orçamento em rascunho ou aguardando aprovação.',
  approve: 'Só dá para aprovar um orçamento em rascunho ou aguardando aprovação.',
  refuse: 'Só dá para recusar um orçamento que está aguardando aprovação.',
  reopen: 'Só orçamentos recusados ou expirados podem ser reabertos.',
  openWorkOrder: 'A OS só pode ser aberta para um orçamento aprovado e ainda sem OS.',
  markReady: 'Só uma OS em execução pode ser marcada como pronta.',
  backToExecution: 'Só uma OS pronta pode voltar para execução.',
  deliver: 'Só uma OS pronta pode ser entregue.',
  cancelWorkOrder: 'Só uma OS em execução ou pronta pode ser cancelada.'
}

/** Menor número de chave ativo e livre; null se todas estão em uso. */
export function suggestKeyTag(active: readonly number[], inUse: readonly number[]): number | null {
  const used = new Set(inUse)
  return [...active].sort((a, b) => a - b).find((n) => !used.has(n)) ?? null
}
