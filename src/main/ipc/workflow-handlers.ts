import { shell } from 'electron'
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
import type { Container } from '../container'
import { handle } from './register'

const id = z.number().int().positive()
const idOnly = z.object({ id })
const keyTag = z.number().int().positive().nullable()

/** Troca de status do orçamento e da OS. Cada ação é conferida de novo no domínio antes de gravar. */
export function registerWorkflowHandlers(c: Container): void {
  handle('workflow:keyTags', () => keyTagOptions(c))

  handle('workflow:send', async (input) => {
    const result = await sendQuote(c, idOnly.parse(input).id)
    if (process.env['GESTAO_NO_OPEN'] !== '1') {
      // Mostra o PDF na pasta (para anexar) e abre a conversa no WhatsApp com a mensagem pronta.
      shell.showItemInFolder(result.pdfPath)
      if (result.whatsappUrl) await shell.openExternal(result.whatsappUrl)
    }
    return result
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
    const p = z.object({ id, exitKm: z.number().int().min(0).max(3_000_000).nullable() }).parse(input)
    return deliver(c, p.id, p.exitKm)
  })
  handle('workflow:cancel', (input) => {
    const p = z.object({ id, reason: z.string().max(500) }).parse(input)
    return cancelWorkOrder(c, p.id, p.reason)
  })
}
