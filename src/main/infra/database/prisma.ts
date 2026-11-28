import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../prisma/generated/client'

export type Db = PrismaClient

export function createPrismaClient(databasePath: string): PrismaClient {
  // timeout = busy timeout do SQLite: espera até 15s por um lock (backup automático, antivírus) antes de falhar.
  const adapter = new PrismaBetterSqlite3({ url: `file:${databasePath}`, timeout: 15_000 })
  return new PrismaClient({ adapter })
}
