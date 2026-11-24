import { describe, expect, it } from 'vitest'
import { autoBackupName, autoBackupsToDelete, hasAutoBackupOn, manualBackupName, unknownMigrations } from './backup-rules'

const at = new Date(2026, 10, 24, 9, 30)

describe('backup', () => {
  it('nomeia arquivos com data e hora', () => {
    expect(autoBackupName(at)).toBe('backup-automatico-2026-11-24-0930.oficina-backup')
    expect(manualBackupName('Oficina do Zé', at)).toBe('Oficina-do-Ze-2026-11-24-0930.oficina-backup')
    expect(manualBackupName('***', at)).toBe('Oficina-2026-11-24-0930.oficina-backup')
  })

  it('mantém só os 30 automáticos mais recentes e nunca apaga os manuais', () => {
    const autos = Array.from({ length: 32 }, (_, i) => autoBackupName(new Date(2026, 9, i + 1, 8, 0)))
    const files = [...autos, 'Oficina-2026-01-01-0000.oficina-backup', 'outro.txt']
    const removed = autoBackupsToDelete(files)
    expect(removed).toEqual([autos[0], autos[1]])
  })

  it('sabe se já houve backup automático no dia', () => {
    expect(hasAutoBackupOn([autoBackupName(new Date(2026, 10, 24, 8, 0))], at)).toBe(true)
    expect(hasAutoBackupOn([autoBackupName(new Date(2026, 10, 23, 23, 59))], at)).toBe(false)
  })

  it('recusa backup com migrations desconhecidas (versão mais nova do programa)', () => {
    expect(unknownMigrations(['001_init'], ['001_init', '002_x'])).toEqual([])
    expect(unknownMigrations(['001_init', '003_novo'], ['001_init', '002_x'])).toEqual(['003_novo'])
  })
})
