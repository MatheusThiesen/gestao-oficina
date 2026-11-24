import { describe, expect, it } from 'vitest'
import { bpToInput, centsToInput, maskDocumentInput, maskPhoneInput, milliToInput, parseScaled } from './format'

describe('parseScaled', () => {
  it('lê dinheiro com vírgula decimal e milhar com ponto', () => {
    expect(parseScaled('120,00', 2)).toBe(12_000)
    expect(parseScaled('1.234,56', 2)).toBe(123_456)
    expect(parseScaled('R$ 18,9', 2)).toBe(1_890)
    expect(parseScaled('180', 2)).toBe(18_000)
  })
  it('lê quantidade e percentual', () => {
    expect(parseScaled('1,5', 3)).toBe(1_500)
    expect(parseScaled('40', 2)).toBe(4_000)
    expect(parseScaled('37,5%', 2)).toBe(3_750)
  })
  it('arredonda casas a mais e recusa texto', () => {
    expect(parseScaled('0,125', 2)).toBe(13)
    expect(parseScaled('abc', 2)).toBeNull()
    expect(parseScaled('', 2)).toBeNull()
  })
  it('formata de volta para o campo', () => {
    expect(centsToInput(12_000)).toBe('120,00')
    expect(milliToInput(1_500)).toBe('1,5')
    expect(bpToInput(3_750)).toBe('37,5')
  })
})

describe('máscaras enquanto digita', () => {
  it('telefone', () => {
    expect(maskPhoneInput('5')).toBe('(5')
    expect(maskPhoneInput('51998')).toBe('(51) 998')
    expect(maskPhoneInput('5133449080')).toBe('(51) 3344-9080')
    expect(maskPhoneInput('51998765432')).toBe('(51) 99876-5432')
    expect(maskPhoneInput('(51) 99876-54321')).toBe('(51) 99876-5432')
  })
  it('CPF e CNPJ', () => {
    expect(maskDocumentInput('4314')).toBe('431.4')
    expect(maskDocumentInput('43148291093')).toBe('431.482.910-93')
    expect(maskDocumentInput('121001200001')).toBe('12.100.120/0001')
    expect(maskDocumentInput('12100120000140')).toBe('12.100.120/0001-40')
  })
})
