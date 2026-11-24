import { createContext, useContext } from 'react'
import type { BrandingView } from '@shared/settings'

export interface BrandingContextValue {
  branding: BrandingView
  /** Recarrega do main depois de salvar (assistente/configurações). */
  reload: () => void
}

export const BrandingContext = createContext<BrandingContextValue | null>(null)

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding fora do BrandingProvider')
  return ctx
}
