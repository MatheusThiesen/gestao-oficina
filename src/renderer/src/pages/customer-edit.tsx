import { Car, Plus, Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDocument, formatPhone } from '@shared/format'
import type { CustomerDetail, CustomerInput } from '@shared/registry'
import { Flash, FormError } from '@/components/flash'
import { CustomerForm } from '@/components/forms/customer-form'
import { emptyCustomer } from '@/lib/defaults'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { useFlash } from '@/hooks/use-flash'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { useSaveShortcut } from '@/hooks/use-shortcuts'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'

export function CustomerEditPage() {
  const { id } = useParams()
  const customerId = id && id !== 'novo' ? Number(id) : null
  const { data, error } = useIpcQuery<CustomerDetail | null>(
    () => (customerId ? call('customers:get', { id: customerId }) : Promise.resolve(null)),
    [customerId]
  )

  if (error) return <FormError message={error} />
  if (customerId && !data) return null
  // A key força remontar o formulário quando troca de cliente.
  return <CustomerEditor key={customerId ?? 'novo'} initial={data ?? null} />
}

function CustomerEditor({ initial }: { initial: CustomerDetail | null }) {
  const navigate = useNavigate()
  const [value, setValue] = useState<CustomerInput>(() =>
    initial
      ? { ...initial, document: formatDocument(initial.document), whatsapp: formatPhone(initial.whatsapp) }
      : emptyCustomer()
  )
  const submit = useSubmit()
  const [flash, showFlash] = useFlash()

  async function save() {
    const result = await submit.run(() => call('customers:save', value))
    if (!result) return
    showFlash('Cliente salvo.')
    if (!initial) navigate(`/clientes/${result.id}`, { replace: true })
  }
  useSaveShortcut(save)

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Clientes', to: '/clientes' }, { label: initial ? initial.name : 'Novo' }]}
        title={initial ? initial.name : 'Novo cliente'}
        actions={
          <>
            <Flash message={flash} />
            <Button variant="primary" onClick={save} disabled={submit.busy}>
              <Save size={15} aria-hidden="true" />
              Salvar
            </Button>
          </>
        }
      />
      <FormError message={submit.error} />
      <Panel className="max-w-[860px]">
        <PanelHeader>Dados</PanelHeader>
        <PanelBody>
          <CustomerForm value={value} onChange={setValue} errors={submit.fields} />
        </PanelBody>
      </Panel>

      {initial && (
        <Panel className="max-w-[860px]">
          <PanelHeader>
            Veículos
            <Button asChild>
              <Link to={`/veiculos/novo?dono=${initial.id}`}>
                <Plus size={15} aria-hidden="true" />
                Adicionar veículo
              </Link>
            </Button>
          </PanelHeader>
          {initial.vehicles.length === 0 ? (
            <EmptyState icon={Car} title="Nenhum veículo" />
          ) : (
            <ul className="m-0 list-none p-0">
              {initial.vehicles.map((v) => (
                <li key={v.id} className="border-b border-line last:border-b-0">
                  <Link
                    to={`/veiculos/${v.plate}`}
                    className="flex items-center gap-3 px-4 py-2.5 text-ink hover:bg-hover hover:no-underline"
                  >
                    <Plate plate={v.plate} />
                    {v.label || 'Sem modelo'}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  )
}
