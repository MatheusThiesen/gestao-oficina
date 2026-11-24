import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { fieldBase } from './input'

interface IconInputProps extends ComponentProps<'input'> {
  icon: LucideIcon
  /** Conteúdo à direita dentro do campo (ex.: ✓ válido). */
  trailing?: ReactNode
  invalid?: boolean
}

/** Campo com ícone à esquerda e, opcionalmente, um indicador à direita. */
export function IconInput({ icon: Icon, trailing, invalid, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="text"
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, 'h-9 pl-8', trailing && 'pr-24', invalid && 'border-[#d97077] focus-visible:outline-[#c8121a]', className)}
        {...props}
      />
      {trailing && <span className="absolute top-1/2 right-2.5 -translate-y-1/2">{trailing}</span>}
    </div>
  )
}

/** Indicador dentro do campo: válido (verde) ou problema (vermelho). */
export function FieldCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11.5px] font-semibold',
        ok ? 'bg-[#e1f3e8] text-[#17693a]' : 'bg-[#fde6e7] text-[#a10e15]'
      )}
    >
      {ok ? '✓' : '!'} {label}
    </span>
  )
}
