import * as React from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse', className)} {...props} />
    </div>
  )
}

export function THead(props: React.ComponentProps<'thead'>) {
  return <thead {...props} />
}

export function TBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&>tr:last-child>td]:border-b-0', className)} {...props} />
}

interface TrProps extends React.ComponentProps<'tr'> {
  clickable?: boolean
}

export function Tr({ className, clickable, ...props }: TrProps) {
  return <tr className={cn(clickable && 'cursor-pointer [&:hover>td]:bg-hover', className)} {...props} />
}

/** Colunas com a classe `num` ficam alinhadas à direita; as demais, à esquerda. */
function alignClass(className?: string): string {
  return className?.split(/\s+/).includes('num') ? 'text-right' : 'text-left'
}

export function Th({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-line bg-th px-3 py-2 align-middle text-[12.5px] font-semibold text-muted',
        alignClass(className),
        className
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('border-b border-line px-3 py-2 align-middle', alignClass(className), className)} {...props} />
}
