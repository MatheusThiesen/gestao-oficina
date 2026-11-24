import { ChevronLeft, ChevronRight, KeyRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { DashboardData, DashboardPeriod } from '@shared/dashboard'
import { formatDate, formatDocNumber, formatKeyTag, formatMoney, formatPercent } from '@shared/format'
import { RevenueProfitChart } from '@/components/charts/revenue-profit-chart'
import { FormError } from '@/components/flash'
import { PageHeader } from '@/components/layout/page-header'
import { Plate } from '@/components/plate'
import { StatTile } from '@/components/stat-tile'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Segmented } from '@/components/ui/segmented'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'

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
      <PageHeader title="Painel" aside={<span className="text-[13px] text-muted">{formatDate(data.today.date)}</span>} />
      <TodaySection today={data.today} />

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[17px] font-semibold">Análise {period === 'week' ? 'da semana' : 'do mês'}</h2>
        <div className="flex items-center gap-2">
          <Segmented
            label="Período"
            options={PERIODS}
            value={period}
            onChange={(p) => {
              setPeriod(p)
              setOffset(0)
            }}
          />
          <div className="mb-3 flex items-center gap-1">
            <Button variant="icon" className="size-8" aria-label="Período anterior" onClick={() => setOffset((o) => o - 1)}>
              <ChevronLeft size={17} aria-hidden="true" />
            </Button>
            <span className="min-w-[150px] text-center font-semibold tabular-nums">{data.period.label}</span>
            <Button
              variant="icon"
              className="size-8"
              aria-label="Próximo período"
              disabled={offset >= 0}
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      <PeriodSection data={data} />

      <Panel className="mt-4">
        <PanelHeader>Faturamento × lucro bruto nos últimos 6 meses</PanelHeader>
        <div className="p-4">
          <RevenueProfitChart points={data.months} height={220} title="Faturamento e lucro bruto por mês" />
        </div>
      </Panel>
      <p className="m-0 text-[12px] text-muted">
        Faturamento: OS entregues, pela data de entrega. Lucro bruto: faturamento menos o custo das peças (sem despesas
        da oficina).
      </p>
    </>
  )
}

function TodaySection({ today }: { today: DashboardData['today'] }) {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
        <StatTile
          label="Carros na oficina"
          value={today.inShop}
          hint={today.ready > 0 ? `${today.ready} pronto${today.ready > 1 ? 's' : ''} para entregar` : 'Nenhum pronto ainda'}
        />
        <StatTile
          label="Aguardando aprovação"
          value={today.awaiting.count}
          hint={
            <>
              {formatMoney(today.awaiting.totalCents)} em orçamentos
              {today.awaiting.expiringSoon > 0 && (
                <span className="block font-semibold text-[#7a5200]">{today.awaiting.expiringSoon} vence(m) em até 2 dias</span>
              )}
            </>
          }
        />
        <StatTile
          label="Entregues hoje"
          value={today.deliveredToday}
          hint={`${formatMoney(today.revenueTodayCents)} faturados`}
        />
        <StatTile label="Orçamentos criados hoje" value={today.quotesCreatedToday} />
        <StatTile
          label="Chaves em uso"
          value={
            <>
              {today.keys.inUse}
              <span className="text-[15px] font-normal text-muted"> de {today.keys.total}</span>
            </>
          }
          hint={<Link to="/chaves">Ver chaves</Link>}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 items-start gap-4 max-[980px]:grid-cols-1">
        <ListPanel title="Prontos para entregar" empty="Nenhum carro pronto aguardando o cliente.">
          {today.readyList.map((o) => (
            <Row key={o.quoteId} to={`/orcamentos/${o.quoteId}`}>
              <Plate plate={o.plate} />
              <span className="min-w-0 flex-1 truncate">
                {o.customerName}
                <span className="block text-[12px] text-muted">OS {formatDocNumber(o.workOrderNumber)}</span>
              </span>
              {o.keyTagNumber !== null && <KeyChip n={o.keyTagNumber} />}
              <span className="num font-semibold">{formatMoney(o.totalCents)}</span>
            </Row>
          ))}
        </ListPanel>
        <ListPanel title="Aguardando aprovação (cobrar retorno)" empty="Nenhum orçamento esperando resposta.">
          {today.awaitingList.map((q) => (
            <Row key={q.quoteId} to={`/orcamentos/${q.quoteId}`}>
              <Plate plate={q.plate} />
              <span className="min-w-0 flex-1 truncate">
                {q.customerName}
                <span className="block text-[12px] text-muted">
                  Orç. {q.number}
                  {q.sentAt && `, enviado ${formatDate(q.sentAt)}`}, vence {formatDate(q.validUntil)}
                </span>
              </span>
              <span className="num font-semibold">{formatMoney(q.totalCents)}</span>
            </Row>
          ))}
        </ListPanel>
      </div>
    </>
  )
}

function PeriodSection({ data }: { data: DashboardData }) {
  const { current: c, previous: p, period } = data.period
  const vs = period === 'week' ? 'vs semana anterior' : 'vs mês anterior'
  const margin = c.revenueCents > 0 ? c.profitCents / c.revenueCents : null
  const prevMargin = p.revenueCents > 0 ? p.profitCents / p.revenueCents : null
  const approval = data.period.quotesSent > 0 ? data.period.quotesApproved / data.period.quotesSent : null
  const partsShare = c.partsRevenueCents + c.laborRevenueCents > 0 ? c.partsRevenueCents / (c.partsRevenueCents + c.laborRevenueCents) : null

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
        <StatTile label="Faturamento" value={formatMoney(c.revenueCents)} compare={{ current: c.revenueCents, previous: p.revenueCents, label: vs }} />
        <StatTile label="Lucro bruto" value={formatMoney(c.profitCents)} compare={{ current: c.profitCents, previous: p.profitCents, label: vs }} />
        <StatTile
          label="Margem"
          value={margin !== null ? formatPercent(margin) : '—'}
          hint={prevMargin !== null ? `Antes: ${formatPercent(prevMargin)}` : undefined}
        />
        <StatTile
          label="OS entregues"
          value={c.delivered}
          compare={{ current: c.delivered, previous: p.delivered, label: vs }}
          hint={c.delivered > 0 ? `Ticket médio ${formatMoney(c.averageTicketCents)}` : undefined}
        />
        <StatTile
          label="Aprovação de orçamentos"
          value={approval !== null ? formatPercent(approval) : '—'}
          hint={`${data.period.quotesApproved} de ${data.period.quotesSent} enviados`}
        />
      </div>

      <Panel className="mt-4">
        <PanelHeader>Faturamento × lucro bruto por dia</PanelHeader>
        <div className="p-4">
          <RevenueProfitChart points={data.period.days} title={`Faturamento e lucro bruto por dia, ${data.period.label}`} />
          {partsShare !== null && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1.5 flex justify-between text-[12.5px] text-muted">
                <span>Peças {formatMoney(c.partsRevenueCents)} ({formatPercent(partsShare)})</span>
                <span>Mão de obra {formatMoney(c.laborRevenueCents)} ({formatPercent(1 - partsShare)})</span>
              </div>
              {/* Composição do faturamento: barra fina, os números ficam no texto acima. */}
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                <span className="rounded-l-full bg-[var(--color-series-1)]" style={{ width: `${partsShare * 100}%` }} />
                <span className="flex-1 rounded-r-full bg-line-strong" />
              </div>
            </div>
          )}
        </div>
      </Panel>
    </>
  )
}

function ListPanel({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <Panel className="mb-0">
      <PanelHeader>
        {title}
        <span className="text-[13px] font-normal text-muted">{children.length}</span>
      </PanelHeader>
      {children.length === 0 ? (
        <p className="m-0 px-4 py-6 text-center text-muted">{empty}</p>
      ) : (
        <ul className="m-0 max-h-[300px] list-none overflow-y-auto p-0">{children}</ul>
      )}
    </Panel>
  )
}

function Row({ to, children }: { to: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <li
      className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2 last:border-b-0 hover:bg-hover"
      onClick={() => navigate(to)}
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
