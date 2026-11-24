import {
  ArrowDownRight,
  ArrowUpRight,
  CarFront,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Hourglass,
  KeyRound,
  Minus,
  type LucideIcon
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { DashboardData, DashboardPeriod, PeriodSummary } from '@shared/dashboard'
import { formatDate, formatDocNumber, formatKeyTag, formatMoney, formatMoneyCompact, formatPercent } from '@shared/format'
import { RevenueProfitChart } from '@/components/charts/revenue-profit-chart'
import { FormError } from '@/components/flash'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Segmented } from '@/components/ui/segmented'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' }
]

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const [offset, setOffset] = useState(0)
  const { data, error } = useIpcQuery(() => call('dashboard:get', { period, offset }), [period, offset])

  if (error) return <FormError message={error} />
  if (!data) return null

  return (
    <>
      <PageHeader
        title="Painel"
        aside={<span className="text-[13px] text-muted">{longDate(data.today.date)}</span>}
        actions={
          <div className="flex items-center gap-2 [&>div]:mb-0">
            <Segmented
              label="Período"
              options={PERIODS}
              value={period}
              onChange={(p) => {
                setPeriod(p)
                setOffset(0)
              }}
            />
            <div className="flex h-8 items-center rounded-lg border border-line bg-white">
              <Button variant="icon" aria-label="Período anterior" onClick={() => setOffset((o) => o - 1)}>
                <ChevronLeft size={17} aria-hidden="true" />
              </Button>
              <span className="min-w-[150px] px-1 text-center text-[13.5px] font-semibold tabular-nums">
                {data.period.label}
              </span>
              <Button
                variant="icon"
                aria-label="Próximo período"
                disabled={offset >= 0}
                onClick={() => setOffset((o) => Math.min(0, o + 1))}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </Button>
            </div>
          </div>
        }
      />

      <TodayStrip today={data.today} />
      <PeriodResult data={data} />

      <div className="mb-4 grid grid-cols-2 items-start gap-4 max-[1080px]:grid-cols-1">
        <ReadyList today={data.today} />
        <AwaitingList today={data.today} />
      </div>

      <Panel>
        <PanelHeader>
          Últimos 6 meses
          <span className="text-[13px] font-normal text-muted">
            {formatMoney(sum(data.months, 'revenueCents'))} faturados, {formatMoney(sum(data.months, 'profitCents'))} de lucro bruto
          </span>
        </PanelHeader>
        <div className="px-4 pt-3 pb-2">
          <RevenueProfitChart points={data.months} height={200} title="Faturamento e lucro bruto por mês" />
        </div>
      </Panel>
      <p className="m-0 text-[12px] text-muted">
        Faturamento: OS entregues, pela data de entrega. Lucro bruto: faturamento menos o custo das peças (sem despesas
        da oficina).
      </p>
    </>
  )
}

/* ─── Hoje ─────────────────────────────────────────────────────────────── */

function TodayStrip({ today }: { today: DashboardData['today'] }) {
  return (
    <section aria-label="Hoje" className="mb-4 grid grid-cols-4 overflow-hidden rounded-lg border border-line bg-panel max-[980px]:grid-cols-2">
      <TodayItem
        icon={CarFront}
        label="Na oficina"
        value={today.inShop}
        detail={`${today.deliveredToday} entregue${today.deliveredToday === 1 ? '' : 's'} hoje, ${formatMoney(today.revenueTodayCents)}`}
        to="/orcamentos"
      />
      <TodayItem
        icon={CircleCheckBig}
        label="Prontos para entregar"
        value={today.ready}
        detail={today.ready > 0 ? 'Avise o cliente' : 'Nenhum esperando o cliente'}
        tone={today.ready > 0 ? 'good' : undefined}
        to="/orcamentos"
      />
      <TodayItem
        icon={Hourglass}
        label="Aguardando aprovação"
        value={today.awaiting.count}
        detail={
          today.awaiting.expiringSoon > 0
            ? `${today.awaiting.expiringSoon} vence${today.awaiting.expiringSoon > 1 ? 'm' : ''} em até 2 dias`
            : `${formatMoney(today.awaiting.totalCents)} em orçamentos`
        }
        tone={today.awaiting.expiringSoon > 0 ? 'warn' : undefined}
        to="/orcamentos"
      />
      <TodayItem
        icon={KeyRound}
        label="Chaves em uso"
        value={
          <>
            {today.keys.inUse}
            <span className="text-[15px] font-normal text-muted"> de {today.keys.total}</span>
          </>
        }
        detail={`${today.quotesCreatedToday} orçamento${today.quotesCreatedToday === 1 ? '' : 's'} criado${today.quotesCreatedToday === 1 ? '' : 's'} hoje`}
        to="/chaves"
      />
    </section>
  )
}

const TONE: Record<'good' | 'warn', { icon: string; detail: string }> = {
  good: { icon: 'bg-[#e1f3e8] text-[#17693a]', detail: 'text-[#17693a]' },
  warn: { icon: 'bg-[#fff3d6] text-[#7a5200]', detail: 'font-semibold text-[#7a5200]' }
}

function TodayItem(props: { icon: LucideIcon; label: string; value: ReactNode; detail: string; to: string; tone?: 'good' | 'warn' }) {
  const { icon: Icon, label, value, detail, to, tone } = props
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-r border-line px-4 py-3.5 text-ink last:border-r-0 hover:bg-hover hover:no-underline max-[980px]:[&:nth-child(2)]:border-r-0 max-[980px]:[&:nth-child(-n+2)]:border-b"
    >
      <span className={cn('grid size-10 flex-none place-items-center rounded-lg bg-bg text-muted', tone && TONE[tone].icon)}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] text-muted">{label}</span>
        <span className="block text-[24px] leading-tight font-semibold">{value}</span>
        <span className={cn('block truncate text-[12px] text-muted', tone && TONE[tone].detail)}>{detail}</span>
      </span>
    </Link>
  )
}

/* ─── Resultado do período ─────────────────────────────────────────────── */

function PeriodResult({ data }: { data: DashboardData }) {
  const { current: c, previous: p, period, label } = data.period
  const vs = period === 'week' ? 'vs semana anterior' : 'vs mês anterior'
  const margin = c.revenueCents > 0 ? c.profitCents / c.revenueCents : null
  const approval = data.period.quotesSent > 0 ? data.period.quotesApproved / data.period.quotesSent : null

  return (
    <Panel>
      <PanelHeader>
        Resultado {period === 'week' ? 'da semana' : 'do mês'}
        <span className="text-[13px] font-normal text-muted">{label}</span>
      </PanelHeader>
      <div className="grid grid-cols-[300px_minmax(0,1fr)] max-[1080px]:grid-cols-1">
        <div className="flex flex-col gap-5 border-r border-line p-5 max-[1080px]:border-r-0 max-[1080px]:border-b">
          <div>
            <span className="flex items-center gap-2 text-[13px] text-muted">
              <Swatch color="var(--color-series-1)" />
              Faturamento
            </span>
            <span className="mt-0.5 block text-[34px] leading-tight font-semibold">{formatMoney(c.revenueCents)}</span>
            <DeltaChip current={c.revenueCents} previous={p.revenueCents} label={vs} />
          </div>

          <div>
            <span className="flex items-center gap-2 text-[13px] text-muted">
              <Swatch color="var(--color-series-2)" />
              Lucro bruto
            </span>
            <span className="mt-0.5 flex items-baseline gap-2">
              <span className="text-[24px] leading-tight font-semibold">{formatMoney(c.profitCents)}</span>
              {margin !== null && <span className="text-[13px] text-muted">margem {formatPercent(margin)}</span>}
            </span>
            {margin !== null && <MarginMeter margin={margin} />}
            <DeltaChip current={c.profitCents} previous={p.profitCents} label={vs} />
          </div>

          <dl className="m-0 grid grid-cols-3 gap-2 border-t border-line pt-4">
            <MiniStat label="OS entregues" value={String(c.delivered)} />
            <MiniStat label="Ticket médio" value={c.delivered ? formatMoneyCompact(c.averageTicketCents) : '—'} />
            <MiniStat
              label="Aprovação"
              value={approval !== null ? formatPercent(approval) : '—'}
              title={`${data.period.quotesApproved} de ${data.period.quotesSent} orçamentos enviados`}
            />
          </dl>

          <Composition summary={c} />
        </div>

        <div className="min-w-0 px-4 pt-3 pb-2">
          <RevenueProfitChart
            points={data.period.days}
            height={300}
            title={`Faturamento e lucro bruto por dia, ${label}`}
          />
        </div>
      </div>
    </Panel>
  )
}

function DeltaChip({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0) {
    return <span className="mt-1.5 block text-[12px] text-muted">{current === 0 ? 'Sem movimento' : 'Sem base'} {label}</span>
  }
  const change = (current - previous) / Math.abs(previous)
  const flat = Math.abs(change) < 0.005
  const up = change > 0
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-px font-semibold',
          flat ? 'bg-bg text-muted' : up ? 'bg-[#e1f3e8] text-[#17693a]' : 'bg-[#fde6e7] text-[#a10e15]'
        )}
      >
        <Icon size={12} aria-hidden="true" />
        {flat ? 'igual' : `${up ? '+' : '−'}${formatPercent(Math.abs(change))}`}
      </span>
      {label}
    </span>
  )
}

/** Quanto do faturamento virou lucro: preenchimento e trilho no mesmo tom. */
function MarginMeter({ margin }: { margin: number }) {
  const pct = Math.max(0, Math.min(1, margin)) * 100
  return (
    <span
      className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-series-2)_18%,white)]"
      role="img"
      aria-label={`Margem de ${formatPercent(margin)}`}
    >
      <span className="block h-full rounded-full bg-[var(--color-series-2)]" style={{ width: `${pct}%` }} />
    </span>
  )
}

function MiniStat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="m-0 text-[17px] font-semibold">{value}</dd>
    </div>
  )
}

/** Divisão do faturamento entre peças e mão de obra (barra fina; os valores ficam no texto). */
function Composition({ summary }: { summary: PeriodSummary }) {
  const total = summary.partsRevenueCents + summary.laborRevenueCents
  if (total === 0) return null
  const parts = summary.partsRevenueCents / total
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-[12px]">
        <span>
          <span className="text-muted">Peças </span>
          <span className="font-semibold">{formatPercent(parts)}</span>
        </span>
        <span>
          <span className="text-muted">Mão de obra </span>
          <span className="font-semibold">{formatPercent(1 - parts)}</span>
        </span>
      </div>
      <div className="flex h-2 gap-0.5" role="img" aria-label={`Peças ${formatMoney(summary.partsRevenueCents)}, mão de obra ${formatMoney(summary.laborRevenueCents)}`}>
        <span className="rounded-l-full bg-ink/75" style={{ width: `${parts * 100}%` }} />
        <span className="flex-1 rounded-r-full bg-line-strong" />
      </div>
      <div className="mt-1 flex justify-between text-[11.5px] text-muted tabular-nums">
        <span>{formatMoney(summary.partsRevenueCents)}</span>
        <span>{formatMoney(summary.laborRevenueCents)}</span>
      </div>
    </div>
  )
}

/* ─── Listas do dia ────────────────────────────────────────────────────── */

function ReadyList({ today }: { today: DashboardData['today'] }) {
  return (
    <ListPanel icon={CircleCheckBig} title="Prontos para entregar" count={today.readyList.length} empty="Nenhum carro pronto esperando o cliente.">
      {today.readyList.map((o) => (
        <Row key={o.quoteId} to={`/orcamentos/${o.quoteId}`}>
          <Plate plate={o.plate} />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{o.customerName}</span>
            <span className="block text-[12px] text-muted">OS {formatDocNumber(o.workOrderNumber)}</span>
          </span>
          {o.keyTagNumber !== null && <KeyChip n={o.keyTagNumber} />}
          <span className="num w-[92px] font-semibold">{formatMoney(o.totalCents)}</span>
        </Row>
      ))}
    </ListPanel>
  )
}

function AwaitingList({ today }: { today: DashboardData['today'] }) {
  // "Vence logo": validade nos próximos 3 dias, contados a partir da data do painel.
  const soon = new Date(today.date).getTime() + 3 * 86_400_000
  return (
    <ListPanel icon={Hourglass} title="Aguardando aprovação" count={today.awaitingList.length} empty="Nenhum orçamento esperando resposta.">
      {today.awaitingList.map((q) => {
        const expiring = new Date(q.validUntil).getTime() < soon
        return (
          <Row key={q.quoteId} to={`/orcamentos/${q.quoteId}`}>
            <Plate plate={q.plate} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{q.customerName}</span>
              <span className="block text-[12px] text-muted">
                Orç. {q.number}
                {q.sentAt && `, enviado ${formatDate(q.sentAt)}`}
              </span>
            </span>
            <span className={cn('tag', expiring ? 't-aguardando font-semibold' : 't-entregue')}>vence {formatDate(q.validUntil).slice(0, 5)}</span>
            <span className="num w-[92px] font-semibold">{formatMoney(q.totalCents)}</span>
          </Row>
        )
      })}
    </ListPanel>
  )
}

function ListPanel(props: { icon: LucideIcon; title: string; count: number; empty: string; children: ReactNode[] }) {
  const { icon: Icon, title, count, empty, children } = props
  return (
    <Panel className="mb-0">
      <PanelHeader>
        <span className="flex items-center gap-2">
          <Icon size={16} className="text-muted" aria-hidden="true" />
          {title}
        </span>
        <span className="min-w-6 rounded-full bg-bg px-2 text-center text-[12.5px] font-semibold text-muted">{count}</span>
      </PanelHeader>
      {children.length === 0 ? (
        <p className="m-0 px-4 py-7 text-center text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="m-0 max-h-[264px] list-none overflow-y-auto p-0">{children}</ul>
      )}
    </Panel>
  )
}

function Row({ to, children }: { to: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <li
      tabIndex={0}
      className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-hover focus-visible:bg-hover"
      onClick={() => navigate(to)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(to)}
    >
      {children}
    </li>
  )
}

function KeyChip({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-side px-1.5 py-px text-[12.5px] font-semibold text-side-strong">
      <KeyRound size={12} aria-hidden="true" />
      {formatKeyTag(n)}
    </span>
  )
}

function Swatch({ color }: { color: string }) {
  return <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
}

const sum = (points: DashboardData['months'], key: 'revenueCents' | 'profitCents') =>
  points.reduce((s, p) => s + p[key], 0)

/** "segunda-feira, 24 de novembro" */
function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
