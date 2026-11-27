import { resolve, sep } from 'node:path'
import { clipboard, shell } from 'electron'
import { z } from 'zod'
import {
  approveQuote,
  backToExecution,
  cancelWorkOrder,
  deliver,
  keyTagOptions,
  markReady,
  openWorkOrder,
  refuseQuote,
  reopenQuote,
  sendQuote
} from '../application/workflow'
import { ValidationError } from '../application/errors'
import { pdfFolder } from '../application/quote-pdf'
import type { Container } from '../container'
import { handle } from './register'

const id = z.number().int().positive()
const idOnly = z.object({ id })
const keyTag = z.number().int().positive().nullable()

/** Troca de status do orçamento e da OS. Cada ação é conferida de novo no domínio antes de gravar. */
export function registerWorkflowHandlers(c: Container): void {
  handle('workflow:keyTags', () => keyTagOptions(c))

  // Enviar não abre nada sozinho: a tela oferece abrir o WhatsApp, copiar a mensagem ou mostrar o PDF.
  handle('workflow:send', (input) => sendQuote(c, idOnly.parse(input).id))

  handle('share:openWhatsapp', async (input) => {
    const { url } = z.object({ url: z.string().max(4000) }).parse(input)
    if (!url.startsWith('https://wa.me/')) throw new ValidationError('Link do WhatsApp inválido.')
    await shell.openExternal(url)
  })
  handle('share:copy', (input) => {
    clipboard.writeText(z.object({ text: z.string().max(4000) }).parse(input).text)
  })
  handle('share:showPdf', async (input) => {
    const { path } = z.object({ path: z.string().max(1000) }).parse(input)
    // Só mostra arquivos da pasta de orçamentos do programa.
    const folder = resolve(pdfFolder(await c.settings.get()))
    if (!resolve(path).startsWith(folder + sep)) throw new ValidationError('Arquivo fora da pasta de orçamentos.')
    shell.showItemInFolder(path)
  })

  handle('workflow:approve', (input) =>
    approveQuote(
      c,
      z
        .object({
          id,
          channel: z.enum(['BALCAO', 'TELEFONE', 'WHATSAPP']),
          approvedBy: z.string().max(120),
          openWorkOrder: z.boolean(),
          keyTagNumber: keyTag
        })
        .parse(input)
    )
  )

  handle('workflow:refuse', (input) => {
    const { id: quoteId, reason } = z.object({ id, reason: z.string().max(500).optional() }).parse(input)
    return refuseQuote(c, quoteId, reason ?? null)
  })
  handle('workflow:reopen', (input) => reopenQuote(c, idOnly.parse(input).id))
  handle('workflow:openWorkOrder', (input) => {
    const p = z.object({ id, keyTagNumber: keyTag }).parse(input)
    return openWorkOrder(c, p.id, p.keyTagNumber)
  })
  handle('workflow:markReady', (input) => markReady(c, idOnly.parse(input).id))
  handle('workflow:backToExecution', (input) => backToExecution(c, idOnly.parse(input).id))
  handle('workflow:deliver', (input) => {
    const p = z
      .object({ id, exitKm: z.number().int().min(0).max(3_000_000).nullable(), paymentMethod: z.string().trim().max(60).nullable() })
      .parse(input)
    return deliver(c, p.id, p.exitKm, p.paymentMethod)
  })
  handle('workflow:cancel', (input) => {
    const p = z.object({ id, reason: z.string().max(500) }).parse(input)
    return cancelWorkOrder(c, p.id, p.reason)
  })
}
