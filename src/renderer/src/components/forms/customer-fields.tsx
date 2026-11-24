import { Building2, IdCard, Mail, MapPin, MessageCircle, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { maskDocumentInput, maskPhoneInput } from '@shared/format'
import type { CustomerInput, CustomerType } from '@shared/registry'
import { Field } from '@/components/ui/field'
import { FieldCheck, IconInput } from '@/components/ui/icon-input'
import { Textarea } from '@/components/ui/textarea'
import { documentCheck, phoneCheck } from '@/lib/customer-checks'
import { cn } from '@/lib/utils'

interface CustomerFieldsProps {
  value: CustomerInput
  onChange: (value: CustomerInput) => void
  errors: Record<string, string>
  /** "full": cadastro completo; "compact": só o essencial (dentro do orçamento). */
  variant?: 'full' | 'compact'
  /** Prefixo dos erros vindos do processo principal (no orçamento: "customer."). */
  errorPrefix?: string
  idPrefix?: string
  autoFocusName?: boolean
}

/** Campos do cliente com ícones, máscaras e conferência dentro do campo. */
export function CustomerFields({
  value,
  onChange,
  errors,
  variant = 'full',
  errorPrefix = '',
  idPrefix = 'c',
  autoFocusName
}: CustomerFieldsProps) {
  const set = (patch: Partial<CustomerInput>) => onChange({ ...value, ...patch })
  const err = (k: string) => errors[errorPrefix + k]
  const isPj = value.type === 'PJ'
  const doc = documentCheck(value.document)
  const phone = phoneCheck(value.whatsapp)
  const full = variant === 'full'

  return (
    <div className="flex flex-col gap-4">
      <TypeToggle value={value.type} onChange={(type) => set({ type })} />

      <div className={cn('grid gap-3', full ? 'grid-cols-2' : 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]', 'max-[900px]:grid-cols-1')}>
        <Field label={isPj ? 'Razão social ou nome fantasia' : 'Nome completo'} htmlFor={`${idPrefix}-name`} error={err('name')} className={full ? 'col-span-2 max-[900px]:col-span-1' : ''}>
          <IconInput
            id={`${idPrefix}-name`}
            icon={isPj ? Building2 : User}
            autoFocus={autoFocusName}
            placeholder={isPj ? 'Ex.: Transportes Sul Ltda' : 'Ex.: Maria da Silva'}
            value={value.name}
            invalid={!!err('name')}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>

        <Field label="WhatsApp" htmlFor={`${idPrefix}-zap`} error={err('whatsapp')}>
          <IconInput
            id={`${idPrefix}-zap`}
            icon={MessageCircle}
            inputMode="tel"
            placeholder="(51) 99999-9999"
            value={value.whatsapp ?? ''}
            invalid={!!err('whatsapp') || phone?.ok === false}
            trailing={phone && <FieldCheck {...phone} />}
            onChange={(e) => set({ whatsapp: maskPhoneInput(e.target.value) })}
          />
          {full && <Hint>Usado para mandar o orçamento.</Hint>}
        </Field>

        <Field label={`${isPj ? 'CNPJ' : 'CPF'} (opcional)`} htmlFor={`${idPrefix}-doc`} error={err('document')}>
          <IconInput
            id={`${idPrefix}-doc`}
            icon={IdCard}
            inputMode="numeric"
            placeholder={isPj ? '00.000.000/0000-00' : '000.000.000-00'}
            value={value.document ?? ''}
            invalid={!!err('document') || doc?.ok === false}
            trailing={doc && <FieldCheck {...doc} />}
            onChange={(e) => {
              const document = maskDocumentInput(e.target.value)
              const digits = document.replace(/\D/g, '').length
              // O documento define o tipo quando fica claro (12+ dígitos = CNPJ).
              set({ document, ...(digits > 11 ? { type: 'PJ' as const } : digits === 11 ? { type: 'PF' as const } : {}) })
            }}
          />
        </Field>

        {full && (
          <Field label="E-mail (opcional)" htmlFor={`${idPrefix}-mail`} error={err('email')} className="col-span-2 max-[900px]:col-span-1">
            <IconInput
              id={`${idPrefix}-mail`}
              icon={Mail}
              type="email"
              placeholder="nome@exemplo.com"
              value={value.email ?? ''}
              invalid={!!err('email')}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>
        )}
      </div>

      {full && (
        <div className="grid gap-3">
          <Field label="Endereço (opcional)" htmlFor={`${idPrefix}-addr`}>
            <IconInput
              id={`${idPrefix}-addr`}
              icon={MapPin}
              placeholder="Rua, número, bairro, cidade"
              value={value.address ?? ''}
              onChange={(e) => set({ address: e.target.value })}
            />
          </Field>
          <Field label="Observações (opcional)" htmlFor={`${idPrefix}-notes`}>
            <Textarea
              id={`${idPrefix}-notes`}
              rows={3}
              placeholder="Ex.: prefere contato à tarde, motorista da frota…"
              value={value.notes ?? ''}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function TypeToggle({ value, onChange }: { value: CustomerType; onChange: (t: CustomerType) => void }) {
  const options: { value: CustomerType; label: string; icon: typeof User }[] = [
    { value: 'PF', label: 'Pessoa física', icon: User },
    { value: 'PJ', label: 'Empresa', icon: Building2 }
  ]
  return (
    <div role="radiogroup" aria-label="Tipo de cliente" className="flex w-max gap-1 rounded-lg border border-line bg-white p-1">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md border-0 px-3.5 text-[13.5px]',
              on ? 'bg-side font-semibold text-side-strong' : 'bg-transparent text-ink hover:bg-hover'
            )}
          >
            <o.icon size={15} aria-hidden="true" />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <span className="text-[12px] text-muted">{children}</span>
}
