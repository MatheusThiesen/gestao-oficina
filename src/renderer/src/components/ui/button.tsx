import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[14px] transition-colors disabled:opacity-50 disabled:pointer-events-none no-underline hover:no-underline',
  {
    variants: {
      variant: {
        default: 'h-8 px-3.5 border border-line-strong bg-panel text-ink hover:bg-hover',
        primary: 'h-8 px-3.5 border border-brand bg-brand text-brand-fg font-semibold hover:bg-brand-hover',
        link: 'h-8 px-1 border-0 bg-transparent text-brand-text hover:underline',
        icon: 'size-7 p-0 border border-transparent bg-transparent text-muted hover:bg-icon-hover'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

export interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant }), className)}
      type={asChild ? undefined : (type ?? 'button')}
      {...props}
    />
  )
}
