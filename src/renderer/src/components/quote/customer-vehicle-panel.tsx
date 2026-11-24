import { Link } from 'react-router-dom'
import { formatKm, formatPhone, parseInteger } from '@shared/format'
import type { CustomerInput, VehicleInput } from '@shared/registry'
import { CustomerPicker } from '@/components/customer-picker'
import { Field, FieldGrid } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
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

/** Começa pela placa: carro conhecido traz o dono; carro novo é cadastrado aqui mesmo. */
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
      return
    }
    update({
      plate,
      vehicle: { id: found.id, plate: found.plate, label: found.label, currentKm: found.currentKm ?? null },
      newVehicle: null,
      // Carro conhecido: sugere o dono atual, sem sobrescrever um cliente já escolhido.
      ...(!draft.customer && !draft.newCustomer && found.owner ? { customer: found.owner } : {}),
      ...(!draft.entryKm && found.currentKm ? { entryKm: formatKm(found.currentKm) } : {})
    })
  }

  const setNewVehicle = (patch: Partial<VehicleInput>) =>
    update({ newVehicle: { ...(draft.newVehicle ?? emptyVehicle(draft.plate)), ...patch } })
  const setNewCustomer = (patch: Partial<CustomerInput>) =>
    update({ newCustomer: { ...(draft.newCustomer ?? emptyCustomer()), ...patch } })

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
      <PanelBody>
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

          {draft.newVehicle ? (
            <>
              <Field label="Marca" htmlFor="q-brand">
                <Input id="q-brand" value={draft.newVehicle.brand ?? ''} onChange={(e) => setNewVehicle({ brand: e.target.value })} />
              </Field>
              <Field label="Modelo" htmlFor="q-model">
                <Input id="q-model" value={draft.newVehicle.model ?? ''} onChange={(e) => setNewVehicle({ model: e.target.value })} />
              </Field>
              <Field label="Ano" htmlFor="q-year" error={errors['vehicle.year']}>
                <Input
                  id="q-year"
                  inputMode="numeric"
                  maxLength={4}
                  value={draft.newVehicle.year ?? ''}
                  onChange={(e) => setNewVehicle({ year: parseInteger(e.target.value) })}
                />
              </Field>
            </>
          ) : (
            <Field label="Veículo" htmlFor="q-veh">
              <Input id="q-veh" disabled value={draft.vehicle?.label ?? ''} placeholder="Digite a placa" />
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

          <Field label="Cliente" htmlFor="q-cli" error={errors.customer ?? errors['customer.name']}>
            {locked ? (
              <Input id="q-cli" disabled value={draft.customer?.name ?? ''} />
            ) : draft.newCustomer ? (
              <Input id="q-cli" value={draft.newCustomer.name} onChange={(e) => setNewCustomer({ name: e.target.value })} />
            ) : (
              <CustomerPicker
                id="q-cli"
                value={draft.customer}
                onChange={(customer) => update({ customer })}
                onCreate={(name) => update({ customer: null, newCustomer: emptyCustomer(name) })}
              />
            )}
          </Field>

          <Field label="WhatsApp" htmlFor="q-zap" error={errors['customer.whatsapp']}>
            {draft.newCustomer ? (
              <Input
                id="q-zap"
                placeholder="(00) 00000-0000"
                value={draft.newCustomer.whatsapp ?? ''}
                onChange={(e) => setNewCustomer({ whatsapp: e.target.value })}
                onBlur={(e) => setNewCustomer({ whatsapp: formatPhone(e.target.value) })}
              />
            ) : (
              <Input id="q-zap" disabled value={formatPhone(draft.customer?.whatsapp)} />
            )}
          </Field>

          {draft.newCustomer && (
            <Field label="CPF/CNPJ (opcional)" htmlFor="q-doc" error={errors['customer.document']}>
              <Input
                id="q-doc"
                value={draft.newCustomer.document ?? ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
                  setNewCustomer({ document: e.target.value, type: digits.length > 11 ? 'PJ' : 'PF' })
                }}
              />
            </Field>
          )}
        </FieldGrid>

        {(draft.newVehicle || draft.newCustomer) && !readOnly && (
          <p className="mt-3 mb-0 text-[12.5px] text-muted">
            {[draft.newVehicle && `Placa ${draft.plate} nova`, draft.newCustomer && 'cliente novo']
              .filter(Boolean)
              .join(' e ')}
            : o cadastro é feito ao salvar o orçamento.
            {draft.newCustomer && (
              <button
                type="button"
                className="ml-2 border-0 bg-transparent p-0 text-brand-text hover:underline"
                onClick={() => update({ newCustomer: null })}
              >
                Escolher cliente existente
              </button>
            )}
          </p>
        )}
      </PanelBody>
    </Panel>
  )
}
