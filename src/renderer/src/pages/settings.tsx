import { Compass, Save } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { isHexColor } from '@shared/color'
import type { AppSettings } from '@shared/settings'
import { applyPalette } from '@/branding/apply-palette'
import { BrandMark } from '@/branding/brand-mark'
import { useBranding } from '@/branding/branding-context'
import { formFromSettings, formToInput, passwordReady, type SetupForm } from '@/branding/setup-form'
import {
  ColorFields,
  CompanyFields,
  NameAndLogoFields,
  PasswordFields,
  QuoteDefaultsFields,
  WorkshopFields
} from '@/branding/setup-fields'
import { BackupPanel } from '@/components/backup-panel'
import { Flash, FormError } from '@/components/flash'
import { UpdatePanel } from '@/components/update-panel'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { useFlash } from '@/hooks/use-flash'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { useSaveShortcut } from '@/hooks/use-shortcuts'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'

export function SettingsPage() {
  const { data: settings, error, reload } = useIpcQuery(() => call('settings:get'), [])
  if (error) return <FormError message={error} />
  if (!settings) return null
  return <SettingsEditor settings={settings} onSaved={reload} />
}

function SettingsEditor({ settings, onSaved }: { settings: AppSettings; onSaved: () => void }) {
  const { branding, reload: reloadBranding } = useBranding()
  const [form, setForm] = useState<SetupForm>(() => formFromSettings(settings, branding))
  const [dirty, setDirty] = useState(false)
  const submit = useSubmit()
  const [flash, showFlash] = useFlash()
  const set = (patch: Partial<SetupForm>) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  // Cores aparecem no app enquanto edita; ao sair sem salvar, volta às cores salvas.
  const saved = useRef(branding)
  useEffect(() => {
    saved.current = branding
  }, [branding])
  useEffect(() => {
    if (isHexColor(form.primaryColor) && isHexColor(form.sidebarColor)) applyPalette(form.primaryColor, form.sidebarColor)
  }, [form.primaryColor, form.sidebarColor])
  useEffect(() => () => applyPalette(saved.current.primaryColor, saved.current.sidebarColor), [])

  async function save() {
    if (!passwordReady(form)) return
    const input = await formToInput(form, branding)
    const ok = await submit.run(() => call('setup:save', input))
    if (!ok) return
    setDirty(false)
    setForm((f) => ({ ...f, logoChanged: false, password: '', passwordConfirm: '', passwordMode: ok.hasPassword ? 'keep' : 'none' }))
    reloadBranding()
    onSaved()
    showFlash('Configurações salvas.')
  }
  useSaveShortcut(save)

  const fieldProps = { form, set, errors: submit.fields }

  return (
    <>
      <PageHeader
        title="Configurações"
        actions={
          <>
            <Flash message={flash} />
            {dirty && <span className="text-[13px] text-muted">Alterações não salvas</span>}
            <Button variant="primary" onClick={save} disabled={submit.busy || !dirty || !passwordReady(form)} title="Ctrl+S">
              <Save size={15} aria-hidden="true" />
              Salvar
            </Button>
          </>
        }
      />
      <FormError message={submit.error} />

      <div className="flex max-w-[860px] flex-col">
        <Section title="Identidade do programa">
          <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-6 max-[760px]:grid-cols-1">
            <NameAndLogoFields {...fieldProps} />
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-muted">Como fica no menu</span>
              <div className="grid h-[150px] place-items-center rounded-md bg-side p-2">
                <BrandMark appName={form.appName || 'Seu programa'} logoDataUrl={form.logoDataUrl} className="w-[110px]" />
              </div>
            </div>
          </div>
        </Section>
        <Section title="Cores">
          <ColorFields {...fieldProps} />
        </Section>
        <Section title="Empresa (aparece no orçamento)">
          <CompanyFields {...fieldProps} />
        </Section>
        <Section title="Padrões do orçamento">
          <QuoteDefaultsFields {...fieldProps} />
          <p className="mt-3 mb-0 text-[12.5px] text-muted">Valem para orçamentos novos. Os já feitos não mudam.</p>
        </Section>
        <Section title="Oficina">
          <WorkshopFields {...fieldProps} />
        </Section>
        <Section title="Senha de acesso">
          <PasswordFields {...fieldProps} hasPassword={branding.hasPassword} />
        </Section>
        <Section title="Atualizações">
          <UpdatePanel />
        </Section>
        <Section title="Ajuda">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-muted">Reveja o tour que mostra onde fica cada parte do programa.</p>
            <Button
              onClick={async () => {
                await call('tour:setCompleted', { completed: false })
                reloadBranding()
              }}
            >
              <Compass size={15} aria-hidden="true" />
              Rever o tour
            </Button>
          </div>
        </Section>
        <Section title="Backup">
          <BackupPanel />
        </Section>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel>
      <PanelHeader>{title}</PanelHeader>
      <PanelBody>{children}</PanelBody>
    </Panel>
  )
}
