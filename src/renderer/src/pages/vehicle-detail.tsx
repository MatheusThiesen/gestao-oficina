import { FilePlus2, Pencil, Save, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDate, formatKm, formatMoney, formatPhone } from '@shared/format'
import type { VehicleDetail, VehicleInput } from '@shared/registry'
import { Flash, FormError } from '@/components/flash'
import { OwnerField } from '@/components/forms/owner-field'
import { VehicleForm } from '@/components/forms/vehicle-form'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { StatusTag } from '@/components/status-tag'
import { BrandLogo } from '@/components/vehicle/brand-logo'
import { Button } from '@/components/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { useFlash } from '@/hooks/use-flash'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { useSaveShortcut } from '@/hooks/use-shortcuts'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'

export function VehicleDetailPage() {
  const { plate = '' } = useParams()
  const { data, error, reload } = useIpcQuery(() => call('vehicles:get', { plate }), [plate])

  if (error) return <FormError message={error} />
  if (data === undefined) return null
  if (data === null) return <FormError message={`Veículo ${plate} não encontrado.`} />
  return <VehicleView key={data.id} vehicle={data} onSaved={reload} />
}

function VehicleView({ vehicle, onSaved }: { vehicle: VehicleDetail; onSaved: () => void }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<VehicleInput>(vehicle)
  const submit = useSubmit()
  const [flash, showFlash] = useFlash()

  async function save() {
    if (!editing) return
    const result = await submit.run(() => call('vehicles:save', form))
    if (!result) return
    setEditing(false)
    showFlash('Veículo salvo.')
    if (result.plate !== vehicle.plate) navigate(`/veiculos/${result.plate}`, { replace: true })
    else onSaved()
  }
  useSaveShortcut(save)

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Veículos', to: '/veiculos' }, { label: vehicle.plate }]}
        title={
          <span className="flex items-center gap-3 font-sans text-[22px] not-italic font-semibold">
            <Plate plate={vehicle.plate} size="lg" />
            <BrandLogo brand={vehicle.brand} size={40} />
            {vehicle.label}
          </span>
        }
        actions={
          editing ? (
            <>
              <Button
                onClick={() => {
                  setEditing(false)
                  setForm(vehicle)
                  submit.clear()
                }}
              >
                <X size={15} aria-hidden="true" />
                Cancelar
              </Button>
              <Button variant="primary" onClick={save} disabled={submit.busy}>
                <Save size={15} aria-hidden="true" />
                Salvar
              </Button>
            </>
          ) : (
            <>
              <Flash message={flash} />
              <Button onClick={() => setEditing(true)}>
                <Pencil size={15} aria-hidden="true" />
                Editar
              </Button>
              <Button variant="primary" asChild>
                <Link to={`/orcamentos/novo?placa=${vehicle.plate}`}>
                  <FilePlus2 size={15} aria-hidden="true" />
                  Novo orçamento
                </Link>
              </Button>
            </>
          )
        }
      />
      <FormError message={submit.error} />

      {editing && (
        <Panel>
          <PanelHeader>Editar veículo</PanelHeader>
          <PanelBody className="flex flex-col gap-4">
            <VehicleForm value={form} onChange={setForm} errors={submit.fields} />
            <OwnerField
              initial={vehicle.owner}
              onChange={(ownerId) => setForm((f) => ({ ...f, ownerId }))}
              hint="Ao trocar o dono, o histórico do carro continua aqui."
            />
          </PanelBody>
        </Panel>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[980px]:grid-cols-1">
        <Panel>
          <PanelHeader>Histórico de serviços</PanelHeader>
          <Table className="min-w-[640px]">
            <THead>
              <Tr>
                <Th>Data</Th>
                <Th className="num">KM</Th>
                <Th>Documento</Th>
                <Th>Serviços</Th>
                <Th>Garantia</Th>
                <Th className="num">Total</Th>
              </Tr>
            </THead>
            <TBody>
              {vehicle.history.map((h) => (
                <Tr key={h.quoteId} clickable onClick={() => navigate(`/orcamentos/${h.quoteId}`)}>
                  <Td className="tabular-nums">{formatDate(h.date)}</Td>
                  <Td className="num">{h.km != null ? formatKm(h.km) : '—'}</Td>
                  <Td className="whitespace-nowrap">{h.document}</Td>
                  <Td className="max-w-[260px] truncate" title={h.services}>
                    {h.services}
                  </Td>
                  <Td>
                    {h.status !== 'ENTREGUE' ? (
                      <StatusTag status={h.status} />
                    ) : h.withoutWarranty ? (
                      <span className="tag t-entregue">Sem garantia</span>
                    ) : h.warrantyUntil && new Date(h.warrantyUntil) >= new Date() ? (
                      <span className="tag t-aprovado">Até {formatDate(h.warrantyUntil)}</span>
                    ) : (
                      <span className="tag t-entregue">Encerrada</span>
                    )}
                  </Td>
                  <Td className="num">{formatMoney(h.totalCents)}</Td>
                </Tr>
              ))}
              {vehicle.history.length === 0 && (
                <Tr>
                  <Td colSpan={6} className="py-6 text-center text-muted">
                    Nenhum serviço ainda.
                  </Td>
                </Tr>
              )}
            </TBody>
          </Table>
        </Panel>

        <div>
          <Panel>
            <PanelHeader>Dados</PanelHeader>
            <PanelBody>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 [&_dd]:m-0 [&_dd]:text-right [&_dt]:text-muted">
                <dt>Dono atual</dt>
                <dd>{vehicle.owner ? <Link to={`/clientes/${vehicle.owner.id}`}>{vehicle.owner.name}</Link> : '—'}</dd>
                <dt>WhatsApp</dt>
                <dd>{formatPhone(vehicle.owner?.whatsapp) || '—'}</dd>
                <dt>Cor / combustível</dt>
                <dd>{[vehicle.color, vehicle.fuel].filter(Boolean).join(', ') || '—'}</dd>
                <dt>Chassi</dt>
                <dd className="font-mono text-[12.5px]">{vehicle.vin || '—'}</dd>
                <dt>KM atual</dt>
                <dd>{vehicle.currentKm != null ? formatKm(vehicle.currentKm) : '—'}</dd>
                <dt>Serviços</dt>
                <dd>
                  {vehicle.stats.workOrders} OS, {formatMoney(vehicle.stats.totalCents)}
                </dd>
              </dl>
              {vehicle.previousOwners.length > 0 && (
                <p className="mt-3 mb-0 text-[12px] text-muted">
                  Donos anteriores:{' '}
                  {vehicle.previousOwners.map((o) => `${o.name} (até ${formatDate(o.endedAt)})`).join(', ')}
                </p>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>Próxima troca de óleo</PanelHeader>
            <PanelBody>
              {vehicle.oilChange ? (
                <>
                  <div className="text-[18px] font-semibold">
                    {formatKm(vehicle.oilChange.nextKm)} km ou {formatDate(vehicle.oilChange.nextAt)}
                  </div>
                  <p className="mt-1 mb-0 text-[12.5px] text-muted">
                    {vehicle.oilChange.kmRemaining != null &&
                      (vehicle.oilChange.kmRemaining >= 0
                        ? `Faltam ${formatKm(vehicle.oilChange.kmRemaining)} km. `
                        : `Passou ${formatKm(-vehicle.oilChange.kmRemaining)} km. `)}
                    Última troca: {formatDate(vehicle.oilChange.lastAt)}, {formatKm(vehicle.oilChange.lastKm)} km.
                  </p>
                </>
              ) : (
                <p className="m-0 text-muted">Nenhuma troca de óleo registrada aqui.</p>
              )}
            </PanelBody>
          </Panel>

          {vehicle.warranties.length > 0 && (
            <Panel>
              <PanelHeader>Garantias vigentes</PanelHeader>
              <ul className="m-0 list-none p-0">
                {vehicle.warranties.map((w, i) => (
                  <li key={i} className="flex justify-between gap-3 border-b border-line px-4 py-2 last:border-b-0">
                    <span>{w.description}</span>
                    <span className="whitespace-nowrap text-muted">até {formatDate(w.until)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
