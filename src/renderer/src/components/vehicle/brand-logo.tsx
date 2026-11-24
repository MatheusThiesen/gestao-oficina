import { useEffect, useState } from 'react'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'

/** Cache por marca para não pedir a mesma logo várias vezes ao processo principal. */
const cache = new Map<string, Promise<string | null>>()

function logoFor(brand: string): Promise<string | null> {
  const key = brand.trim().toLowerCase()
  if (!cache.has(key)) cache.set(key, call('vehicleCatalog:logo', { brand }).catch(() => null))
  return cache.get(key)!
}

/** Logo da marca do veículo; sem logo no catálogo, mostra a inicial. */
export function BrandLogo({ brand, size = 28, className }: { brand: string | null | undefined; size?: number; className?: string }) {
  const [logo, setLogo] = useState<{ brand: string; src: string | null } | null>(null)
  useEffect(() => {
    if (!brand) return
    let alive = true
    void logoFor(brand).then((src) => alive && setLogo({ brand, src }))
    return () => {
      alive = false
    }
  }, [brand])

  if (!brand) return null
  const src = logo?.brand === brand ? logo.src : null
  return (
    <span
      className={cn('inline-grid flex-none place-items-center overflow-hidden rounded-md bg-white', className)}
      style={{ width: size, height: size }}
      title={brand}
    >
      {src ? (
        <img src={src} alt="" className="max-h-[85%] max-w-[85%] object-contain" />
      ) : (
        <span className="text-[11px] font-semibold text-muted">{brand.trim().slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  )
}
