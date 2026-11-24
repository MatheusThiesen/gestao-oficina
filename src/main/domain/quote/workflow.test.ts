import { describe, expect, it } from 'vitest'
import { allowedActions, assertAllowed, suggestKeyTag, WorkflowError } from './workflow'

const quote = (q: Parameters<typeof allowedActions>[0]['quote'], wo: Parameters<typeof allowedActions>[0]['workOrder'] = null) => ({
  quote: q,
  workOrder: wo,
  superseded: false
})

describe('fluxo do orçamento e da OS', () => {
  it('rascunho pode ser enviado ou aprovado direto no balcão', () => {
    expect(allowedActions(quote('RASCUNHO'))).toEqual(['send', 'approve'])
  })

  it('aguardando aprovação pode ser aprovado, recusado ou reenviado', () => {
    expect(allowedActions(quote('AGUARDANDO_APROVACAO'))).toEqual(['approve', 'refuse', 'send'])
  })

  it('recusado e expirado só podem ser reabertos', () => {
    expect(allowedActions(quote('RECUSADO'))).toEqual(['reopen'])
    expect(allowedActions(quote('EXPIRADO'))).toEqual(['reopen'])
  })

  it('aprovado sem OS abre a OS; com OS segue a OS', () => {
    expect(allowedActions(quote('APROVADO'))).toEqual(['openWorkOrder'])
    expect(allowedActions(quote('APROVADO', 'EM_EXECUCAO'))).toEqual(['markReady', 'cancelWorkOrder'])
    expect(allowedActions(quote('APROVADO', 'PRONTO'))).toEqual(['deliver', 'backToExecution', 'cancelWorkOrder'])
  })

  it('entregue, cancelada e versão antiga não têm ações', () => {
    expect(allowedActions(quote('APROVADO', 'ENTREGUE'))).toEqual([])
    expect(allowedActions(quote('APROVADO', 'CANCELADA'))).toEqual([])
    expect(allowedActions({ quote: 'RASCUNHO', workOrder: null, superseded: true })).toEqual([])
  })

  it('recusa ações fora de ordem com mensagem clara', () => {
    expect(() => assertAllowed(quote('RASCUNHO'), 'deliver')).toThrow(WorkflowError)
    expect(() => assertAllowed(quote('APROVADO', 'EM_EXECUCAO'), 'deliver')).toThrow('Só uma OS pronta pode ser entregue.')
  })
})

describe('chave sugerida', () => {
  it('é a menor livre', () => {
    expect(suggestKeyTag([1, 2, 3, 4], [1, 3])).toBe(2)
    expect(suggestKeyTag([5, 3, 4], [])).toBe(3)
    expect(suggestKeyTag([1, 2], [1, 2])).toBeNull()
  })
})
