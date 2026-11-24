import type { ApprovalChannel } from './quotes'

export type WorkflowAction =
  | 'send'
  | 'approve'
  | 'refuse'
  | 'reopen'
  | 'openWorkOrder'
  | 'markReady'
  | 'backToExecution'
  | 'deliver'
  | 'cancelWorkOrder'

export interface ApproveInput {
  id: number
  channel: ApprovalChannel
  approvedBy: string
  /** Abre a OS na hora (o carro já fica na oficina). */
  openWorkOrder: boolean
  keyTagNumber: number | null
}

export interface KeyTagOptions {
  free: number[]
  suggested: number | null
}

export interface SendResult {
  pdfPath: string
  /** Link do WhatsApp com a mensagem pronta (null se o cliente não tem WhatsApp). */
  whatsappUrl: string | null
}
