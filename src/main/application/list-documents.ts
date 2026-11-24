import type { DocumentListQuery, DocumentListResult } from '@shared/documents'
import { shouldExpire } from '../domain/quote/quote-expiration'
import type { DocumentRepository } from '../infra/repositories/document-repository'

/** Marca como expirados os orçamentos aguardando aprovação que passaram da validade. */
export async function expireOverdueQuotes(repo: DocumentRepository, now = new Date()): Promise<number> {
  const awaiting = await repo.quotesAwaitingApproval()
  const overdue = awaiting.filter((q) => shouldExpire('AGUARDANDO_APROVACAO', q.validUntil, now)).map((q) => q.id)
  await repo.markExpired(overdue)
  return overdue.length
}

export async function listDocuments(repo: DocumentRepository, query: DocumentListQuery): Promise<DocumentListResult> {
  await expireOverdueQuotes(repo)
  const [items, counts] = await Promise.all([
    repo.list(query.search ?? '', query.filter ?? 'TODOS'),
    repo.countByFilter()
  ])
  return { items, counts }
}
