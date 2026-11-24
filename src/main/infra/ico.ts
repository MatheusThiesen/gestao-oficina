/**
 * Monta um .ico a partir de PNGs já redimensionados (formato com PNG embutido, aceito desde o Windows Vista).
 * Cada entrada: { size: lado em px (1–256), png: bytes do PNG }.
 */
export function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reservado
  header.writeUInt16LE(1, 2) // tipo 1 = ícone
  header.writeUInt16LE(images.length, 4)

  const dir = Buffer.alloc(16 * images.length)
  let offset = header.length + dir.length
  images.forEach(({ size, png }, i) => {
    const at = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, at) // largura (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1) // altura
    dir.writeUInt8(0, at + 2) // paleta
    dir.writeUInt8(0, at + 3) // reservado
    dir.writeUInt16LE(1, at + 4) // planos
    dir.writeUInt16LE(32, at + 6) // bits por pixel
    dir.writeUInt32LE(png.length, at + 8)
    dir.writeUInt32LE(offset, at + 12)
    offset += png.length
  })

  return Buffer.concat([header, dir, ...images.map((i) => i.png)])
}
