export const onlyDigits = (value: string): string => value.replace(/\D/g, '')

/** Placa sem hífen e em maiúsculas. */
export const normalizePlate = (value: string): string => value.replace(/[^a-z0-9]/gi, '').toUpperCase()

/** Formato antigo (ABC1234) ou Mercosul (ABC1D23). */
export function isValidPlate(plate: string): boolean {
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizePlate(plate))
}

function allSameDigit(digits: string): boolean {
  return /^(\d)\1+$/.test(digits)
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || allSameDigit(cpf)) return false
  const digit = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
    return ((sum * 10) % 11) % 10
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || allSameDigit(cnpj)) return false
  const digit = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, w, i) => acc + w * Number(cnpj[i]), 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13])
}

/** Telefone brasileiro com DDD: fixo (10 dígitos) ou celular (11 dígitos, começando com 9). */
export function isValidPhone(value: string): boolean {
  const phone = onlyDigits(value)
  const ddd = Number(phone.slice(0, 2))
  if (ddd < 11 || ddd > 99) return false
  if (phone.length === 11) return phone[2] === '9'
  return phone.length === 10 && /[2-5]/.test(phone[2] ?? '')
}
