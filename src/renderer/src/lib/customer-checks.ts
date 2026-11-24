import { isValidCnpj, isValidCpf, isValidPhone } from '@shared/validation'

/** Conferência na hora, com a mesma regra do processo principal. */
export function documentCheck(document: string | undefined): { ok: boolean; label: string } | null {
  const d = (document ?? '').replace(/\D/g, '')
  if (d.length === 11) return isValidCpf(d) ? { ok: true, label: 'CPF válido' } : { ok: false, label: 'CPF inválido' }
  if (d.length === 14) return isValidCnpj(d) ? { ok: true, label: 'CNPJ válido' } : { ok: false, label: 'CNPJ inválido' }
  if (d.length > 0 && d.length !== 11 && d.length !== 14) return { ok: false, label: 'incompleto' }
  return null
}

export function phoneCheck(phone: string | undefined): { ok: boolean; label: string } | null {
  const d = (phone ?? '').replace(/\D/g, '')
  if (d.length < 10) return d.length ? { ok: false, label: 'incompleto' } : null
  return isValidPhone(d) ? { ok: true, label: 'válido' } : { ok: false, label: 'inválido' }
}
