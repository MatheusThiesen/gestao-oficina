import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CatalogBrand, CatalogModel } from '@shared/vehicle-catalog'

interface RawBrand {
  name: string
  slug: string
  logo: string | null
  popular: boolean
  models: string[]
  versions: string[]
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/**
 * Marcas e modelos (Tabela FIPE) com as logos, embutidos no programa (resources/vehicle-catalog,
 * gerado por `npm run catalog:import`). Funciona sem internet.
 */
export class VehicleCatalog {
  private brands: RawBrand[] | null = null
  private logos = new Map<string, string | null>()

  constructor(private readonly dir: string) {}

  private load(): RawBrand[] {
    if (this.brands) return this.brands
    const file = join(this.dir, 'catalog.json')
    this.brands = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { brands: RawBrand[] }).brands : []
    return this.brands
  }

  private logoOf(b: RawBrand): string | null {
    if (!b.logo) return null
    if (!this.logos.has(b.slug)) {
      const path = join(this.dir, 'logos', b.logo)
      this.logos.set(b.slug, existsSync(path) ? `data:image/png;base64,${readFileSync(path).toString('base64')}` : null)
    }
    return this.logos.get(b.slug) ?? null
  }

  private find(brand: string): RawBrand | undefined {
    const key = fold(brand)
    return this.load().find((b) => fold(b.name) === key)
  }

  /** Busca vazia: marcas populares primeiro. Com texto: começa com > contém. */
  searchBrands(search: string, limit = 30): CatalogBrand[] {
    const q = fold(search)
    const all = this.load()
    const list = q
      ? [...all.filter((b) => fold(b.name).startsWith(q)), ...all.filter((b) => !fold(b.name).startsWith(q) && fold(b.name).includes(q))]
      : all.filter((b) => b.popular)
    return list.slice(0, limit).map((b) => ({ name: b.name, logo: this.logoOf(b) }))
  }

  /** Modelos-base primeiro, depois versões da FIPE; casa pelo início das palavras ("oni" → Onix, não Sonic). */
  searchModels(brand: string, search: string, limit = 15): CatalogModel[] {
    const b = this.find(brand)
    if (!b) return []
    const q = fold(search)
    const startsWord = (name: string) => fold(name).split(/[\s\-./]+/).some((w) => w.startsWith(q))
    const models = q
      ? [...b.models.filter((m) => fold(m).startsWith(q)), ...b.models.filter((m) => !fold(m).startsWith(q) && startsWord(m))]
      : b.models
    const result: CatalogModel[] = models.slice(0, limit).map((name) => ({ name, kind: 'model' }))
    if (q.length >= 2 && result.length < limit) {
      const versions = b.versions.filter((v) => fold(v).startsWith(q) || startsWord(v)).slice(0, limit - result.length)
      result.push(...versions.map((name) => ({ name, kind: 'version' as const })))
    }
    return result
  }

  logoFor(brand: string): string | null {
    const b = this.find(brand)
    return b ? this.logoOf(b) : null
  }
}
