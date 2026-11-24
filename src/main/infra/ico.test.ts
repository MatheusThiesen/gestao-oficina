import { describe, expect, it } from 'vitest'
import { buildIco } from './ico'

describe('buildIco', () => {
  it('monta cabeçalho e diretório com os PNGs na ordem', () => {
    const a = Buffer.from([1, 2, 3])
    const b = Buffer.from([4, 5])
    const ico = buildIco([
      { size: 16, png: a },
      { size: 256, png: b }
    ])
    expect(ico.readUInt16LE(2)).toBe(1)
    expect(ico.readUInt16LE(4)).toBe(2)
    expect(ico.readUInt8(6)).toBe(16)
    expect(ico.readUInt8(6 + 16)).toBe(0) // 256 vira 0
    const firstOffset = ico.readUInt32LE(6 + 12)
    expect(firstOffset).toBe(6 + 32)
    expect([...ico.subarray(firstOffset, firstOffset + 3)]).toEqual([1, 2, 3])
    expect(ico.readUInt32LE(6 + 16 + 12)).toBe(6 + 32 + 3)
    expect(ico.length).toBe(6 + 32 + 5)
  })
})
