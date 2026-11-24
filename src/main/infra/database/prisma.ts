import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../prisma/generated/client'

export type Db = PrismaClient

export function createPrismaClient(databasePath: string): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: `file:${databasePath}` })
  return new PrismaClient({ adapter })
}
