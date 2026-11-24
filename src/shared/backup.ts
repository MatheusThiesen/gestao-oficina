export interface BackupStatus {
  folder: string
  lastBackupAt: string | null
  lastBackupFile: string | null
  autoBackups: number
}

export type RestoreResult =
  | { status: 'cancelled' }
  /** O programa vai reiniciar com os dados importados. */
  | { status: 'restarting' }
