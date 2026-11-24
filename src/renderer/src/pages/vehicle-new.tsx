import { Save } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { VehicleInput } from '@shared/registry'
import { FormError } from '@/components/flash'
import { OwnerField } from '@/components/forms/owner-field'
import { VehicleForm } from '@/components/forms/vehicle-form'
import { emptyVehicle } from '@/lib/defaults'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { useSaveShortcut } from '@/hooks/use-shortcuts'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'

export function VehicleNewPage() {
  const [params] = useSearchParams()
  const ownerId = Number(params.get('dono')) || null
  const { data: owner } = useIpcQuery(
    () => (ownerId ? call('customers:get', { id: ownerId }) : Promise.resolve(null)),
    [ownerId]
  )
  if (ownerId && owner === undefined) return null
  return <VehicleNew owner={owner ? { id: owner.id, name: owner.name, whatsapp: owner.whatsapp ?? null } : null} />
}

function VehicleNew({ owner }: { owner: { id: number; name: string; whatsapp: string | null } | null }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<VehicleInput>({ ...emptyVehicle(), ownerId: owner?.id ?? null })
  const submit = useSubmit()

  async function save() {
    const result = await submit.run(() => call('vehicles:save', form))
    if (result) navigate(`/veiculos/${result.plate}`, { replace: true })
  }
  useSaveShortcut(save)

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Veículos', to: '/veiculos' }, { label: 'Novo' }]}
        title="Novo veículo"
        actions={
          <Button variant="primary" onClick={save} disabled={submit.busy}>
            <Save size={15} aria-hidden="true" />
            Salvar
          </Button>
        }
      />
      <FormError message={submit.error} />
      <Panel className="max-w-[860px]">
        <PanelHeader>Dados do veículo</PanelHeader>
        <PanelBody className="flex flex-col gap-4">
          <VehicleForm value={form} onChange={setForm} errors={submit.fields} />
          <OwnerField initial={owner} onChange={(ownerId) => setForm((f) => ({ ...f, ownerId }))} />
        </PanelBody>
      </Panel>
    </>
  )
}
