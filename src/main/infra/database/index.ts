import { existsSync } from 'node:fs'
import Database from 'better-sqlite3'
import { appPaths } from '../paths'
import { runMigrations } from './migration-runner'
import { createPrismaClient, type Db } from './prisma'

let client: Db | null = null

/** Migra o banco (conexão síncrona curta) e abre o Prisma. Chamado uma vez na inicialização. */
export function initDatabase(): Db {
  const path = appPaths.database()
  const existed = existsSync(path)
  const raw = new Database(path)
  try {
    const { applied } = runMigrations(raw, appPaths.migrations(), {
      // Atualização com mudança no banco: guarda uma cópia antes de migrar.
      beforeApply: () => {
        if (existed) raw.exec(`VACUUM INTO '${backupPathBeforeMigration(path).replace(/'/g, "''")}'`)
      }
    })
    if (applied.length > 0) console.info('[db] migrations aplicadas:', applied.join(', '))
  } finally {
    raw.close()
  }
  client = createPrismaClient(path)
  return client
}

/** dados.antes-da-atualizacao-2026-11-24T10-00-00.db, ao lado do banco. */
function backupPathBeforeMigration(dbPath: string): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  return dbPath.replace(/\.db$/, `.antes-da-atualizacao-${stamp}.db`)
}

export function getDb(): Db {
  if (!client) throw new Error('Banco não inicializado.')
  return client
}

export async function closeDatabase(): Promise<void> {
  await client?.$disconnect()
  client = null
}

export type { Db }
