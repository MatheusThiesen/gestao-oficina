import * as React from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  htmlFor?: string
  className?: string
  error?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, className, error, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-[12px] text-muted">
        {label}
      </label>
      {children}
      {error && <span className="text-[12px] text-brand-text">{error}</span>}
    </div>
  )
}

/** Grade de campos do protótipo (.grid): colunas automáticas de no mínimo 180 px. */
export function FieldGrid({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]', className)} {...props} />
  )
}
