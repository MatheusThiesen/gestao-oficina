/**
 * Divisão inteira com arredondamento "meio para cima" (afastando do zero),
 * sem passar por ponto flutuante. Base de todo arredondamento ao centavo.
 */
export function divRound(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    throw new RangeError(`divRound: operandos inválidos (${numerator} / ${denominator})`)
  }
  const sign = Math.sign(numerator) * Math.sign(denominator)
  const n = Math.abs(numerator)
  const d = Math.abs(denominator)
  return sign * Math.floor((2 * n + d) / (2 * d))
}

/** 100% em centésimos de ponto percentual (basis points). */
export const BP_100 = 10_000
/** Quantidade 1 em milésimos. */
export const QTY_ONE = 1_000
