import { formatMoney } from '@shared/format'
import { PAYMENT_METHODS, type QuoteTotalsView } from '@shared/quotes'
import { Field, FieldGrid } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Panel, PanelBody, PanelHeader } from '@/components/ui/panel'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { QuoteDraft } from '@/lib/quote-draft'

interface Props {
  draft: QuoteDraft
  update: (patch: Partial<QuoteDraft>) => void
  totals: QuoteTotalsView | undefined
  errors: Record<string, string>
  readOnly: boolean
}

export function ConditionsAndSummary({ draft, update, totals, errors, readOnly }: Props) {
  const margin =
    totals && totals.partsCents > 0
      ? `${((totals.partsProfitCents / totals.partsCents) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
      : '0%'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[980px]:grid-cols-1">
      <Panel>
        <PanelHeader>Condições</PanelHeader>
        <PanelBody>
          <FieldGrid>
            <Field label="Validade (dias)" htmlFor="q-val" error={errors.validityDays}>
              <Input id="q-val" inputMode="numeric" disabled={readOnly} value={draft.validityDays} onChange={(e) => update({ validityDays: e.target.value })} />
            </Field>
            <Field label="Previsão de entrega" htmlFor="q-ent">
              <Input
                id="q-ent"
                type="datetime-local"
                disabled={readOnly}
                value={draft.expectedDeliveryAt}
                onChange={(e) => update({ expectedDeliveryAt: e.target.value })}
              />
            </Field>
            <Field label="Pagamento" htmlFor="q-pag">
              <Select id="q-pag" disabled={readOnly} value={draft.paymentMethod} onChange={(e) => update({ paymentMethod: e.target.value })}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Garantia (dias)" htmlFor="q-gar" error={errors.warrantyDays}>
              <Input id="q-gar" inputMode="numeric" disabled={readOnly} value={draft.warrantyDays} onChange={(e) => update({ warrantyDays: e.target.value })} />
            </Field>
            <Field label="Observações para o cliente" htmlFor="q-obs" className="col-span-full">
              <Textarea id="q-obs" rows={3} disabled={readOnly} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
            </Field>
          </FieldGrid>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>Resumo</PanelHeader>
        <PanelBody className="flex flex-col gap-2">
          <Row label="Peças" value={totals && formatMoney(totals.partsCents)} />
          <Row label="Mão de obra" value={totals && formatMoney(totals.laborCents)} />
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted">
              Desconto
              <Input
                aria-label="Desconto em %"
                inputMode="decimal"
                disabled={readOnly}
                className="h-[26px] w-14 text-right"
                value={draft.discount}
                onChange={(e) => update({ discount: e.target.value })}
              />
              %
            </span>
            <span className="num">{totals && `− ${formatMoney(totals.discountCents)}`}</span>
          </div>
          {errors.discountBp && <span className="text-[12px] text-brand-text">{errors.discountBp}</span>}
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <span className="font-semibold">Total</span>
            <span className="num text-[22px] font-semibold">{totals && formatMoney(totals.totalCents)}</span>
          </div>
          <div className="mt-1.5 rounded-md border border-dashed border-line-strong bg-[#f7f7f8] p-2.5 text-[13px]">
            <Row label="Custo das peças" value={totals && formatMoney(totals.partsCostCents)} />
            <Row label="Lucro nas peças" value={totals && `${formatMoney(totals.partsProfitCents)} (${margin})`} />
            <p className="mt-1.5 mb-0 text-[12px] text-muted">Uso interno. Não aparece no PDF.</p>
          </div>
        </PanelBody>
      </Panel>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="num">{value}</span>
    </div>
  )
}
