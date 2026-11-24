import { describe, expect, it } from 'vitest'
import { contrastRatio, derivePalette, hexToHsl, hslToHex, isHexColor } from './color'

describe('cores da marca', () => {
  it('converte hex ↔ hsl sem perder a cor', () => {
    for (const hex of ['#c8121a', '#1f2124', '#f2b705', '#ffffff', '#000000']) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex)
    }
  })

  it('valida hex de 6 dígitos', () => {
    expect(isHexColor('#C8121A')).toBe(true)
    expect(isHexColor('c8121a')).toBe(false)
    expect(isHexColor('#fff')).toBe(false)
  })

  it('garante contraste dos textos derivados', () => {
    for (const primary of ['#c8121a', '#f2b705', '#7fd3ff', '#16803c']) {
      for (const sidebar of ['#1f2124', '#f3f4f5']) {
        const p = derivePalette(primary, sidebar)
        expect(contrastRatio(p.brandText, '#ffffff')).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(p.brandForeground, primary)).toBeGreaterThanOrEqual(3)
        expect(contrastRatio(p.sideText, sidebar)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(p.brandOnSide, sidebar)).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('amarelo usa texto escuro no botão; vermelho usa branco', () => {
    expect(derivePalette('#f2b705', '#1c1c1c').brandForeground).toBe('#17191c')
    expect(derivePalette('#c8121a', '#1f2124').brandForeground).toBe('#ffffff')
  })
})
