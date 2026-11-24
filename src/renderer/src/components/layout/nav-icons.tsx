import type { ReactNode } from 'react'

/** Ícones do menu, copiados do protótipo (traço 2 px, 18 px). */
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-none opacity-85 group-[.active]:opacity-100 group-[.active]:text-brand-icon"
    >
      {children}
    </svg>
  )
}

const ICONS = {
  dashboard: (
    <Svg>
      <path d="M3 3v18h18" />
      <path d="M7 15v2M11 11v6M15 13v4M19 7v10" />
    </Svg>
  ),
  quotes: (
    <Svg>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </Svg>
  ),
  newQuote: (
    <Svg>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  customers: (
    <Svg>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-1a6 6 0 0 1 12 0v1M16 4.1a4 4 0 0 1 0 7.8M22 21v-1a6 6 0 0 0-4-5.6" />
    </Svg>
  ),
  vehicles: (
    <Svg>
      <path d="M3 17v-5l2.2-5.2A1.5 1.5 0 0 1 6.6 6h10.8a1.5 1.5 0 0 1 1.4.8L21 12v5h-2M5 17H3M9 17h6M3 12h18" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </Svg>
  ),
  parts: (
    <Svg>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </Svg>
  ),
  keys: (
    <Svg>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 21 2M16 7l3 3M18.5 4.5l2 2" />
    </Svg>
  ),
  settings: (
    <Svg>
      <path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M19 18h1" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </Svg>
  )
}

export type NavIconName = keyof typeof ICONS

export function NavIcon({ name }: { name: NavIconName }) {
  return ICONS[name]
}
