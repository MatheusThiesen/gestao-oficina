import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatPercent } from '@shared/format'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: ReactNode
  /** Valor atual e anterior (mesma unidade) para mostrar a variação. */
  compare?: { current: number; previous: number; label: string }
  hint?: ReactNode
  className?: string
}

/** Indicador: rótulo, valor e variação contra o período anterior (subir é bom). */
export function StatTile({ label, value, compare, hint, className }: StatTileProps) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-lg border border-line bg-panel px-4 py-3', className)}>
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="text-[24px] leading-tight font-semibold">{value}</span>
      {compare && <Delta {...compare} />}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </div>
  )
}

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) return <span className="text-[12px] text-muted">Sem movimento {label}</span>
  if (previous === 0) return <span className="text-[12px] text-muted">Sem base {label}</span>
  const change = (current - previous) / Math.abs(previous)
  const flat = Math.abs(change) < 0.005
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-[12px]',
        flat ? 'text-muted' : change > 0 ? 'text-[#17693a]' : 'text-[#a10e15]'
      )}
    >
      <Icon size={13} aria-hidden="true" />
      {flat ? 'Igual' : `${change > 0 ? '+' : '−'}${formatPercent(Math.abs(change))}`}
      <span className="text-muted">{label}</span>
    </span>
  )
}
