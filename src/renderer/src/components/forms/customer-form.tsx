import { formatDocument, formatPhone } from '@shared/format'
import type { CustomerInput, CustomerType } from '@shared/registry'
import { Field, FieldGrid } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface CustomerFormProps {
  value: CustomerInput
  onChange: (value: CustomerInput) => void
  errors: Record<string, string>
  compact?: boolean
}


export function CustomerForm({ value, onChange, errors, compact }: CustomerFormProps) {
  const set = <K extends keyof CustomerInput>(key: K, v: CustomerInput[K]) => onChange({ ...value, [key]: v })
  const isPj = value.type === 'PJ'

  return (
    <FieldGrid>
      <Field label="Tipo" htmlFor="c-type">
        <Select id="c-type" value={value.type} onChange={(e) => set('type', e.target.value as CustomerType)}>
          <option value="PF">Pessoa física</option>
          <option value="PJ">Empresa</option>
        </Select>
      </Field>
      <Field label={isPj ? 'Razão social' : 'Nome'} htmlFor="c-name" error={errors.name} className="col-span-2">
        <Input id="c-name" autoFocus value={value.name} onChange={(e) => set('name', e.target.value)} />
      </Field>
      <Field label={isPj ? 'CNPJ' : 'CPF'} htmlFor="c-doc" error={errors.document}>
        <Input
          id="c-doc"
          value={value.document ?? ''}
          placeholder={isPj ? '00.000.000/0000-00' : '000.000.000-00'}
          onChange={(e) => set('document', e.target.value)}
          onBlur={(e) => set('document', formatDocument(e.target.value))}
        />
      </Field>
      <Field label="WhatsApp" htmlFor="c-zap" error={errors.whatsapp}>
        <Input
          id="c-zap"
          value={value.whatsapp ?? ''}
          placeholder="(00) 00000-0000"
          onChange={(e) => set('whatsapp', e.target.value)}
          onBlur={(e) => set('whatsapp', formatPhone(e.target.value))}
        />
      </Field>
      {!compact && (
        <>
          <Field label="E-mail" htmlFor="c-mail" error={errors.email}>
            <Input id="c-mail" type="email" value={value.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Endereço" htmlFor="c-addr" className="col-span-full">
            <Input id="c-addr" value={value.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Observações" htmlFor="c-notes" className="col-span-full">
            <Textarea id="c-notes" rows={2} value={value.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </>
      )}
    </FieldGrid>
  )
}
