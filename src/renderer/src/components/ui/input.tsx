import * as React from 'react'
import { cn } from '@/lib/utils'

export const fieldBase =
  'h-8 w-full rounded-md border border-line-strong bg-white px-2 text-[14px] text-ink placeholder:text-muted/70 disabled:bg-hover disabled:text-muted'

export function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldBase, className)} {...props} />
}

/** Input "fantasma" usado dentro das células de tabela editáveis. */
export function CellInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type="text"
      className={cn(
        'h-7 w-full rounded-md border border-transparent bg-transparent px-2 hover:border-line focus:border-line-strong focus:bg-white',
        className
      )}
      {...props}
    />
  )
}
