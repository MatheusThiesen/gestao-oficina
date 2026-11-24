import { derivePalette } from '@shared/color'

/** Aplica a paleta da marca nas variáveis CSS do tema (Tailwind lê var(--color-*)). */
export function applyPalette(primary: string, sidebar: string): void {
  const p = derivePalette(primary, sidebar)
  const vars: Record<string, string> = {
    '--color-brand': p.brand,
    '--color-brand-hover': p.brandHover,
    '--color-brand-text': p.brandText,
    '--color-brand-fg': p.brandForeground,
    '--color-brand-icon': p.brandOnSide,
    '--color-side': p.side,
    '--color-side-hover': p.sideHover,
    '--color-side-border': p.sideBorder,
    '--color-side-text': p.sideText,
    '--color-side-foot': p.sideMuted,
    '--color-side-strong': p.sideStrong
  }
  const root = document.documentElement.style
  for (const [name, value] of Object.entries(vars)) root.setProperty(name, value)
}
