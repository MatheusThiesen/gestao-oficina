export const QUOTE_STATUSES = [
  'RASCUNHO',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
  'RECUSADO',
  'EXPIRADO'
] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const WORK_ORDER_STATUSES = ['EM_EXECUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADA'] as const
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

/** Status exibido na lista unificada de orçamentos e OS. */
export type DocumentStatus = QuoteStatus | WorkOrderStatus

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  RASCUNHO: 'Rascunho',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADO: 'Aprovado',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
  EM_EXECUCAO: 'Em execução',
  PRONTO: 'Pronto para entrega',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada'
}
