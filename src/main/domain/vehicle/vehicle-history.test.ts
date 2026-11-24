import { describe, expect, it } from 'vitest'
import { forecastOilChange, isOilChange, isUnderWarranty, warrantyUntil } from './vehicle-history'

describe('histórico do veículo', () => {
  it('garantia de 90 dias a partir da entrega (OS 1003 → 31/12/2026)', () => {
    expect(warrantyUntil(new Date(2026, 9, 2), 90)).toEqual(new Date(2026, 11, 31))
    expect(isUnderWarranty(new Date(2026, 9, 2), 90, new Date(2026, 10, 23))).toBe(true)
    expect(isUnderWarranty(new Date(2026, 7, 12), 90, new Date(2026, 10, 23))).toBe(false)
  })

  it('identifica troca de óleo pelos itens', () => {
    expect(isOilChange(['Óleo 5W30 (litro)', 'Filtro de óleo'])).toBe(true)
    expect(isOilChange(['Pastilha de freio'])).toBe(false)
  })

  it('prevê a próxima troca como no protótipo (54.900 km ou 12/02/2027)', () => {
    const f = forecastOilChange({ at: new Date(2026, 7, 12), km: 44_900 }, 48_210, { km: 10_000, months: 6 })
    expect(f.nextKm).toBe(54_900)
    expect(f.nextAt).toEqual(new Date(2027, 1, 12))
    expect(f.kmRemaining).toBe(6_690)
  })
})
