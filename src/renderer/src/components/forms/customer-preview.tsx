import { formatPhone, maskDocument } from '@shared/format'
import type { CustomerInput } from '@shared/registry'
import { cn } from '@/lib/utils'

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 2 || /^[A-Z]/.test(w))
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

/** Cartão com o cliente como vai aparecer nas listas e no orçamento, atualizado enquanto digita. */
export function CustomerPreview({ value, className }: { value: CustomerInput; className?: string }) {
  const name = value.name.trim()
  const phone = formatPhone(value.whatsapp)
  const doc = maskDocument(value.document)
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="grid size-12 flex-none place-items-center rounded-full bg-brand text-[17px] font-semibold text-brand-fg">
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className={cn('block truncate text-[16px] font-semibold', !name && 'text-muted')}>{name || 'Nome do cliente'}</span>
        <span className="block truncate text-[13px] text-muted">
          {[value.type === 'PJ' ? 'Empresa' : 'Pessoa física', phone, doc].filter(Boolean).join(', ')}
        </span>
      </span>
    </div>
  )
}
