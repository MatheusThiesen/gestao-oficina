import { cn } from '@/lib/utils'

interface PlateProps {
  plate: string
  size?: 'sm' | 'lg'
  className?: string
}

/** Placa Mercosul (faixa azul "BRASIL" + número em Barlow Condensed). */
export function Plate({ plate, size = 'sm', className }: PlateProps) {
  return (
    <span className={cn('plate', size === 'lg' && 'lg', className)}>
      <span className="pl-band" aria-hidden="true">
        BRASIL
      </span>
      <span className="pl-num">{plate}</span>
    </span>
  )
}
