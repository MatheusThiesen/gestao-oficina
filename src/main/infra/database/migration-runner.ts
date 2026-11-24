import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type Database from 'better-sqlite3'

const TABLE = '_app_migrations'

export interface MigrationResult {
  applied: string[]
}

interface AppliedRow {
  name: string
  checksum: string
}

/**
 * Aplica os migration.sql pendentes de prisma/migrations, em ordem, cada um numa transação,
 * registrando em _app_migrations. Substitui o `prisma migrate deploy`, que não existe no app empacotado.
 */
export interface MigrationOptions {
  /** Chamado uma vez, antes da primeira migration pendente (ex.: cópia de segurança). */
  beforeApply?: (pending: string[]) => void
}

export function runMigrations(db: Database.Database, migrationsDir: string, options: MigrationOptions = {}): MigrationResult {
  db.exec(
    `CREATE TABLE IF NOT EXISTS "${TABLE}" (
      name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`
  )

  const applied = new Map(
    (db.prepare(`SELECT name, checksum FROM "${TABLE}"`).all() as AppliedRow[]).map((r) => [r.name, r.checksum])
  )
  const result: MigrationResult = { applied: [] }
  const migrations = listMigrations(migrationsDir)
  const pending = migrations.filter((m) => !applied.has(m.name)).map((m) => m.name)
  if (pending.length > 0) options.beforeApply?.(pending)

  for (const migration of migrations) {
    const sql = readFileSync(migration.file, 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    const previous = applied.get(migration.name)

    if (previous !== undefined) {
      if (previous !== checksum) console.warn(`[migrations] ${migration.name} mudou depois de aplicada; ignorando.`)
      continue
    }

    applyMigration(db, migration.name, sql, checksum)
    result.applied.push(migration.name)
  }

  return result
}

export function listMigrations(dir: string): { name: string; file: string }[] {
  if (!existsSync(dir)) throw new Error(`Pasta de migrations não encontrada: ${dir}`)
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, file: join(dir, entry.name, 'migration.sql') }))
    .filter((m) => existsSync(m.file))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * As migrations do Prisma para SQLite recriam tabelas com foreign keys desligadas.
 * PRAGMA foreign_keys não tem efeito dentro de transação, então desliga antes,
 * confere a integridade no fim e só então confirma.
 */
function applyMigration(db: Database.Database, name: string, sql: string, checksum: string): void {
  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      db.exec(sql)
      const violations = db.pragma('foreign_key_check') as unknown[]
      if (violations.length > 0) throw new Error(`Migration ${name} deixou chaves estrangeiras inválidas.`)
      db.prepare(`INSERT INTO "${TABLE}" (name, checksum, applied_at) VALUES (?, ?, ?)`).run(
        name,
        checksum,
        new Date().toISOString()
      )
    })()
  } finally {
    db.pragma('foreign_keys = ON')
  }
}
