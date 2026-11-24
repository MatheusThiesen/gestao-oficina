import { ImageUp, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { COLOR_PRESETS, isHexColor } from '@shared/color'
import { formatDocument, formatKm, formatPhone, parseInteger } from '@shared/format'
import { Button } from '@/components/ui/button'
import { Field, FieldGrid } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PasswordMode, SetForm, SetupForm } from './setup-form'

/** Campos de configuração usados pelo assistente inicial e pela tela Configurações. */
export interface FieldsProps {
  form: SetupForm
  set: SetForm
  errors: Record<string, string>
}

export function NameAndLogoFields({ form, set, errors }: FieldsProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [readError, setReadError] = useState<string | null>(null)

  function onFile(file: File | undefined) {
    if (!file) return
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return setReadError('Use uma imagem PNG, JPG, WEBP ou SVG.')
    if (file.size > 2 * 1024 * 1024) return setReadError('A logo deve ter no máximo 2 MB.')
    setReadError(null)
    const reader = new FileReader()
    reader.onload = () => set({ logoDataUrl: String(reader.result), logoChanged: true })
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Nome do programa" htmlFor="w-name" error={errors.appName}>
        <Input
          id="w-name"
          maxLength={40}
          placeholder="Ex.: Auto Center Silva"
          value={form.appName}
          onChange={(e) => set({ appName: e.target.value })}
        />
        <span className="text-[12px] text-muted">Aparece no menu, na janela, no ícone e nos atalhos do programa.</span>
      </Field>

      <Field label="Logo (opcional)" error={errors.logo ?? readError ?? undefined}>
        <div
          className="flex items-center gap-4 rounded-lg border border-dashed border-line-strong bg-white p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFile(e.dataTransfer.files[0])
          }}
        >
          <div className="grid size-20 flex-none place-items-center rounded-md bg-side">
            {form.logoDataUrl ? (
              <img src={form.logoDataUrl} alt="" className="max-h-16 max-w-16 object-contain" />
            ) : (
              <ImageUp size={24} className="text-side-text" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">
              Arraste a imagem aqui ou escolha um arquivo. PNG com fundo transparente fica melhor. Sem logo, o ícone
              usa as iniciais do nome.
            </span>
            <span className="flex gap-2">
              <Button onClick={() => fileInput.current?.click()}>
                <ImageUp size={15} aria-hidden="true" />
                Escolher imagem
              </Button>
              {form.logoDataUrl && (
                <Button onClick={() => set({ logoDataUrl: null, logoChanged: true })}>
                  <Trash2 size={15} aria-hidden="true" />
                  Remover
                </Button>
              )}
            </span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </Field>
    </div>
  )
}

export function ColorFields({ form, set, errors }: FieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="mb-2 block text-[12px] text-muted">Combinações prontas</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
          {COLOR_PRESETS.map((p) => {
            const on = p.primary === form.primaryColor && p.sidebar === form.sidebarColor
            return (
              <button
                key={p.name}
                type="button"
                aria-pressed={on}
                onClick={() => set({ primaryColor: p.primary, sidebarColor: p.sidebar })}
                className={cn(
                  'flex items-center gap-2 rounded-md border bg-white p-2 text-left',
                  on ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong'
                )}
              >
                <span className="flex overflow-hidden rounded">
                  <span className="size-6" style={{ background: p.sidebar }} />
                  <span className="size-6" style={{ background: p.primary }} />
                </span>
                {p.name}
              </button>
            )
          })}
        </div>
      </div>
      <FieldGrid>
        <ColorField
          id="w-primary"
          label="Cor principal (botões e destaques)"
          value={form.primaryColor}
          onChange={(primaryColor) => set({ primaryColor })}
          error={errors.primaryColor}
        />
        <ColorField
          id="w-side"
          label="Cor do menu lateral"
          value={form.sidebarColor}
          onChange={(sidebarColor) => set({ sidebarColor })}
          error={errors.sidebarColor}
        />
      </FieldGrid>
      <p className="m-0 text-[12.5px] text-muted">O contraste dos textos é ajustado sozinho.</p>
    </div>
  )
}

function ColorField(props: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const { id, label, value, onChange, error } = props
  const [text, setText] = useState(value)
  // Mantém o texto em sincronia quando a cor muda por preset ou pelo seletor.
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(value)
  }
  return (
    <Field label={label} htmlFor={id} error={error}>
      <span className="flex gap-2">
        <input
          type="color"
          aria-label={label}
          value={isHexColor(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 flex-none cursor-pointer rounded-md border border-line-strong bg-white p-0.5"
        />
        <Input
          id={id}
          maxLength={7}
          className="font-mono uppercase"
          value={text}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setText(v)
            if (isHexColor(v)) onChange(v.toLowerCase())
          }}
        />
      </span>
    </Field>
  )
}

export function CompanyFields({ form, set, errors }: FieldsProps) {
  return (
    <FieldGrid>
      <Field label="Nome da empresa no orçamento" htmlFor="w-shop" error={errors['shop.name']} className="col-span-full">
        <Input id="w-shop" placeholder={form.appName} value={form.shopName} onChange={(e) => set({ shopName: e.target.value })} />
      </Field>
      <Field label="CNPJ (opcional)" htmlFor="w-cnpj" error={errors['shop.cnpj']}>
        <Input
          id="w-cnpj"
          placeholder="00.000.000/0000-00"
          value={form.cnpj}
          onChange={(e) => set({ cnpj: e.target.value })}
          onBlur={(e) => set({ cnpj: formatDocument(e.target.value) })}
        />
      </Field>
      <Field label="WhatsApp" htmlFor="w-zap" error={errors['shop.whatsapp']}>
        <Input
          id="w-zap"
          placeholder="(00) 00000-0000"
          value={form.whatsapp}
          onChange={(e) => set({ whatsapp: e.target.value })}
          onBlur={(e) => set({ whatsapp: formatPhone(e.target.value) })}
        />
      </Field>
      <Field label="Endereço" htmlFor="w-addr" className="col-span-full">
        <Input id="w-addr" value={form.address} onChange={(e) => set({ address: e.target.value })} />
      </Field>
    </FieldGrid>
  )
}

export function QuoteDefaultsFields({ form, set, errors }: FieldsProps) {
  return (
    <FieldGrid>
      <Field label="Valor da hora (R$)" htmlFor="w-hour" error={errors.hourlyRateCents}>
        <Input id="w-hour" inputMode="decimal" value={form.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} />
      </Field>
      <Field label="Markup padrão das peças (%)" htmlFor="w-mk" error={errors.defaultMarkupBp}>
        <Input id="w-mk" inputMode="decimal" value={form.markup} onChange={(e) => set({ markup: e.target.value })} />
      </Field>
      <Field label="Validade (dias)" htmlFor="w-val" error={errors.validityDays}>
        <Input id="w-val" inputMode="numeric" value={form.validityDays} onChange={(e) => set({ validityDays: e.target.value })} />
      </Field>
      <Field label="Garantia (dias)" htmlFor="w-gar" error={errors.warrantyDays}>
        <Input id="w-gar" inputMode="numeric" value={form.warrantyDays} onChange={(e) => set({ warrantyDays: e.target.value })} />
      </Field>
    </FieldGrid>
  )
}

export function WorkshopFields({ form, set, errors }: FieldsProps) {
  return (
    <FieldGrid>
      <Field label="Chaveiros numerados" htmlFor="w-keys" error={errors.keyTagCount}>
        <Input id="w-keys" inputMode="numeric" value={form.keyTagCount} onChange={(e) => set({ keyTagCount: e.target.value })} />
      </Field>
      <Field label="Troca de óleo a cada (km)" htmlFor="w-oilkm" error={errors.oilChangeKm}>
        <Input
          id="w-oilkm"
          inputMode="numeric"
          value={form.oilChangeKm}
          onChange={(e) => {
            const km = parseInteger(e.target.value)
            set({ oilChangeKm: km != null ? formatKm(km) : '' })
          }}
        />
      </Field>
      <Field label="ou a cada (meses)" htmlFor="w-oilm" error={errors.oilChangeMonths}>
        <Input id="w-oilm" inputMode="numeric" value={form.oilChangeMonths} onChange={(e) => set({ oilChangeMonths: e.target.value })} />
      </Field>
    </FieldGrid>
  )
}

export function PasswordFields({ form, set, errors, hasPassword }: FieldsProps & { hasPassword: boolean }) {
  const options: { value: PasswordMode; label: string; hint: string }[] = hasPassword
    ? [
        { value: 'keep', label: 'Manter a senha atual', hint: 'Nada muda.' },
        { value: 'set', label: 'Trocar a senha', hint: 'Defina uma nova senha abaixo.' },
        { value: 'remove', label: 'Remover a senha', hint: 'O programa abre direto, sem pedir senha.' }
      ]
    : [
        { value: 'none', label: 'Sem senha', hint: 'O programa abre direto. Bom para um computador só do balcão.' },
        { value: 'set', label: 'Proteger com senha', hint: 'O programa pede a senha ao abrir e quando for bloqueado.' }
      ]
  const mismatch = form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2" role="radiogroup" aria-label="Senha de acesso">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex cursor-pointer gap-3 rounded-md border bg-white p-3',
              form.passwordMode === o.value ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-line-strong'
            )}
          >
            <input
              type="radio"
              name="password-mode"
              className="mt-1 accent-[var(--color-brand)]"
              checked={form.passwordMode === o.value}
              onChange={() => set({ passwordMode: o.value, password: '', passwordConfirm: '' })}
            />
            <span>
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-[12.5px] text-muted">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {form.passwordMode === 'set' && (
        <>
          <FieldGrid>
            <Field label="Senha (mínimo 4 caracteres)" htmlFor="w-pass" error={errors.password}>
              <Input
                id="w-pass"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
              />
            </Field>
            <Field label="Repita a senha" htmlFor="w-pass2" error={mismatch ? 'As senhas não conferem.' : undefined}>
              <Input
                id="w-pass2"
                type="password"
                autoComplete="new-password"
                value={form.passwordConfirm}
                onChange={(e) => set({ passwordConfirm: e.target.value })}
              />
            </Field>
          </FieldGrid>
          <p className="m-0 text-[12.5px] text-muted">Guarde a senha em local seguro. Sem ela, não é possível abrir o programa.</p>
        </>
      )}
    </div>
  )
}
