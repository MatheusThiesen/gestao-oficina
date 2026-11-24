import * as React from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full resize-y rounded-md border border-line-strong bg-white px-2 py-1.5 text-[14px] text-ink placeholder:text-muted/70',
        className
      )}
      {...props}
    />
  )
}
