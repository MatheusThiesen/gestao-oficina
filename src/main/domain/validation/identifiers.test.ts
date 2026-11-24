import { describe, expect, it } from 'vitest'
import { isValidCnpj, isValidCpf, isValidPhone, isValidPlate, normalizePlate } from './identifiers'

describe('placa', () => {
  it('aceita formato antigo e Mercosul, com ou sem hífen', () => {
    expect(isValidPlate('ABC1234')).toBe(true)
    expect(isValidPlate('abc-1234')).toBe(true)
    expect(isValidPlate('ABC1D23')).toBe(true)
    expect(isValidPlate('qrs2d47')).toBe(true)
  })
  it('recusa formatos inválidos', () => {
    expect(isValidPlate('AB12345')).toBe(false)
    expect(isValidPlate('ABC12D3')).toBe(false)
    expect(isValidPlate('ABCD123')).toBe(false)
  })
  it('normaliza para maiúsculas sem hífen', () => {
    expect(normalizePlate(' abc-1d23 ')).toBe('ABC1D23')
  })
})

describe('CPF e CNPJ', () => {
  it('valida dígitos verificadores', () => {
    expect(isValidCpf('431.482.910-93')).toBe(true)
    expect(isValidCpf('431.482.910-94')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCnpj('12.100.120/0001-40')).toBe(true)
    expect(isValidCnpj('12.100.120/0001-41')).toBe(false)
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
  })
})

describe('telefone', () => {
  it('exige DDD', () => {
    expect(isValidPhone('(51) 99876-5432')).toBe(true)
    expect(isValidPhone('(51) 3344-9080')).toBe(true)
    expect(isValidPhone('99876-5432')).toBe(false)
    expect(isValidPhone('(51) 89876-5432')).toBe(false)
    expect(isValidPhone('(05) 99876-5432')).toBe(false)
  })
})
