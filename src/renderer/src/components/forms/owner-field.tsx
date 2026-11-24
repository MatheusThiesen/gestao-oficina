import { useState } from 'react'
import { CustomerPicker, type PickedCustomer } from '@/components/customer-picker'
import { Field } from '@/components/ui/field'

interface OwnerFieldProps {
  initial: PickedCustomer | null
  onChange: (ownerId: number | null) => void
  hint?: string
}

/** Escolha do dono do veículo. Trocar o dono preserva o histórico do carro. */
export function OwnerField({ initial, onChange, hint }: OwnerFieldProps) {
  const [owner, setOwner] = useState<PickedCustomer | null>(initial)
  return (
    <Field label="Dono" htmlFor="v-owner" className="max-w-[420px]">
      <CustomerPicker
        id="v-owner"
        value={owner}
        onChange={(c) => {
          setOwner(c)
          onChange(c?.id ?? null)
        }}
      />
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </Field>
  )
}
