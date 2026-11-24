import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'

/** O que o usuário vê antes de importar. */
export interface BackupInfo {
  createdAt: string
  appName: string
  appVersion: string
  customers: number
  quotes: number
  migrations: string[]
}

export class BackupFileError extends Error {}

/** Todo banco SQLite começa com "SQLite format 3\0". */
function isSqliteFile(path: string): boolean {
  try {
    const fd = openSync(path, 'r')
    const header = Buffer.alloc(16)
    readSync(fd, header, 0, 16, 0)
    closeSync(fd)
    return header.toString('latin1') === 'SQLite format 3\u0000'
  } catch {
    return false
  }
}

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`

/**
 * Cria o arquivo de backup: cópia consistente do banco (VACUUM INTO) com metadados e os arquivos
 * da marca (logo e ícone) embutidos. O resultado é um único arquivo SQLite.
 */
export function writeBackupFile(opts: {
  databasePath: string
  brandingDir: string
  target: string
  appName: string
  appVersion: string
  now?: Date
}): BackupInfo {
  const tmp = `${opts.target}.tmp`
  rmSync(tmp, { force: true })
  const source = new Database(opts.databasePath, { readonly: true, fileMustExist: true })
  try {
    source.exec(`VACUUM INTO ${sqlString(tmp)}`)
  } finally {
    source.close()
  }

  const db = new Database(tmp)
  try {
    const createdAt = (opts.now ?? new Date()).toISOString()
    const customers = (db.prepare('SELECT count(*) AS n FROM Customer').get() as { n: number }).n
    const quotes = (db.prepare('SELECT count(*) AS n FROM Quote').get() as { n: number }).n
    db.exec(`
      CREATE TABLE _backup_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE _backup_files (name TEXT PRIMARY KEY, data BLOB NOT NULL);
    `)
    const meta = db.prepare('INSERT INTO _backup_meta (key, value) VALUES (?, ?)')
    meta.run('createdAt', createdAt)
    meta.run('appName', opts.appName)
    meta.run('appVersion', opts.appVersion)
    meta.run('customers', String(customers))
    meta.run('quotes', String(quotes))

    if (existsSync(opts.brandingDir)) {
      const file = db.prepare('INSERT INTO _backup_files (name, data) VALUES (?, ?)')
      for (const name of readdirSync(opts.brandingDir)) {
        file.run(name, readFileSync(join(opts.brandingDir, name)))
      }
    }
  } finally {
    db.close()
  }
  rmSync(opts.target, { force: true })
  // renameSync falha entre discos (ex.: pen drive); copiar + apagar funciona sempre.
  writeFileSync(opts.target, readFileSync(tmp))
  rmSync(tmp, { force: true })
  return readBackupInfo(opts.target)
}

/** Lê os metadados e confere se é mesmo um backup deste programa. */
export function readBackupInfo(path: string): BackupInfo {
  if (!isSqliteFile(path)) throw new BackupFileError('Este arquivo não é um backup deste programa.')
  let db: Database.Database
  try {
    db = new Database(path, { readonly: true, fileMustExist: true })
  } catch {
    throw new BackupFileError('Não foi possível abrir o arquivo. Ele não é um backup deste programa.')
  }
  try {
    const tables = new Set(
      (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name)
    )
    for (const required of ['_backup_meta', '_app_migrations', 'Setting', 'Customer', 'Quote']) {
      if (!tables.has(required)) throw new BackupFileError('Este arquivo não é um backup deste programa.')
    }
    const meta = Object.fromEntries(
      (db.prepare('SELECT key, value FROM _backup_meta').all() as { key: string; value: string }[]).map((r) => [r.key, r.value])
    )
    const migrations = (db.prepare('SELECT name FROM _app_migrations ORDER BY name').all() as { name: string }[]).map((r) => r.name)
    return {
      createdAt: meta['createdAt'] ?? '',
      appName: meta['appName'] ?? '',
      appVersion: meta['appVersion'] ?? '',
      customers: Number(meta['customers'] ?? 0),
      quotes: Number(meta['quotes'] ?? 0),
      migrations
    }
  } catch (error) {
    if (error instanceof BackupFileError) throw error
    throw new BackupFileError('O arquivo de backup está danificado.')
  } finally {
    db.close()
  }
}

/**
 * Prepara o banco a partir do backup em `stagingPath`: extrai a logo/ícone para `brandingDir`
 * e remove as tabelas do backup. Não toca no banco atual.
 */
export function stageRestore(backupPath: string, stagingPath: string, brandingDir: string): void {
  rmSync(stagingPath, { force: true })
  writeFileSync(stagingPath, readFileSync(backupPath))
  const db = new Database(stagingPath)
  try {
    const files = db.prepare('SELECT name, data FROM _backup_files').all() as { name: string; data: Buffer }[]
    mkdirSync(brandingDir, { recursive: true })
    for (const f of readdirSync(brandingDir)) rmSync(join(brandingDir, f), { force: true })
    for (const f of files) {
      // Só nomes simples: nada de caminhos vindos de um arquivo de fora.
      if (/^[\w.-]+$/.test(f.name)) writeFileSync(join(brandingDir, f.name), f.data)
    }
    db.exec('DROP TABLE _backup_files; DROP TABLE _backup_meta;')
  } finally {
    db.close()
  }
}
