/** Ticks "redondos" para o eixo Y (1, 2, 2,5 ou 5 × 10ⁿ). */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (max <= min) return [min, min + 1]
  const raw = (max - min) / target
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Math.round(v))
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step)
  return ticks
}
