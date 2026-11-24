export interface BackupStatus {
  folder: string
  /** Caminho para mostrar na tela, sem a pasta do usuário: "Documentos › Oficina › Backups". */
  folderLabel: string
  lastBackupAt: string | null
  lastBackupFile: string | null
  autoBackups: number
}

export type RestoreResult =
  | { status: 'cancelled' }
  /** O programa vai reiniciar com os dados importados. */
  | { status: 'restarting' }
