import { Lock, Plus } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { BrandMark } from '@/branding/brand-mark'
import { useBranding } from '@/branding/branding-context'
import { useAppInfo } from '@/hooks/use-app-info'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { UpdateBanner } from '@/components/update-banner'
import { NavIcon, type NavIconName } from './nav-icons'

interface NavItem {
  to: string
  label: string
  icon: NavIconName
  end?: boolean
}

/** Grupos separados por divisória: atendimento, cadastros, oficina. */
const NAV_GROUPS: NavItem[][] = [
  [
    { to: '/painel', label: 'Painel', icon: 'dashboard' },
    { to: '/orcamentos', label: 'Orçamentos e OS', icon: 'quotes', end: true }
  ],
  [
    { to: '/clientes', label: 'Clientes', icon: 'customers' },
    { to: '/veiculos', label: 'Veículos', icon: 'vehicles' },
    { to: '/pecas', label: 'Peças e compras', icon: 'parts' }
  ],
  [
    { to: '/chaves', label: 'Chaves', icon: 'keys' },
    { to: '/configuracoes', label: 'Configurações', icon: 'settings' }
  ]
]

export function Sidebar() {
  const info = useAppInfo()
  const { branding, reload } = useBranding()

  return (
    <aside className="flex w-[220px] flex-none flex-col bg-side text-side-text">
      <div className="brand-stripe" aria-hidden="true" />
      <div className="flex justify-center px-5 pt-4 pb-4">
        <BrandMark appName={branding.appName} logoDataUrl={branding.logoDataUrl} />
      </div>

      <div className="px-3 pb-3">
        <Link
          data-tour="new-quote"
          to="/orcamentos/novo"
          className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-brand px-3 font-semibold text-brand-fg shadow-[0_1px_0_rgba(255,255,255,0.15)_inset] hover:bg-brand-hover hover:no-underline"
        >
          <Plus size={17} strokeWidth={2.5} aria-hidden="true" />
          Novo orçamento
          <span className="kbd ml-auto whitespace-nowrap">Ctrl+N</span>
        </Link>
      </div>

      <nav aria-label="Menu principal" className="flex flex-col">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className={cn('flex flex-col py-1.5', i > 0 && 'border-t border-side-border')}>
            {group.map((item) => (
              <NavLink
                data-tour={`nav-${item.icon}`}
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group relative mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-side-text hover:bg-side-hover hover:text-side-strong hover:no-underline',
                    isActive &&
                      'active bg-gradient-to-r from-brand/25 to-side-hover font-semibold text-side-strong before:absolute before:top-1.5 before:bottom-1.5 before:-left-2 before:w-[3px] before:rounded-r before:bg-brand'
                  )
                }
              >
                <NavIcon name={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto" />
      <UpdateBanner />
      <div className="flex items-center justify-between border-t border-side-border px-5 py-3 text-[12px] text-side-foot">
        {branding.hasPassword ? (
          <button
            type="button"
            onClick={() => call('auth:lock').then(reload)}
            className="flex items-center gap-1.5 border-0 bg-transparent p-0 text-side-foot hover:text-side-strong"
          >
            <Lock size={13} aria-hidden="true" />
            Bloquear
          </button>
        ) : (
          <span />
        )}
        <span>v{info?.version ?? '—'}</span>
      </div>
    </aside>
  )
}
