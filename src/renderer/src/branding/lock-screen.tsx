import { LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'
import { BrandMark } from './brand-mark'
import { useBranding } from './branding-context'

/** Tela de senha, com a marca da empresa. Aparece ao abrir (com senha definida) e ao bloquear. */
export function LockScreen() {
  const { branding, reload } = useBranding()
  const [password, setPassword] = useState('')
  const submit = useSubmit()

  async function unlock(e: React.FormEvent) {
    e.preventDefault()
    const ok = await submit.run(() => call('auth:unlock', { password }))
    if (ok) reload()
    else setPassword('')
  }

  return (
    <div className="grid h-full place-items-center bg-side">
      <div className="brand-stripe fixed inset-x-0 top-0" aria-hidden="true" />
      <form onSubmit={unlock} className="flex w-[320px] flex-col items-center gap-5">
        <BrandMark appName={branding.appName} logoDataUrl={branding.logoDataUrl} className="w-[140px]" />
        {branding.logoDataUrl && (
          <h1 className="m-0 font-display text-[22px] font-bold text-side-strong italic">{branding.appName}</h1>
        )}
        <div className="flex w-full flex-col gap-2">
          <label htmlFor="lock-pass" className="text-[13px] text-side-text">
            Senha
          </label>
          <Input
            id="lock-pass"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!submit.fields.password}
          />
          {(submit.fields.password ?? (submit.error && !submit.fields.password ? submit.error : null)) && (
            <span role="alert" className="text-[13px] font-semibold text-[#ff8a8f]">
              {submit.fields.password ?? submit.error}
            </span>
          )}
        </div>
        <Button type="submit" variant="primary" className="h-9 w-full" disabled={!password || submit.busy}>
          <LockKeyhole size={15} aria-hidden="true" />
          Entrar
        </Button>
      </form>
    </div>
  )
}
