import { Car, Plus, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDate, formatKm } from '@shared/format'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useDebounced, useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'

export function VehiclesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)
  const { data, error } = useIpcQuery(() => call('vehicles:list', { search: debounced }), [debounced])
  const vehicles = data ?? []

  return (
    <>
      <PageHeader
        title="Veículos"
        actions={
          <>
            <SearchInput label="Buscar veículo" placeholder="Placa, modelo ou dono" value={search} onChange={setSearch} />
            <Button variant="primary" asChild>
              <Link to="/veiculos/novo">
                <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
                Novo veículo
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
              <Th>Placa</Th>
              <Th>Veículo</Th>
              <Th>Dono atual</Th>
              <Th className="num">KM atual</Th>
              <Th>Último serviço</Th>
            </Tr>
          </THead>
          <TBody>
            {vehicles.map((v) => (
              <Tr key={v.id} clickable onClick={() => navigate(`/veiculos/${v.plate}`)}>
                <Td>
                  <Plate plate={v.plate} />
                </Td>
                <Td>{v.label}</Td>
                <Td>{v.ownerName ?? <span className="text-muted">Sem dono</span>}</Td>
                <Td className="num">{v.currentKm != null ? formatKm(v.currentKm) : '—'}</Td>
                <Td className="tabular-nums">{v.lastServiceAt ? formatDate(v.lastServiceAt) : '—'}</Td>
              </Tr>
            ))}
            {data && vehicles.length === 0 && (
              <Tr>
                <Td colSpan={5}>
                  {search ? (
                    <EmptyState icon={SearchX} title="Nenhum veículo encontrado" />
                  ) : (
                    <EmptyState icon={Car} title="Nenhum veículo cadastrado">
                      Cada carro que passa pela oficina fica aqui, com o histórico de serviços e as garantias.
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
