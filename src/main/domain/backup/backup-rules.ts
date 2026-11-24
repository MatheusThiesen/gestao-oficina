/** Extensão do arquivo de backup (por dentro é um banco SQLite com a logo embutida). */
export const BACKUP_EXTENSION = 'oficina-backup'
const AUTO_PREFIX = 'backup-automatico-'
export const AUTO_BACKUPS_KEPT = 30

function stamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** backup-automatico-2026-11-24-0930.oficina-backup */
export function autoBackupName(at: Date): string {
  return `${AUTO_PREFIX}${stamp(at)}.${BACKUP_EXTENSION}`
}

/** "Oficina do Zé" → Oficina-do-Ze-2026-11-24-0930.oficina-backup (nome para salvar onde o usuário quiser). */
export function manualBackupName(appName: string, at: Date): string {
  const slug =
    appName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || 'Oficina'
  return `${slug}-${stamp(at)}.${BACKUP_EXTENSION}`
}

export function isAutoBackup(fileName: string): boolean {
  return fileName.startsWith(AUTO_PREFIX) && fileName.endsWith(`.${BACKUP_EXTENSION}`)
}

/** Automáticos excedentes (mais antigos primeiro saem). Arquivos manuais nunca são apagados. */
export function autoBackupsToDelete(fileNames: readonly string[], keep = AUTO_BACKUPS_KEPT): string[] {
  const autos = fileNames.filter(isAutoBackup).sort() // o nome ordena pela data
  return autos.slice(0, Math.max(0, autos.length - keep))
}

/** Já existe backup automático do dia de `now`? */
export function hasAutoBackupOn(fileNames: readonly string[], now: Date): boolean {
  const day = `${AUTO_PREFIX}${stamp(now).slice(0, 10)}`
  return fileNames.some((f) => isAutoBackup(f) && f.startsWith(day))
}

/**
 * Um backup só pode ser importado se todas as migrations dele forem conhecidas por este programa.
 * Migrations a menos são normais (backup antigo): o programa aplica as que faltam ao abrir.
 */
export function unknownMigrations(backupMigrations: readonly string[], appMigrations: readonly string[]): string[] {
  const known = new Set(appMigrations)
  return backupMigrations.filter((m) => !known.has(m))
}
