import { Car, UserPlus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatKm, formatPhone, parseInteger } from '@shared/format'
import type { VehicleInput } from '@shared/registry'
import { CustomerPicker } from '@/components/customer-picker'
import { CustomerFields } from '@/components/forms/customer-fields'
import { Field, FieldGrid } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { BrandLogo } from '@/components/vehicle/brand-logo'
import { BrandPicker, ColorPicker, ModelPicker } from '@/components/vehicle/vehicle-pickers'
import { call } from '@/lib/ipc'
import { emptyCustomer, emptyVehicle } from '@/lib/defaults'
import type { QuoteDraft } from '@/lib/quote-draft'

interface Props {
  draft: QuoteDraft
  update: (patch: Partial<QuoteDraft>) => void
  errors: Record<string, string>
  readOnly: boolean
  /** Orçamento já salvo: placa e cliente ficam fixos (o resto segue editável). */
  locked: boolean
}

const PLATE_LIKE = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/

/** Começa pela placa: carro conhecido traz o dono; carro e cliente novos são cadastrados aqui mesmo. */
export function CustomerVehiclePanel({ draft, update, errors, readOnly, locked }: Props) {
  async function lookupPlate(raw: string) {
    const plate = raw.replace(/[^a-z0-9]/gi, '').toUpperCase()
    if (plate === draft.vehicle?.plate || plate === draft.newVehicle?.plate) return
    if (!PLATE_LIKE.test(plate)) {
      update({ plate, vehicle: null, newVehicle: null })
      return
    }
    const found = await call('vehicles:get', { plate })
    if (!found) {
      update({ plate, vehicle: null, newVehicle: emptyVehicle(plate) })
      requestAnimationFrame(() => document.getElementById('q-brand')?.focus())
      return
    }
    update({
      plate,
      vehicle: { id: found.id, plate: found.plate, label: found.label, currentKm: found.currentKm ?? null, brand: found.brand ?? null },
      newVehicle: null,
      // Carro conhecido: sugere o dono atual, sem sobrescrever um cliente já escolhido.
      ...(!draft.customer && !draft.newCustomer && found.owner ? { customer: found.owner } : {}),
      ...(!draft.entryKm && found.currentKm ? { entryKm: formatKm(found.currentKm) } : {})
    })
  }

  const setNewVehicle = (patch: Partial<VehicleInput>) =>
    update({ newVehicle: { ...(draft.newVehicle ?? emptyVehicle(draft.plate)), ...patch } })

  return (
    <Panel>
      <PanelHeader>
        Cliente e veículo
        {draft.vehicle && (
          <Link to={`/veiculos/${draft.vehicle.plate}`} className="text-[13.5px] font-normal">
            Ver histórico do veículo
          </Link>
        )}
      </PanelHeader>
      <PanelBody className="flex flex-col gap-4">
        <FieldGrid>
          <Field label="Placa" htmlFor="q-plate" error={errors.plate ?? errors['vehicle.plate']}>
            <Input
              id="q-plate"
              autoFocus={!draft.id}
              disabled={locked}
              maxLength={8}
              className="font-plate text-[16px] tracking-wider uppercase"
              placeholder="ABC1D23"
              value={draft.plate}
              onChange={(e) => update({ plate: e.target.value.toUpperCase() })}
              onBlur={(e) => void lookupPlate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void lookupPlate(e.currentTarget.value)}
            />
          </Field>

          {!draft.newVehicle && (
            <Field label="Veículo" htmlFor="q-veh" className="col-span-2">
              <div
                id="q-veh"
                className="flex h-8 items-center gap-2 rounded-md border border-line-strong bg-hover px-2 text-ink"
              >
                {draft.vehicle ? (
                  <>
                    <BrandLogo brand={draft.vehicle.brand} size={22} />
                    <span className="truncate">{draft.vehicle.label || 'Sem modelo cadastrado'}</span>
                  </>
                ) : (
                  <span className="text-muted">Digite a placa e tecle Enter</span>
                )}
              </div>
            </Field>
          )}

          <Field label="KM de entrada" htmlFor="q-km">
            <Input
              id="q-km"
              inputMode="numeric"
              disabled={readOnly}
              value={draft.entryKm}
              onChange={(e) => {
                const km = parseInteger(e.target.value)
                update({ entryKm: km != null ? formatKm(km) : '' })
              }}
            />
          </Field>

          {!draft.newCustomer && (
            <>
              <Field label="Cliente" htmlFor="q-cli" error={errors.customer}>
                {locked ? (
                  <Input id="q-cli" disabled value={draft.customer?.name ?? ''} />
                ) : (
                  <CustomerPicker
                    id="q-cli"
                    value={draft.customer}
                    onChange={(customer) => update({ customer })}
                    onCreate={(name) => {
                      update({ customer: null, newCustomer: emptyCustomer(name) })
                      requestAnimationFrame(() => document.getElementById('q-zap')?.focus())
                    }}
                  />
                )}
              </Field>
              <Field label="WhatsApp" htmlFor="q-zap-ro">
                <Input id="q-zap-ro" disabled value={formatPhone(draft.customer?.whatsapp)} />
              </Field>
            </>
          )}
        </FieldGrid>

        {draft.newVehicle && !readOnly && (
          <NewBlock
            icon={Car}
            title={`Carro novo, placa ${draft.plate}`}
            onCancel={() => update({ newVehicle: null, plate: '' })}
            cancelLabel="Trocar placa"
          >
            <FieldGrid>
              <Field label="Marca" htmlFor="q-brand">
                <BrandPicker id="q-brand" value={draft.newVehicle.brand ?? ''} onChange={(brand) => setNewVehicle({ brand })} />
              </Field>
              <Field label="Modelo" htmlFor="q-model">
                <ModelPicker
                  id="q-model"
                  brand={draft.newVehicle.brand ?? ''}
                  value={draft.newVehicle.model ?? ''}
                  onChange={(model) => setNewVehicle({ model })}
                />
              </Field>
              <Field label="Ano" htmlFor="q-year" error={errors['vehicle.year']}>
                <Input
                  id="q-year"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="2020"
                  value={draft.newVehicle.year ?? ''}
                  onChange={(e) => setNewVehicle({ year: parseInteger(e.target.value) })}
                />
              </Field>
              <Field label="Cor" htmlFor="q-color">
                <ColorPicker id="q-color" value={draft.newVehicle.color ?? ''} onChange={(color) => setNewVehicle({ color })} />
              </Field>
            </FieldGrid>
          </NewBlock>
        )}

        {draft.newCustomer && !readOnly && (
          <NewBlock
            icon={UserPlus}
            title="Cliente novo"
            onCancel={() => update({ newCustomer: null })}
            cancelLabel="Escolher cliente existente"
          >
            <CustomerFields
              variant="compact"
              idPrefix="q"
              errorPrefix="customer."
              value={draft.newCustomer}
              onChange={(newCustomer) => update({ newCustomer })}
              errors={errors}
            />
          </NewBlock>
        )}
      </PanelBody>
    </Panel>
  )
}

function NewBlock(props: { icon: typeof Car; title: string; children: ReactNode; onCancel: () => void; cancelLabel: string }) {
  const { icon: Icon, title, children, onCancel, cancelLabel } = props
  return (
    <section className="rounded-lg border border-dashed border-line-strong bg-bg/50 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Icon size={16} className="text-muted" aria-hidden="true" />
          <span>
            <span className="font-semibold">{title}</span>
            <span className="text-[12.5px] text-muted"> (cadastrado ao salvar o orçamento)</span>
          </span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 border-0 bg-transparent p-0 text-[12.5px] text-brand-text hover:underline"
        >
          <X size={13} aria-hidden="true" />
          {cancelLabel}
        </button>
      </div>
      {children}
    </section>
  )
}
