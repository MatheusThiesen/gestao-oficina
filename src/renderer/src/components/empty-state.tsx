import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}

/** Estado vazio: diz o que falta e oferece o próximo passo. */
export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-bg text-muted">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="m-0 font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 mb-0 max-w-[420px] text-[13px] text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
