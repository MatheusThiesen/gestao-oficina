import { useEffect, useRef, useState } from 'react'
import { formatMoney, formatMoneyCompact, formatPercent } from '@shared/format'
import type { MoneyPoint } from '@shared/dashboard'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { niceTicks } from './nice-ticks'

const SERIES = [
  { key: 'revenueCents', label: 'Faturamento', color: 'var(--color-series-1)' },
  { key: 'profitCents', label: 'Lucro bruto', color: 'var(--color-series-2)' }
] as const

const MARGIN = { top: 12, right: 8, bottom: 26, left: 64 }
const BAR_MAX = 24
const PAIR_GAP = 2

interface Props {
  points: MoneyPoint[]
  height?: number
  /** Título acessível do gráfico. */
  title: string
}

/** Colunas lado a lado: faturamento × lucro bruto, um eixo só (mesma unidade). */
export function RevenueProfitChart({ points, height = 240, title }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const values = points.flatMap((p) => [p.revenueCents, p.profitCents])
  const ticks = niceTicks(Math.min(0, ...values), Math.max(1, ...values))
  const yMin = ticks[0]!
  const yMax = ticks[ticks.length - 1]!
  const plotW = Math.max(10, width - MARGIN.left - MARGIN.right)
  const plotH = height - MARGIN.top - MARGIN.bottom
  const band = plotW / Math.max(1, points.length)
  const bar = Math.min(BAR_MAX, Math.max(2, (band * 0.7 - PAIR_GAP) / 2))
  const y = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH
  const zero = y(0)
  // Rótulos do eixo X sem encavalar: no máximo ~1 a cada 44 px.
  const labelEvery = Math.max(1, Math.ceil(44 / band))
  const empty = values.every((v) => v === 0)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <ul className="m-0 flex list-none gap-4 p-0 text-[12.5px] text-muted" aria-label="Legenda">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          className="border-0 bg-transparent p-0 text-[12.5px] text-brand-text hover:underline"
        >
          {asTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>

      {asTable ? (
        <DataTable points={points} />
      ) : (
        <div ref={box} className="relative">
          <svg width={width} height={height} role="img" aria-label={title} className="block">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(t)} y2={y(t)} stroke="var(--color-grid)" strokeWidth={1} />
                <text x={MARGIN.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {formatMoneyCompact(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const cx = MARGIN.left + band * i + band / 2
              return (
                <g key={p.date}>
                  {SERIES.map((s, si) => {
                    const v = p[s.key]
                    if (v === 0) return null
                    const x = si === 0 ? cx - bar - PAIR_GAP / 2 : cx + PAIR_GAP / 2
                    return <Column key={s.key} x={x} width={bar} y0={zero} y1={y(v)} color={s.color} dim={hover !== null && hover !== i} />
                  })}
                  {i % labelEvery === 0 && (
                    <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted text-[11px] tabular-nums">
                      {p.label}
                    </text>
                  )}
                  {/* Área de hover maior que a coluna. */}
                  <rect
                    x={MARGIN.left + band * i}
                    y={MARGIN.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              )
            })}
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={zero} y2={zero} stroke="var(--color-line-strong)" strokeWidth={1} />
          </svg>
          {empty && (
            <p className="pointer-events-none absolute inset-0 m-0 grid place-items-center text-[13px] text-muted">
              Nenhuma OS entregue neste período.
            </p>
          )}
          {hover !== null && points[hover] && (
            <Tooltip point={points[hover]} left={MARGIN.left + band * hover + band / 2} width={width} />
          )}
        </div>
      )}
    </div>
  )
}

function Column(props: { x: number; width: number; y0: number; y1: number; color: string; dim: boolean }) {
  const { x, width, y0, y1, color, dim } = props
  const top = Math.min(y0, y1)
  const h = Math.max(1, Math.abs(y0 - y1))
  const r = Math.min(4, width / 2, h)
  const up = y1 < y0
  // Canto arredondado só na ponta do dado; reto na linha de base.
  const d = up
    ? `M${x},${y0} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${y0} Z`
    : `M${x},${y0} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + width - r} Q${x + width},${top + h} ${x + width},${top + h - r} V${y0} Z`
  return <path d={d} fill={color} opacity={dim ? 0.35 : 1} />
}

function Tooltip({ point, left, width }: { point: MoneyPoint; left: number; width: number }) {
  const margin = point.revenueCents > 0 ? point.profitCents / point.revenueCents : null
  const alignRight = left > width - 190
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-none absolute top-1 z-10 min-w-[170px] rounded-md border border-line bg-white px-3 py-2 text-[12.5px] shadow-lg',
        alignRight ? '-translate-x-full' : ''
      )}
      style={{ left: alignRight ? left - 12 : left + 12 }}
    >
      <div className="mb-1 font-semibold">{point.label}</div>
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </span>
          <span className="tabular-nums">{formatMoney(point[s.key])}</span>
        </div>
      ))}
      {margin !== null && (
        <div className="mt-1 flex justify-between gap-4 border-t border-line pt-1 text-muted">
          <span>Margem</span>
          <span className="tabular-nums">{formatPercent(margin)}</span>
        </div>
      )}
    </div>
  )
}

function DataTable({ points }: { points: MoneyPoint[] }) {
  return (
    <Table>
      <THead>
        <Tr>
          <Th>Período</Th>
          <Th className="num">Faturamento</Th>
          <Th className="num">Lucro bruto</Th>
          <Th className="num">Margem</Th>
        </Tr>
      </THead>
      <TBody>
        {points.map((p) => (
          <Tr key={p.date}>
            <Td className="tabular-nums">{p.label}</Td>
            <Td className="num">{formatMoney(p.revenueCents)}</Td>
            <Td className="num">{formatMoney(p.profitCents)}</Td>
            <Td className="num">{p.revenueCents > 0 ? formatPercent(p.profitCents / p.revenueCents) : '—'}</Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  )
}
