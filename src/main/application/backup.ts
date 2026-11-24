import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import type { BackupStatus } from '@shared/backup'
import {
  autoBackupName,
  autoBackupsToDelete,
  BACKUP_EXTENSION,
  hasAutoBackupOn,
  manualBackupName,
  unknownMigrations
} from '../domain/backup/backup-rules'
import { BackupFileError, readBackupInfo, stageRestore, writeBackupFile, type BackupInfo } from '../infra/backup/backup-file'
import { closeDatabase } from '../infra/database'
import { listMigrations } from '../infra/database/migration-runner'
import { appPaths } from '../infra/paths'
import type { SettingsRepository } from '../infra/repositories/settings-repository'
import { ValidationError } from './errors'

const AUTO_CHECK_EVERY_MS = 3 * 60 * 60 * 1000

/** Backups: manual, automático diário (mantém os 30 últimos) e importação de outro computador. */
export class BackupService {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly settings: SettingsRepository,
    private readonly appVersion: string
  ) {}

  async folder(): Promise<string> {
    return join(appPaths.documents((await this.settings.get()).branding.appName), 'Backups')
  }

  async status(): Promise<BackupStatus> {
    const folder = await this.folder()
    const files = this.backupFiles(folder)
    const latest = files
      .map((name) => ({ name, at: statSync(join(folder, name)).mtime }))
      .sort((a, b) => b.at.getTime() - a.at.getTime())[0]
    return {
      folder,
      lastBackupAt: latest?.at.toISOString() ?? null,
      lastBackupFile: latest?.name ?? null,
      autoBackups: files.filter((f) => f.startsWith('backup-automatico-')).length
    }
  }

  /** Backup na pasta padrão (ou em `target`, ex.: pen drive). */
  async create(target?: string, now = new Date()): Promise<{ path: string }> {
    const settings = await this.settings.get()
    const path = target ?? join(await this.folder(), manualBackupName(settings.branding.appName, now))
    mkdirSync(dirname(path), { recursive: true })
    writeBackupFile({
      databasePath: appPaths.database(),
      brandingDir: appPaths.branding(),
      target: path,
      appName: settings.branding.appName,
      appVersion: this.appVersion,
      now
    })
    return { path }
  }

  defaultFileName = async (now = new Date()) => manualBackupName((await this.settings.get()).branding.appName, now)

  /** Faz o backup automático do dia, se ainda não houver, e apaga os automáticos mais antigos. */
  async autoIfDue(now = new Date()): Promise<string | null> {
    if (!(await this.settings.get()).setupCompleted) return null
    const folder = await this.folder()
    if (hasAutoBackupOn(this.backupFiles(folder), now)) return null
    const { path } = await this.create(join(folder, autoBackupName(now)), now)
    for (const old of autoBackupsToDelete(this.backupFiles(folder))) rmSync(join(folder, old), { force: true })
    console.info('[backup] automático criado', basename(path))
    return path
  }

  startAuto(): void {
    const run = () => this.autoIfDue().catch((error) => console.error('[backup] automático falhou', error))
    void run()
    this.timer = setInterval(run, AUTO_CHECK_EVERY_MS)
  }

  stopAuto(): void {
    if (this.timer) clearInterval(this.timer)
  }

  /** Confere o arquivo antes de importar. Lança ValidationError com uma mensagem para o usuário. */
  inspect(path: string): BackupInfo {
    let info: BackupInfo
    try {
      info = readBackupInfo(path)
    } catch (error) {
      if (error instanceof BackupFileError) throw new ValidationError(error.message)
      throw error
    }
    const known = listMigrations(appPaths.migrations()).map((m) => m.name)
    if (unknownMigrations(info.migrations, known).length > 0) {
      throw new ValidationError(
        `Este backup foi feito numa versão mais nova do programa (${info.appVersion}). Atualize este computador antes de importar.`
      )
    }
    return info
  }

  /**
   * Substitui os dados deste computador pelos do backup. Guarda antes uma cópia dos dados atuais
   * (dados.antes-da-importacao-<data>.db). Depois disso o programa precisa reiniciar.
   */
  async restore(path: string, now = new Date()): Promise<BackupInfo> {
    const info = this.inspect(path)
    const dbPath = appPaths.database()
    const staging = dbPath.replace(/\.db$/, '.importando.db')

    if (existsSync(dbPath)) {
      const stamp = now.toISOString().slice(0, 19).replace(/:/g, '-')
      const safety = dbPath.replace(/\.db$/, `.antes-da-importacao-${stamp}.db`)
      const current = new Database(dbPath, { readonly: true })
      try {
        current.exec(`VACUUM INTO '${safety.replace(/'/g, "''")}'`)
      } finally {
        current.close()
      }
    }

    stageRestore(path, staging, appPaths.branding())
    this.stopAuto()
    await closeDatabase()
    rmSync(`${dbPath}-journal`, { force: true })
    renameSync(staging, dbPath)
    console.info('[backup] importado', basename(path), info.createdAt)
    return info
  }

  private backupFiles(folder: string): string[] {
    if (!existsSync(folder)) return []
    return readdirSync(folder).filter((f) => f.endsWith(`.${BACKUP_EXTENSION}`))
  }
}
