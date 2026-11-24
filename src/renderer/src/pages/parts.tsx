import { Plus, Receipt } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'

export function PartsPage() {
  const [search, setSearch] = useState('')
  return (
    <>
      <PageHeader
        title="Peças e compras"
        actions={
          <>
            <SearchInput label="Buscar compra" placeholder="Buscar peça, fornecedor ou NF" value={search} onChange={setSearch} />
            <Button variant="primary" disabled>
              <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
              Registrar compra
            </Button>
          </>
        }
      />
      <Panel>
        <PanelHeader>Compras recentes</PanelHeader>
        <Table className="min-w-[760px]">
          <THead>
            <Tr>
              <Th>Data</Th>
              <Th>Fornecedor</Th>
              <Th>NF</Th>
              <Th>Peça</Th>
              <Th className="num">Qtd</Th>
              <Th className="num">Custo un.</Th>
              <Th>Usada na</Th>
            </Tr>
          </THead>
          <TBody>
            <Tr>
              <Td colSpan={7}>
                <EmptyState icon={Receipt} title="Nenhuma compra registrada">
                  Registre a nota do fornecedor para guardar o custo de cada peça e em qual OS ela foi usada.
                </EmptyState>
              </Td>
            </Tr>
          </TBody>
        </Table>
      </Panel>
    </>
  )
}
