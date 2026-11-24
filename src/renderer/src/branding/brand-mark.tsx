import { cn } from '@/lib/utils'
import { initials } from './render-icon'

interface BrandMarkProps {
  appName: string
  logoDataUrl: string | null
  className?: string
}

/** Logo da empresa ou, sem logo, as iniciais do nome sobre a cor principal. */
export function BrandMark({ appName, logoDataUrl, className }: BrandMarkProps) {
  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        alt={appName}
        className={cn('block h-auto max-h-[120px] w-[112px] object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]', className)}
      />
    )
  }
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <span className="grid size-16 place-items-center rounded-xl bg-brand font-display text-[26px] font-extrabold text-brand-fg italic shadow-[0_6px_14px_rgba(0,0,0,0.35)]">
        {initials(appName)}
      </span>
      <span className="max-w-[180px] text-center font-display text-[17px] leading-tight font-bold text-side-strong italic">
        {appName}
      </span>
    </div>
  )
}
