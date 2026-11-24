/**
 * Gera o catálogo de marcas/modelos de carros (Tabela FIPE) e as logos das marcas, embutidos no programa.
 * Uso: npm run catalog:import   (precisa de internet e do ffmpeg para reduzir as logos)
 *
 * Fontes: API pública da FIPE (parallelum.com.br) e car-logos-dataset (GitHub).
 * As logos são marcas registradas das montadoras; aqui servem só para identificar a marca do veículo.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const OUT = resolve('resources/vehicle-catalog')
const LOGOS = join(OUT, 'logos')
const FIPE = 'https://parallelum.com.br/fipe/api/v1/carros'
const LOGO_DATA = 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/data.json'

/** Marcas mais comuns no Brasil aparecem primeiro na lista. */
const POPULAR = ['Chevrolet', 'Volkswagen', 'Fiat', 'Ford', 'Toyota', 'Hyundai', 'Renault', 'Honda', 'Jeep', 'Nissan',
  'Peugeot', 'Citroën', 'BYD', 'Caoa Chery', 'Mitsubishi', 'Kia', 'Chery', 'Mercedes-Benz', 'BMW', 'Audi', 'Ram', 'GWM']

/** Nomes da FIPE → nome usado no dia a dia. */
const RENAME = {
  'GM - Chevrolet': 'Chevrolet',
  'VW - VolksWagen': 'Volkswagen',
  'Citroen': 'Citroën',
  'CAOA Chery': 'Caoa Chery',
  'CAOA CHERY': 'Caoa Chery',
  'Mercedes-Benz': 'Mercedes-Benz',
  'LAND ROVER': 'Land Rover',
  'Land Rover': 'Land Rover',
  'GREAT WALL': 'GWM',
  'GWM': 'GWM',
  'RAM': 'Ram',
  'BYD': 'BYD',
  'BMW': 'BMW',
  'JAC': 'JAC',
  'MINI': 'Mini',
  'Kia Motors': 'Kia',
  'KIA MOTORS': 'Kia',
  'SSANGYONG': 'SsangYong',
  'Ssangyong': 'SsangYong'
}

/** Nome da marca → slug no conjunto de logos, quando diferem. */
const LOGO_ALIAS = { gwm: 'great-wall', 'caoa-chery': 'chery', dfsk: 'dongfeng' }

/** Palavras que formam o nome do modelo junto com a seguinte ("Grand Siena", "Range Rover"). */
const TWO_WORD = new Set(['grand', 'nova', 'novo', 'new', 'range', 'land', 'santa', 'space', 'gran', 'c4', 'e-tron'])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'user-agent': 'gestao-oficina-catalog' } })
    if (res.ok) return res.json()
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (i + 1))
      continue
    }
    throw new Error(`${res.status} ${url}`)
  }
  throw new Error(`sem resposta: ${url}`)
}

function titleCase(name) {
  if (name !== name.toUpperCase() || name.length <= 3) return name
  return name.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase())
}

const displayName = (fipe) => RENAME[fipe] ?? titleCase(fipe.trim())

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** "Onix HATCH LT 1.0 8V" → "Onix"; "Grand Siena ATTRACTIV" → "Grand Siena". */
function family(model) {
  const words = model.trim().split(/\s+/)
  const first = words[0] ?? model
  const name = TWO_WORD.has(first.toLowerCase()) && words[1] ? `${first} ${words[1]}` : first
  return titleCase(name)
}

console.log('Baixando marcas da FIPE…')
const fipeBrands = await getJson(`${FIPE}/marcas`)
const logoIndex = await getJson(LOGO_DATA)
const logoBySlug = new Map(logoIndex.map((l) => [l.slug, l]))

rmSync(OUT, { recursive: true, force: true })
mkdirSync(LOGOS, { recursive: true })
const tmp = join(tmpdir(), `logos-${Date.now()}`)
mkdirSync(tmp, { recursive: true })

const brands = []
for (const b of fipeBrands) {
  const name = displayName(b.nome)
  const slug = slugify(name)
  const data = await getJson(`${FIPE}/marcas/${b.codigo}/modelos`)
  await sleep(250)
  const versions = [...new Set(data.modelos.map((m) => m.nome.trim()))].sort((x, y) => x.localeCompare(y, 'pt-BR'))
  const families = [...new Set(versions.map(family))].sort((x, y) => x.localeCompare(y, 'pt-BR'))

  // Logo: pelo nome da marca; "Caoa Chery" cai para "chery".
  const logo = logoBySlug.get(slug) ?? logoBySlug.get(LOGO_ALIAS[slug] ?? '') ?? logoBySlug.get(slug.split('-').pop())
  let logoFile = null
  if (logo) {
    const res = await fetch(logo.image.thumb)
    if (res.ok) {
      const raw = join(tmp, `${slug}.png`)
      writeFileSync(raw, Buffer.from(await res.arrayBuffer()))
      logoFile = `${slug}.png`
      // 96 px de altura bastam para a lista e a ficha; mantém a transparência.
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=-1:96:flags=lanczos', join(LOGOS, logoFile)])
    }
  }

  const existing = brands.find((x) => x.slug === slug)
  if (existing) {
    // A FIPE às vezes repete a marca com grafias diferentes: junta.
    existing.models = [...new Set([...existing.models, ...families])].sort((x, y) => x.localeCompare(y, 'pt-BR'))
    existing.versions = [...new Set([...existing.versions, ...versions])].sort((x, y) => x.localeCompare(y, 'pt-BR'))
    existing.logo ??= logoFile
    continue
  }
  brands.push({ name, slug, logo: logoFile, popular: POPULAR.includes(name), models: families, versions })
  process.stdout.write(`  ${name}: ${families.length} modelos, ${versions.length} versões${logoFile ? '' : ' (sem logo)'}\n`)
}

brands.sort((a, b) => {
  const pa = POPULAR.indexOf(a.name)
  const pb = POPULAR.indexOf(b.name)
  if (pa !== -1 || pb !== -1) return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb)
  return a.name.localeCompare(b.name, 'pt-BR')
})

writeFileSync(
  join(OUT, 'catalog.json'),
  JSON.stringify({ source: 'Tabela FIPE (carros e utilitários)', generatedAt: new Date().toISOString(), brands })
)
rmSync(tmp, { recursive: true, force: true })
const models = brands.reduce((s, b) => s + b.models.length, 0)
console.log(`\n${brands.length} marcas, ${models} modelos, ${brands.filter((b) => b.logo).length} logos → ${OUT}`)
