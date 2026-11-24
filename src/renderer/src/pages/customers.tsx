import { Plus, SearchX, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDate, formatMoney, formatPhone, maskDocument } from '@shared/format'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useDebounced, useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'

export function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)
  const { data, error } = useIpcQuery(() => call('customers:list', { search: debounced }), [debounced])
  const customers = data ?? []

  return (
    <>
      <PageHeader
        title="Clientes"
        actions={
          <>
            <SearchInput label="Buscar cliente" placeholder="Nome, telefone, CPF ou placa" value={search} onChange={setSearch} />
            <Button variant="primary" asChild>
              <Link to="/clientes/novo">
                <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
                Novo cliente
              </Link>
            </Button>
          </>
        }
      />
      {error && <p className="text-brand-text">{error}</p>}
      <Panel>
        <Table>
          <THead>
            <Tr>
              <Th>Nome</Th>
              <Th>WhatsApp</Th>
              <Th>CPF/CNPJ</Th>
              <Th>Veículos</Th>
              <Th>Último serviço</Th>
              <Th className="num">Total gasto</Th>
            </Tr>
          </THead>
          <TBody>
            {customers.map((c) => (
              <Tr key={c.id} clickable onClick={() => navigate(`/clientes/${c.id}`)}>
                <Td className="font-semibold">{c.name}</Td>
                <Td className="tabular-nums">{formatPhone(c.whatsapp)}</Td>
                <Td className="tabular-nums text-muted">{maskDocument(c.document)}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    {c.vehicles.map((v) => (
                      <Plate key={v.id} plate={v.plate} />
                    ))}
                  </span>
                </Td>
                <Td className="tabular-nums">{c.lastServiceAt ? formatDate(c.lastServiceAt) : '—'}</Td>
                <Td className="num">{formatMoney(c.totalSpentCents)}</Td>
              </Tr>
            ))}
            {data && customers.length === 0 && (
              <Tr>
                <Td colSpan={6}>
                  {search ? (
                    <EmptyState icon={SearchX} title="Nenhum cliente encontrado" />
                  ) : (
                    <EmptyState icon={Users} title="Nenhum cliente cadastrado">
                      Os clientes também são cadastrados ao criar um orçamento.
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
