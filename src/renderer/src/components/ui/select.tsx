import * as React from 'react'
import { cn } from '@/lib/utils'
import { fieldBase } from './input'

/** Select nativo (compacto, acessível por teclado), no visual dos demais campos. */
export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(fieldBase, className)} {...props} />
}
