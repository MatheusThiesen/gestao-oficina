import { Ban, Check, CircleCheckBig, Copy, FileText, KeyRound, MessageCircle, PackageCheck, RotateCcw, Send, ThumbsDown, Undo2, Wrench } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatDate, formatKeyTag, formatKm, parseInteger } from '@shared/format'
import { APPROVAL_CHANNEL_LABEL, type ApprovalChannel, type QuoteView } from '@shared/quotes'
import type { SendResult, WorkflowAction } from '@shared/workflow'
import { FormError } from '@/components/flash'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useIpcQuery } from '@/hooks/use-ipc-query'
import { useSubmit } from '@/hooks/use-submit'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'

/* ─── Linha do tempo ─────────────────────────────────────────────────────── */

const STEPS = ['Rascunho', 'Aguardando', 'Aprovado', 'Em execução', 'Pronto', 'Entregue'] as const

function stepIndex(q: QuoteView): number {
  const wo = q.workOrder?.status
  if (wo === 'ENTREGUE') return 5
  if (wo === 'PRONTO') return 4
  if (wo === 'EM_EXECUCAO') return 3
  if (q.status === 'APROVADO') return 2
  if (q.status === 'AGUARDANDO_APROVACAO') return 1
  return 0
}

/** Etapas do orçamento à OS. Recusado, expirado e cancelada aparecem como desvio no ponto em que pararam. */
export function StatusTimeline({ quote }: { quote: QuoteView | null }) {
  const current = quote ? stepIndex(quote) : 0
  const stopped =
    quote?.workOrder?.status === 'CANCELADA'
      ? 'OS cancelada'
      : quote?.status === 'RECUSADO'
        ? 'Recusado'
        : quote?.status === 'EXPIRADO'
          ? 'Expirado'
          : null

  return (
    <ol className="mb-4 flex list-none items-center gap-0 overflow-x-auto rounded-lg border border-line bg-panel p-0 px-2 py-2.5" aria-label="Etapas">
      {STEPS.map((label, i) => {
        const done = i < current || (i === current && current === 5)
        const here = i === current && !stopped && current !== 5
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center">
            <span className="flex min-w-0 items-center gap-2 px-2">
              <span
                className={cn(
                  'grid size-6 flex-none place-items-center rounded-full border text-[11.5px] font-semibold',
                  done && 'border-[#17693a] bg-[#17693a] text-white',
                  here && 'border-brand bg-brand text-brand-fg',
                  !done && !here && 'border-line-strong bg-white text-muted'
                )}
              >
                {done ? <Check size={13} aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn('truncate text-[13px]', here ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted')}>
                {i === current && stopped ? <span className="font-semibold text-[#a10e15]">{stopped}</span> : label}
              </span>
            </span>
            {i < STEPS.length - 1 && <span className={cn('h-px min-w-3 flex-1', i < current ? 'bg-[#17693a]' : 'bg-line')} />}
          </li>
        )
      })}
    </ol>
  )
}

/* ─── Ações ──────────────────────────────────────────────────────────────── */

type DialogKind = 'approve' | 'openWorkOrder' | 'refuse' | 'deliver' | 'cancel' | null

interface ActionsProps {
  quote: QuoteView | null
  /** Salva as alterações do rascunho antes de mudar o status; devolve o id ou undefined em erro. */
  persist: () => Promise<number | undefined>
  readOnly: boolean
  onDone: (message: string, id: number) => void
}

const ACTION_META: Record<WorkflowAction, { label: string; icon: typeof Send }> = {
  send: { label: 'Enviar para aprovação', icon: Send },
  approve: { label: 'Registrar aprovação', icon: CircleCheckBig },
  refuse: { label: 'Recusado pelo cliente', icon: ThumbsDown },
  reopen: { label: 'Reabrir orçamento', icon: RotateCcw },
  openWorkOrder: { label: 'Abrir OS', icon: Wrench },
  markReady: { label: 'Marcar como pronto', icon: PackageCheck },
  backToExecution: { label: 'Voltar para execução', icon: Undo2 },
  deliver: { label: 'Entregar ao cliente', icon: KeyRound },
  cancelWorkOrder: { label: 'Cancelar OS', icon: Ban }
}

/* As ações que não devolvem dados retornam `true` no sucesso: o retorno indica se deu certo. */

/** Botões de status do orçamento/OS. O primeiro permitido é a ação principal. */
export function WorkflowActions({ quote, persist, readOnly, onDone }: ActionsProps) {
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [sent, setSent] = useState<{ id: number; result: SendResult } | null>(null)
  const submit = useSubmit()
  // Orçamento novo (ainda não salvo) pode ser enviado ou aprovado: salva primeiro.
  const actions: WorkflowAction[] = quote ? quote.actions : ['send', 'approve']
  if (actions.length === 0) return null

  async function ensureSaved(): Promise<number | undefined> {
    return readOnly ? quote?.id : persist()
  }

  async function run(action: WorkflowAction) {
    if (action === 'approve') return setDialog('approve')
    if (action === 'openWorkOrder') return setDialog('openWorkOrder')
    if (action === 'refuse') return setDialog('refuse')
    if (action === 'deliver') return setDialog('deliver')
    if (action === 'cancelWorkOrder') return setDialog('cancel')

    const id = await ensureSaved()
    if (!id) return
    if (action === 'send') {
      // Nada abre sozinho: a janela seguinte oferece WhatsApp, copiar a mensagem ou mostrar o PDF.
      const result = await submit.run(() => call('workflow:send', { id }))
      if (result) setSent({ id, result })
    } else if (action === 'reopen') {
      if (await submit.run(async () => (await call('workflow:reopen', { id }), true))) onDone('Orçamento reaberto.', id)
    } else if (action === 'markReady') {
      if (await submit.run(async () => (await call('workflow:markReady', { id }), true))) onDone('OS pronta para entrega.', id)
    } else if (action === 'backToExecution') {
      if (await submit.run(async () => (await call('workflow:backToExecution', { id }), true))) onDone('OS voltou para execução.', id)
    }
  }

  return (
    <>
      {actions.map((action, i) => {
        const { icon: Icon } = ACTION_META[action]
        // Já enviado: o envio vira "Reenviar" (botão secundário e curto).
        const label = action === 'send' && quote?.status === 'AGUARDANDO_APROVACAO' ? 'Reenviar' : ACTION_META[action].label
        const danger = action === 'cancelWorkOrder' || action === 'refuse'
        return (
          <Button
            key={action}
            variant={i === 0 ? 'primary' : 'default'}
            className={cn(danger && 'text-[#a10e15]')}
            disabled={submit.busy}
            onClick={() => void run(action)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </Button>
        )
      })}
      {submit.error && <span className="basis-full text-right text-[13px] text-brand-text">{submit.error}</span>}

      {sent && (
        <SentDialog
          result={sent.result}
          onClose={() => {
            onDone('Orçamento aguardando aprovação.', sent.id)
            setSent(null)
          }}
        />
      )}
      {dialog === 'approve' && (
        <ApproveDialog quote={quote} ensureSaved={ensureSaved} onClose={() => setDialog(null)} onDone={onDone} />
      )}
      {dialog === 'openWorkOrder' && quote && <OpenWorkOrderDialog quote={quote} onClose={() => setDialog(null)} onDone={onDone} />}
      {dialog === 'refuse' && quote && <RefuseDialog quote={quote} onClose={() => setDialog(null)} onDone={onDone} />}
      {dialog === 'deliver' && quote && <DeliverDialog quote={quote} onClose={() => setDialog(null)} onDone={onDone} />}
      {dialog === 'cancel' && quote && <CancelDialog quote={quote} onClose={() => setDialog(null)} onDone={onDone} />}
    </>
  )
}

type DialogProps = { quote: QuoteView; onClose: () => void; onDone: (message: string, id: number) => void }

/** Depois de enviar: o PDF está pronto e o usuário escolhe como mandar ao cliente. */
function SentDialog({ result, onClose }: { result: SendResult; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Modal
      open
      title="Orçamento pronto para enviar"
      onClose={onClose}
      footer={<Button onClick={onClose}>Fechar</Button>}
    >
      <p className="m-0 text-[13.5px] text-muted">
        O PDF foi gerado e o orçamento está aguardando aprovação. Escolha como mandar para o cliente:
      </p>
      <blockquote className="m-0 rounded-md border border-line bg-bg/60 px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line">
        {result.message}
      </blockquote>
      <div className="flex flex-col gap-2">
        {result.whatsappUrl ? (
          <Button variant="primary" className="h-9 justify-start" onClick={() => void call('share:openWhatsapp', { url: result.whatsappUrl! })}>
            <MessageCircle size={16} aria-hidden="true" />
            Abrir conversa no WhatsApp (mensagem pronta)
          </Button>
        ) : (
          <p className="m-0 text-[12.5px] text-muted">O cliente não tem WhatsApp cadastrado: mande o PDF por outro meio.</p>
        )}
        <Button
          className="h-9 justify-start"
          onClick={async () => {
            await call('share:copy', { text: result.message })
            setCopied(true)
          }}
        >
          <Copy size={16} aria-hidden="true" />
          {copied ? 'Mensagem copiada' : 'Copiar mensagem'}
        </Button>
        <Button className="h-9 justify-start" onClick={() => void call('share:showPdf', { path: result.pdfPath })}>
          <FileText size={16} aria-hidden="true" />
          Mostrar o PDF na pasta (para anexar)
        </Button>
      </div>
    </Modal>
  )
}

/** Seleção de chave: sugere a menor livre; dá para escolher outra ou nenhuma. */
function KeyTagSelect({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const { data } = useIpcQuery(() => call('workflow:keyTags'), [])
  const [initialized, setInitialized] = useState(false)
  if (data && !initialized) {
    setInitialized(true)
    if (value === '' && data.suggested !== null) onChange(String(data.suggested))
  }
  return (
    <Field label="Chave (chaveiro numerado)" htmlFor="wf-key" error={error}>
      <Select id="wf-key" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="none">Sem chave</option>
        {data?.free.map((n) => (
          <option key={n} value={String(n)}>
            Chave {formatKeyTag(n)}
            {n === data.suggested ? ' (sugerida)' : ''}
          </option>
        ))}
      </Select>
      {data && data.free.length === 0 && <span className="text-[12px] text-muted">Todas as chaves estão em uso.</span>}
    </Field>
  )
}

const keyValue = (v: string) => (v === '' || v === 'none' ? null : Number(v))

function ApproveDialog({
  quote,
  ensureSaved,
  onClose,
  onDone
}: {
  quote: QuoteView | null
  ensureSaved: () => Promise<number | undefined>
  onClose: () => void
  onDone: (message: string, id: number) => void
}) {
  const [channel, setChannel] = useState<ApprovalChannel>('WHATSAPP')
  const [approvedBy, setApprovedBy] = useState(quote?.customer.name ?? '')
  const [openNow, setOpenNow] = useState(true)
  const [key, setKey] = useState('')
  const submit = useSubmit()

  async function confirm() {
    const id = await ensureSaved()
    if (!id) return onClose()
    const result = await submit.run(() =>
      call('workflow:approve', { id, channel, approvedBy, openWorkOrder: openNow, keyTagNumber: openNow ? keyValue(key) : null })
    )
    if (!result) return
    onClose()
    onDone(result.workOrderNumber ? `Aprovado. OS ${result.workOrderNumber} aberta.` : 'Aprovação registrada.', id)
  }

  return (
    <Modal
      open
      title="Registrar aprovação"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={confirm} disabled={submit.busy}>
            <CircleCheckBig size={15} aria-hidden="true" />
            Aprovar{openNow ? ' e abrir OS' : ''}
          </Button>
        </>
      }
    >
      <FormError message={submit.error && !Object.keys(submit.fields).length ? submit.error : null} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Aprovado por" htmlFor="wf-by" error={submit.fields.approvedBy}>
          <Input id="wf-by" autoFocus value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
        </Field>
        <Field label="Como aprovou" htmlFor="wf-channel">
          <Select id="wf-channel" value={channel} onChange={(e) => setChannel(e.target.value as ApprovalChannel)}>
            {(Object.keys(APPROVAL_CHANNEL_LABEL) as ApprovalChannel[]).map((c) => (
              <option key={c} value={c}>
                {APPROVAL_CHANNEL_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" className="accent-[var(--color-brand)]" checked={openNow} onChange={(e) => setOpenNow(e.target.checked)} />
        Abrir a OS agora (o carro fica na oficina)
      </label>
      {openNow && <KeyTagSelect value={key} onChange={setKey} error={submit.fields.keyTagNumber} />}
      <p className="m-0 text-[12.5px] text-muted">
        O orçamento fica guardado exatamente como foi aprovado e não pode mais ser alterado.
      </p>
    </Modal>
  )
}

function OpenWorkOrderDialog({ quote, onClose, onDone }: DialogProps) {
  const [key, setKey] = useState('')
  const submit = useSubmit()
  async function confirm() {
    const r = await submit.run(() => call('workflow:openWorkOrder', { id: quote.id, keyTagNumber: keyValue(key) }))
    if (!r) return
    onClose()
    onDone(`OS ${r.workOrderNumber} aberta.`, quote.id)
  }
  return (
    <Modal
      open
      title="Abrir OS"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={confirm} disabled={submit.busy}>
            <Wrench size={15} aria-hidden="true" />
            Abrir OS
          </Button>
        </>
      }
    >
      <FormError message={submit.error && !Object.keys(submit.fields).length ? submit.error : null} />
      <KeyTagSelect value={key} onChange={setKey} error={submit.fields.keyTagNumber} />
    </Modal>
  )
}

function RefuseDialog({ quote, onClose, onDone }: DialogProps) {
  const [reason, setReason] = useState('')
  const submit = useSubmit()
  async function confirm() {
    if (await submit.run(async () => (await call('workflow:refuse', { id: quote.id, reason }), true))) {
      onClose()
      onDone('Orçamento marcado como recusado.', quote.id)
    }
  }
  return (
    <Modal
      open
      title="Recusado pelo cliente"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Voltar</Button>
          <Button variant="primary" onClick={confirm} disabled={submit.busy}>
            Marcar como recusado
          </Button>
        </>
      }
    >
      <FormError message={submit.error} />
      <Field label="Motivo (opcional)" htmlFor="wf-reason">
        <Textarea id="wf-reason" rows={3} autoFocus placeholder="Ex.: achou caro, vai fazer depois" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <p className="m-0 text-[12.5px] text-muted">Dá para reabrir depois, se o cliente mudar de ideia.</p>
    </Modal>
  )
}

function DeliverDialog({ quote, onClose, onDone }: DialogProps) {
  const entry = quote.workOrder?.entryKm ?? quote.entryKm
  const [km, setKm] = useState('')
  const submit = useSubmit()
  async function confirm() {
    if (await submit.run(async () => (await call('workflow:deliver', { id: quote.id, exitKm: parseInteger(km) }), true))) {
      onClose()
      onDone(quote.warrantyDays > 0 ? `Entregue. Garantia de ${quote.warrantyDays} dias a partir de hoje.` : 'Entregue.', quote.id)
    }
  }
  return (
    <Modal
      open
      title="Entregar ao cliente"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={confirm} disabled={submit.busy}>
            <KeyRound size={15} aria-hidden="true" />
            Confirmar entrega
          </Button>
        </>
      }
    >
      <FormError message={submit.error && !Object.keys(submit.fields).length ? submit.error : null} />
      <Field label={`KM de saída (opcional${entry != null ? `, entrada ${formatKm(entry)}` : ''})`} htmlFor="wf-km" error={submit.fields.exitKm}>
        <Input
          id="wf-km"
          autoFocus
          inputMode="numeric"
          value={km}
          onChange={(e) => {
            const n = parseInteger(e.target.value)
            setKm(n != null ? formatKm(n) : '')
          }}
        />
      </Field>
      <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] text-muted">
        {quote.workOrder?.keyTagNumber != null && <li>A chave {formatKeyTag(quote.workOrder.keyTagNumber)} fica livre.</li>}
        <li>{quote.warrantyDays > 0 ? `A garantia de ${quote.warrantyDays} dias começa a contar hoje.` : 'Serviço sem garantia.'}</li>
        <li>Entra no faturamento do painel.</li>
      </ul>
    </Modal>
  )
}

function CancelDialog({ quote, onClose, onDone }: DialogProps) {
  const [reason, setReason] = useState('')
  const submit = useSubmit()
  async function confirm() {
    if (await submit.run(async () => (await call('workflow:cancel', { id: quote.id, reason }), true))) {
      onClose()
      onDone('OS cancelada.', quote.id)
    }
  }
  return (
    <Modal
      open
      title={`Cancelar OS ${quote.workOrder?.number ?? ''}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Voltar</Button>
          <Button variant="primary" onClick={confirm} disabled={submit.busy}>
            <Ban size={15} aria-hidden="true" />
            Cancelar OS
          </Button>
        </>
      }
    >
      <FormError message={submit.error && !Object.keys(submit.fields).length ? submit.error : null} />
      <Field label="Motivo" htmlFor="wf-cancel" error={submit.fields.reason}>
        <Textarea id="wf-cancel" rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <p className="m-0 text-[12.5px] text-muted">
        {quote.workOrder?.keyTagNumber != null ? `A chave ${formatKeyTag(quote.workOrder.keyTagNumber)} fica livre. ` : ''}
        Não entra no faturamento. Esta ação não pode ser desfeita.
      </p>
    </Modal>
  )
}

/* ─── Avisos de situação ─────────────────────────────────────────────────── */

/** Faixa com o que aconteceu: aprovação, recusa, entrega ou cancelamento. */
export function StatusNotice({ quote }: { quote: QuoteView }) {
  const wo = quote.workOrder
  const box = (tone: 'ok' | 'bad' | 'info', children: ReactNode) => (
    <div
      className={cn(
        'mb-4 rounded-md border px-3 py-2 text-[13.5px]',
        tone === 'ok' && 'border-[#bfe3cc] bg-[#e1f3e8] text-[#17693a]',
        tone === 'bad' && 'border-[#f3c2c5] bg-[#fde6e7] text-[#a10e15]',
        tone === 'info' && 'border-line-strong bg-white text-muted'
      )}
    >
      {children}
    </div>
  )
  if (wo?.status === 'CANCELADA') return box('bad', <>OS cancelada em {formatDate(wo.canceledAt!)}. Motivo: {wo.cancelReason}</>)
  if (wo?.status === 'ENTREGUE') {
    return box(
      'ok',
      <>
        Entregue em {formatDate(wo.deliveredAt!)}
        {wo.exitKm != null && `, com ${formatKm(wo.exitKm)} km`}.{' '}
        {quote.warrantyDays > 0 ? `Garantia de ${quote.warrantyDays} dias a partir da entrega.` : 'Sem garantia.'}
      </>
    )
  }
  if (quote.status === 'RECUSADO' && quote.refusal) {
    return box('bad', <>Recusado em {formatDate(quote.refusal.at)}{quote.refusal.reason ? `. Motivo: ${quote.refusal.reason}` : '.'}</>)
  }
  if (quote.status === 'EXPIRADO') return box('info', <>A validade acabou em {formatDate(quote.validUntil)}. Reabra para enviar de novo.</>)
  if (quote.approval) {
    return box(
      'ok',
      <>
        Aprovado por {quote.approval.approvedBy} em {formatDate(quote.approval.approvedAt)} ({APPROVAL_CHANNEL_LABEL[quote.approval.channel]}).
        Este orçamento é somente leitura.
      </>
    )
  }
  if (quote.status === 'AGUARDANDO_APROVACAO' && quote.sentAt) {
    return box('info', <>Enviado em {formatDate(quote.sentAt)}, válido até {formatDate(quote.validUntil)}. Ainda dá para alterar.</>)
  }
  return null
}
