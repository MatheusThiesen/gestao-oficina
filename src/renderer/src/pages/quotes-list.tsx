import { FileText, KeyRound, Plus, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { DocumentFilter, DocumentListItem } from '@shared/documents'
import { formatDate, formatDocNumber, formatKeyTag, formatMoney } from '@shared/format'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { SearchInput } from '@/components/search-input'
import { StatusTag } from '@/components/status-tag'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Segmented } from '@/components/ui/segmented'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useDebounced, useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'

const FILTERS: { value: DocumentFilter; label: string }[] = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'AGUARDANDO_APROVACAO', label: 'Aguardando' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'EM_EXECUCAO', label: 'Em execução' },
  { value: 'PRONTO', label: 'Pronto' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'RECUSADO', label: 'Recusado' }
]

export function QuotesListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<DocumentFilter>('TODOS')
  const debouncedSearch = useDebounced(search)
  const { data, error } = useIpcQuery(
    () => call('documents:list', { search: debouncedSearch, filter }),
    [debouncedSearch, filter]
  )

  const items = data?.items ?? []
  const options = FILTERS.map((f) => ({ ...f, count: data?.counts[f.value] }))

  return (
    <>
      <PageHeader
        title="Orçamentos e OS"
        actions={
          <>
            <SearchInput
              label="Buscar"
              placeholder="Placa, cliente, número ou chave"
              value={search}
              onChange={setSearch}
            />
            <Button variant="primary" asChild>
              <Link to="/orcamentos/novo">
                <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
                Novo orçamento
              </Link>
            </Button>
          </>
        }
      />
      <Segmented label="Filtrar por status" options={options} value={filter} onChange={setFilter} />
      {error && <p className="text-brand-text">Não foi possível carregar a lista: {error}</p>}
      <Panel>
        <Table>
          <THead>
            <Tr>
              <Th>Nº</Th>
              <Th>Data</Th>
              <Th>Cliente</Th>
              <Th>Placa</Th>
              <Th>Veículo</Th>
              <Th>Chave</Th>
              <Th>Status</Th>
              <Th className="num">Total</Th>
            </Tr>
          </THead>
          <TBody>
            {items.map((item) => (
              <DocumentRow key={item.quoteId} item={item} onOpen={() => navigate(`/orcamentos/${item.quoteId}`)} />
            ))}
            {data && items.length === 0 && (
              <Tr>
                <Td colSpan={8}>
                  {search || filter !== 'TODOS' ? (
                    <EmptyState icon={SearchX} title="Nada encontrado">
                      Nenhum orçamento ou OS com esses critérios. Tente a placa sem hífen ou o número da chave.
                    </EmptyState>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="Nenhum orçamento ainda"
                      action={
                        <Button variant="primary" asChild>
                          <Link to="/orcamentos/novo">Criar o primeiro orçamento</Link>
                        </Button>
                      }
                    >
                      Os orçamentos e as ordens de serviço aparecem aqui.
                    </EmptyState>
                  )}
                </Td>
              </Tr>
            )}
          </TBody>
        </Table>
      </Panel>
    </>
  )
}

function DocumentRow({ item, onOpen }: { item: DocumentListItem; onOpen: () => void }) {
  return (
    <Tr clickable onClick={onOpen}>
      <Td>
        <span className="font-semibold tabular-nums">{item.quoteNumber}</span>
        {item.quoteVersion > 1 && <span className="ml-1 text-[12px] text-muted">v{item.quoteVersion}</span>}
        {item.workOrderNumber !== null && (
          <span className="block text-[12px] text-muted">OS {formatDocNumber(item.workOrderNumber)}</span>
        )}
      </Td>
      <Td className="tabular-nums">{formatDate(item.date)}</Td>
      <Td>{item.customerName}</Td>
      <Td>
        <Plate plate={item.plate} />
      </Td>
      <Td>{item.vehicleLabel}</Td>
      <Td>
        {item.keyTagNumber !== null ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-side px-1.5 py-px text-[12.5px] font-semibold text-side-strong">
            <KeyRound size={12} aria-hidden="true" />
            {formatKeyTag(item.keyTagNumber)}
          </span>
        ) : (
          <span className="text-line-strong">—</span>
        )}
      </Td>
      <Td>
        <StatusTag status={item.status} />
      </Td>
      <Td className="num font-semibold">{formatMoney(item.totalCents)}</Td>
    </Tr>
  )
}
