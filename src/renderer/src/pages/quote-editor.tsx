import { FileDown, FolderOpen, KeyRound, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatDocNumber, formatKeyTag, parseScaled } from '@shared/format'
import type { QuoteView } from '@shared/quotes'
import type { AppSettings } from '@shared/settings'
import { Flash, FormError } from '@/components/flash'
import { PageHeader } from '@/components/layout/page-header'
import { ConditionsAndSummary } from '@/components/quote/conditions-summary'
import { CustomerVehiclePanel } from '@/components/quote/customer-vehicle-panel'
import { ItemsTable } from '@/components/quote/items-table'
import { StatusNotice, StatusTimeline, WorkflowActions } from '@/components/quote/workflow-bar'
import { StatusTag } from '@/components/status-tag'
import { Button } from '@/components/ui/button'
import { useFlash } from '@/hooks/use-flash'
import { useDebounced, useIpcQuery } from '@/hooks/use-ipc-query'
import { useSaveShortcut } from '@/hooks/use-shortcuts'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'
import { draftFromView, draftToInput, emptyDraft, itemToInput, type QuoteDraft } from '@/lib/quote-draft'

export function QuoteEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const quoteId = id ? Number(id) : null
  const { data: settings, error: settingsError } = useIpcQuery(() => call('settings:get'), [])
  const { data: quote, error, reload } = useIpcQuery<QuoteView | null>(
    () => (quoteId ? call('quotes:get', { id: quoteId }) : Promise.resolve(null)),
    [quoteId]
  )

  if (error || settingsError) return <FormError message={error ?? settingsError} />
  if (!settings || quote === undefined) return null

  return (
    <QuoteEditor
      key={quote ? quote.id : 'novo'}
      settings={settings}
      quote={quote}
      initialPlate={params.get('placa') ?? ''}
      onReload={reload}
    />
  )
}

interface EditorProps {
  settings: AppSettings
  quote: QuoteView | null
  initialPlate: string
  onReload: () => void
}

function QuoteEditor({ settings, quote, initialPlate, onReload }: EditorProps) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<QuoteDraft>(() => (quote ? draftFromView(quote) : emptyDraft(settings, initialPlate)))
  const submit = useSubmit()
  const [flash, showFlash] = useFlash(4500)
  const readOnly = quote ? !quote.editable : false
  const update = (patch: Partial<QuoteDraft>) => setDraft((d) => ({ ...d, ...patch }))

  // Totais calculados no main (mesma regra do PDF), com um pequeno atraso enquanto digita.
  const calcInput = useMemo(
    () => ({ items: draft.items.map(itemToInput), discountBp: clampBp(parseScaled(draft.discount, 2)) }),
    [draft.items, draft.discount]
  )
  const debouncedCalc = useDebounced(calcInput, 80)
  const { data: calc } = useIpcQuery(() => call('quotes:calculate', debouncedCalc), [debouncedCalc])

  /** Grava o rascunho; devolve o id (ou undefined se houve erro). */
  async function persist(): Promise<number | undefined> {
    const result = await submit.run(() => call('quotes:save', draftToInput(draft)))
    return result?.id
  }

  async function save() {
    if (readOnly) return
    const id = await persist()
    if (!id) return
    showFlash('Orçamento salvo.')
    if (!quote) navigate(`/orcamentos/${id}`, { replace: true })
    else onReload()
  }

  /** Salva as alterações (se editável) e gera o PDF, que abre em seguida. */
  async function generatePdf() {
    const id = readOnly ? quote?.id : await persist()
    if (!id) return
    const pdf = await submit.run(() => call('quotes:pdf', { id }))
    if (!pdf) return
    showFlash('PDF gerado.')
    if (!quote) navigate(`/orcamentos/${id}`, { replace: true })
    else if (!readOnly) onReload()
  }
  useSaveShortcut(save)

  const wo = quote?.workOrder
  const title = quote ? (wo ? `OS ${formatDocNumber(wo.number)}` : `Orçamento ${quote.number}`) : 'Novo orçamento'

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Orçamentos', to: '/orcamentos' },
          { label: quote ? `${quote.number}${quote.version > 1 ? ` v${quote.version}` : ''}` : 'Novo' }
        ]}
        title={title}
        aside={
          <span className="flex items-center gap-2">
            <StatusTag status={quote?.displayStatus ?? 'RASCUNHO'} />
            {wo?.keyTagNumber != null && (
              <span className="inline-flex items-center gap-1 rounded-md bg-side px-2 py-0.5 text-[13px] font-semibold text-side-strong">
                <KeyRound size={13} aria-hidden="true" />
                Chave {formatKeyTag(wo.keyTagNumber)}
              </span>
            )}
            {wo && <span className="text-[13px] text-muted">Orçamento {quote!.number}</span>}
          </span>
        }
        actions={
          <>
            <Flash message={flash} />
            {!readOnly && (
              <Button onClick={save} disabled={submit.busy} title="Ctrl+S">
                <Save size={15} aria-hidden="true" />
                Salvar
              </Button>
            )}
            <Button onClick={generatePdf} disabled={submit.busy} title={readOnly ? undefined : 'Salva e gera o PDF'}>
              <FileDown size={15} aria-hidden="true" />
              Gerar PDF
            </Button>
            <Button variant="icon" className="size-8" aria-label="Abrir pasta dos PDFs" title="Abrir pasta dos PDFs" onClick={() => void call('quotes:openPdfFolder')}>
              <FolderOpen size={16} aria-hidden="true" />
            </Button>
            <WorkflowActions
              quote={quote}
              persist={persist}
              readOnly={readOnly}
              onDone={(message, id) => {
                showFlash(message)
                if (!quote) navigate(`/orcamentos/${id}`, { replace: true })
                else onReload()
              }}
            />
          </>
        }
      />

      <FormError message={submit.error} />
      <StatusTimeline quote={quote} />
      {quote && <StatusNotice quote={quote} />}

      <CustomerVehiclePanel draft={draft} update={update} errors={submit.fields} readOnly={readOnly} locked={!!quote} />
      <ItemsTable
        items={draft.items}
        priced={calc?.items}
        onChange={(items) => update({ items })}
        settings={settings}
        hourlyRateCents={parseScaled(draft.hourlyRate, 2) ?? settings.hourlyRateCents}
        errors={submit.fields}
        readOnly={readOnly}
      />
      <ConditionsAndSummary defaultWarrantyDays={settings.warrantyDays} draft={draft} update={update} totals={calc?.totals} errors={submit.fields} readOnly={readOnly} />
    </>
  )
}

function clampBp(bp: number | null): number {
  return Math.min(10_000, Math.max(0, bp ?? 0))
}
