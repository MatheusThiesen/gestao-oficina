import { useEffect, type ReactNode } from 'react'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'
import { applyPalette } from './apply-palette'
import { BrandingContext } from './branding-context'

/** Carrega nome, logo e cores e aplica no app inteiro (tema e título da janela). */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data: branding, error, reload } = useIpcQuery(() => call('branding:get'), [])

  useEffect(() => {
    if (!branding) return
    applyPalette(branding.primaryColor, branding.sidebarColor)
    document.title = branding.appName
  }, [branding])

  if (error) return <p className="p-6 text-brand-text">Não foi possível abrir o sistema: {error}</p>
  if (!branding) return null
  return <BrandingContext.Provider value={{ branding, reload }}>{children}</BrandingContext.Provider>
}
