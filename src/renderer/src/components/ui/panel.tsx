import * as React from 'react'
import { cn } from '@/lib/utils'

export function Panel({ className, ...props }: React.ComponentProps<'section'>) {
  return <section className={cn('mb-4 overflow-hidden rounded-lg border border-line bg-panel shadow-[0_1px_2px_rgba(23,25,28,0.04)]', className)} {...props} />
}

export function PanelHeader({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      className={cn(
        'm-0 flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2 text-[15px] font-semibold',
        className
      )}
      {...props}
    />
  )
}

export function PanelBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-4', className)} {...props} />
}
