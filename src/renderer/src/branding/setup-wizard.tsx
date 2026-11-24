import { ArrowLeft, ArrowRight, Check, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isHexColor } from '@shared/color'
import type { AppSettings, BrandingView } from '@shared/settings'
import { FormError } from '@/components/flash'
import { Button } from '@/components/ui/button'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { applyPalette } from './apply-palette'
import { BrandMark } from './brand-mark'
import { formFromSettings, formToInput, passwordReady, type SetupForm } from './setup-form'
import { ColorFields, CompanyFields, NameAndLogoFields, PasswordFields, QuoteDefaultsFields } from './setup-fields'

const STEPS = ['Nome e logo', 'Cores', 'Empresa e padrões', 'Senha'] as const

/** Campo com erro → passo onde ele aparece (o resto fica no passo 3). */
const FIELD_STEP: Record<string, number> = { appName: 0, logo: 0, primaryColor: 1, sidebarColor: 1, password: 3 }

interface SetupWizardProps {
  settings: AppSettings
  branding: BrandingView
  onDone: () => void
}

/** Configuração inicial, na primeira abertura. Depois, tudo fica na tela Configurações. */
export function SetupWizard({ settings, branding, onDone }: SetupWizardProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<SetupForm>(() => formFromSettings(settings, branding))
  const submit = useSubmit()
  const set = (patch: Partial<SetupForm>) => setForm((f) => ({ ...f, ...patch }))

  // Pré-visualização ao vivo: o app inteiro assume as cores escolhidas.
  useEffect(() => {
    if (isHexColor(form.primaryColor) && isHexColor(form.sidebarColor)) applyPalette(form.primaryColor, form.sidebarColor)
  }, [form.primaryColor, form.sidebarColor])

  async function finish() {
    const input = await formToInput(form, branding)
    const ok = await submit.run(
      () => call('setup:save', input),
      (fields) => setStep(Math.min(...Object.keys(fields).map((f) => FIELD_STEP[f] ?? 2)))
    )
    if (ok) onDone()
  }

  const canAdvance = step !== 0 || form.appName.trim().length >= 2
  const last = step === STEPS.length - 1

  return (
    <div className="flex h-full bg-bg">
      <Preview appName={form.appName || 'Seu programa'} logo={form.logoDataUrl} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-8 py-10">
          <p className="m-0 text-[13px] text-muted">Configuração inicial</p>
          <h1 className="mt-1 mb-6 font-display text-[28px] leading-tight font-bold italic">{STEPS[step]}</h1>

          <ol className="mb-8 flex list-none gap-2 p-0" aria-label="Passos">
            {STEPS.map((label, i) => (
              <li key={label} className="flex-1">
                <span className={cn('block h-1 rounded-full', i <= step ? 'bg-brand' : 'bg-line')} />
                <span className={cn('mt-1.5 block text-[12px]', i === step ? 'font-semibold text-ink' : 'text-muted')}>
                  {i + 1}. {label}
                </span>
              </li>
            ))}
          </ol>

          <FormError message={submit.error} />

          {step === 0 && (
            <>
              <NameAndLogoFields form={form} set={set} errors={submit.fields} />
              <ImportBox />
            </>
          )}
          {step === 1 && <ColorFields form={form} set={set} errors={submit.fields} />}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <CompanyFields form={form} set={set} errors={submit.fields} />
              <div>
                <h2 className="mt-0 mb-3 text-[15px] font-semibold">Padrões do orçamento</h2>
                <QuoteDefaultsFields form={form} set={set} errors={submit.fields} />
              </div>
              <p className="m-0 text-[12.5px] text-muted">Tudo isso pode ser alterado depois em Configurações.</p>
            </div>
          )}
          {step === 3 && <PasswordFields form={form} set={set} errors={submit.fields} hasPassword={branding.hasPassword} />}

          <div className="mt-auto flex items-center gap-2 pt-10">
            <span className="flex-1" />
            {step > 0 && (
              <Button onClick={() => setStep(step - 1)}>
                <ArrowLeft size={15} aria-hidden="true" />
                Voltar
              </Button>
            )}
            {last ? (
              <Button variant="primary" onClick={finish} disabled={submit.busy || !passwordReady(form)}>
                <Check size={16} aria-hidden="true" />
                Concluir e começar
              </Button>
            ) : (
              <Button variant="primary" disabled={!canAdvance} onClick={() => setStep(step + 1)}>
                Continuar
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

/** Primeira tela: quem está trocando de computador importa o backup em vez de configurar do zero. */
function ImportBox() {
  const submit = useSubmit()
  return (
    <div className="mt-8 flex items-center gap-4 rounded-lg border border-line bg-white p-4">
      <span className="grid size-10 flex-none place-items-center rounded-lg bg-bg text-muted">
        <Upload size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 font-semibold">Já usa o programa em outro computador?</p>
        <p className="m-0 text-[13px] text-muted">
          Importe o backup do computador antigo e continue de onde parou, com clientes, orçamentos, logo e cores.
        </p>
        {submit.error && <p className="m-0 mt-1 text-[13px] font-semibold text-brand-text">{submit.error}</p>}
      </div>
      <Button onClick={() => void submit.run(() => call('backup:restore'))} disabled={submit.busy}>
        Importar backup
      </Button>
    </div>
  )
}

/** Menu lateral em miniatura com o nome, a logo e as cores escolhidas. */
function Preview({ appName, logo }: { appName: string; logo: string | null }) {
  return (
    <aside className="flex w-[260px] flex-none flex-col bg-side text-side-text" aria-label="Pré-visualização">
      <div className="brand-stripe" aria-hidden="true" />
      <div className="flex justify-center px-5 pt-6 pb-5">
        <BrandMark appName={appName} logoDataUrl={logo} />
      </div>
      <div className="px-4 pb-3">
        <span className="flex h-9 items-center rounded-md bg-brand px-3 font-semibold text-brand-fg">+ Novo orçamento</span>
      </div>
      <div className="mx-2 rounded-md bg-side-hover px-3 py-2 font-semibold text-side-strong">Orçamentos e OS</div>
      <div className="mx-2 px-3 py-2">Clientes</div>
      <div className="mx-2 px-3 py-2">Veículos</div>
      <p className="mt-auto px-5 pb-5 text-[12px] text-side-foot">Pré-visualização</p>
    </aside>
  )
}
