import { formatKm, parseInteger } from '@shared/format'
import { FUELS, type VehicleInput } from '@shared/registry'
import { Field, FieldGrid } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BrandPicker, ColorPicker, ModelPicker } from '@/components/vehicle/vehicle-pickers'

interface VehicleFormProps {
  value: VehicleInput
  onChange: (value: VehicleInput) => void
  errors: Record<string, string>
  /** Esconde a placa (quando ela já foi digitada em outro campo). */
  hidePlate?: boolean
}


export function VehicleForm({ value, onChange, errors, hidePlate }: VehicleFormProps) {
  const set = <K extends keyof VehicleInput>(key: K, v: VehicleInput[K]) => onChange({ ...value, [key]: v })

  return (
    <FieldGrid>
      {!hidePlate && (
        <Field label="Placa" htmlFor="v-plate" error={errors.plate}>
          <Input
            id="v-plate"
            className="font-plate text-[16px] tracking-wider uppercase"
            maxLength={8}
            value={value.plate}
            onChange={(e) => set('plate', e.target.value.toUpperCase())}
          />
        </Field>
      )}
      <Field label="Marca" htmlFor="v-brand">
        <BrandPicker id="v-brand" value={value.brand ?? ''} onChange={(brand) => set('brand', brand)} />
      </Field>
      <Field label="Modelo" htmlFor="v-model">
        <ModelPicker id="v-model" brand={value.brand ?? ''} value={value.model ?? ''} onChange={(model) => set('model', model)} />
      </Field>
      <Field label="Ano" htmlFor="v-year" error={errors.year}>
        <Input
          id="v-year"
          inputMode="numeric"
          maxLength={4}
          value={value.year ?? ''}
          onChange={(e) => set('year', parseInteger(e.target.value))}
        />
      </Field>
      <Field label="Cor" htmlFor="v-color">
        <ColorPicker id="v-color" value={value.color ?? ''} onChange={(color) => set('color', color)} />
      </Field>
      <Field label="Combustível" htmlFor="v-fuel">
        <Select id="v-fuel" value={value.fuel ?? ''} onChange={(e) => set('fuel', e.target.value)}>
          <option value="">—</option>
          {FUELS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </Select>
      </Field>
      <Field label="KM atual" htmlFor="v-km" error={errors.currentKm}>
        <Input
          id="v-km"
          inputMode="numeric"
          value={value.currentKm != null ? formatKm(value.currentKm) : ''}
          onChange={(e) => set('currentKm', parseInteger(e.target.value))}
        />
      </Field>
      <Field label="Chassi" htmlFor="v-vin">
        <Input id="v-vin" maxLength={17} value={value.vin ?? ''} onChange={(e) => set('vin', e.target.value.toUpperCase())} />
      </Field>
    </FieldGrid>
  )
}
