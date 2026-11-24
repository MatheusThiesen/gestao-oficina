import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  /** Informação curta ao lado do título (tag de status, contagem). */
  aside?: ReactNode
  crumbs?: Crumb[]
  actions?: ReactNode
}

export function PageHeader({ title, aside, crumbs, actions }: PageHeaderProps) {
  return (
    <header className="mb-5">
      {crumbs && crumbs.length > 0 && (
        <div className="mb-1 text-[12.5px] text-muted">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="px-1 text-line-strong">/</span>}
              {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="m-0 font-display text-[26px] leading-none font-bold tracking-[-0.01em] italic">{title}</h1>
          {aside}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
