import { Car, Plus, Save } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDocument, formatPhone } from '@shared/format'
import type { CustomerDetail, CustomerInput } from '@shared/registry'
import { Flash, FormError } from '@/components/flash'
import { CustomerFields } from '@/components/forms/customer-fields'
import { CustomerPreview } from '@/components/forms/customer-preview'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { Button } from '@/components/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { useFlash } from '@/hooks/use-flash'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { useSaveShortcut } from '@/hooks/use-shortcuts'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'
import { emptyCustomer } from '@/lib/defaults'

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
        title={initial ? 'Cliente' : 'Novo cliente'}
        actions={
          <>
            <Flash message={flash} />
            <Button variant="primary" onClick={save} disabled={submit.busy} title="Ctrl+S">
              <Save size={15} aria-hidden="true" />
              {initial ? 'Salvar' : 'Cadastrar cliente'}
            </Button>
          </>
        }
      />
      <FormError message={submit.error} />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[1080px]:grid-cols-1">
        <Panel>
          <PanelHeader>Dados do cliente</PanelHeader>
          <PanelBody className="p-5">
            <CustomerFields value={value} onChange={setValue} errors={submit.fields} autoFocusName={!initial} />
          </PanelBody>
        </Panel>

        <div className="flex flex-col">
          <Panel>
            <PanelBody className="p-5">
              <CustomerPreview value={value} />
              <p className="mt-4 mb-0 text-[12.5px] text-muted">
                {initial
                  ? 'É assim que o cliente aparece nas listas e no orçamento.'
                  : 'Só o nome é obrigatório. WhatsApp e CPF/CNPJ ajudam a achar o cliente depois e a mandar o orçamento.'}
              </p>
            </PanelBody>
          </Panel>

          {initial ? (
            <Panel>
              <PanelHeader>
                Veículos
                <Button asChild>
                  <Link to={`/veiculos/novo?dono=${initial.id}`}>
                    <Plus size={15} aria-hidden="true" />
                    Adicionar
                  </Link>
                </Button>
              </PanelHeader>
              {initial.vehicles.length === 0 ? (
                <p className="m-0 px-4 py-6 text-center text-[13px] text-muted">Nenhum veículo ainda.</p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {initial.vehicles.map((v) => (
                    <li key={v.id} className="border-b border-line last:border-b-0">
                      <Link
                        to={`/veiculos/${v.plate}`}
                        className="flex items-center gap-3 px-4 py-2.5 text-ink hover:bg-hover hover:no-underline"
                      >
                        <Plate plate={v.plate} />
                        <span className="truncate">{v.label || 'Sem modelo'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : (
            <Tip icon={<Car size={16} aria-hidden="true" />}>
              Depois de cadastrar, adicione os carros do cliente. Ou cadastre tudo de uma vez direto no orçamento, a
              partir da placa.
            </Tip>
          )}
        </div>
      </div>
    </>
  )
}

function Tip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-dashed border-line-strong px-4 py-3 text-[12.5px] text-muted">
      <span className="mt-0.5 flex-none">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
