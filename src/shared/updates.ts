export type UpdateState =
  | 'disabled' // rodando fora do instalador (desenvolvimento)
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'downloading'
  | 'ready' // baixada; instala ao reiniciar ou ao fechar
  | 'error'

export interface UpdateStatus {
  state: UpdateState
  currentVersion: string
  /** Versão nova encontrada. */
  version?: string
  /** 0–100 durante o download. */
  percent?: number
  error?: string
  checkedAt?: string
}

/** Eventos que o main envia para a tela. */
export interface AppEvents {
  'updates:status': UpdateStatus
}
export type AppEvent = keyof AppEvents
