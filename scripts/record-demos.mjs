/**
 * Grava as animações do README (docs/gifs/*.gif) dirigindo o app de verdade.
 * Uso: npm run build && npm run docs:gifs   (precisa do ffmpeg no PATH)
 * Os dados ficam numa pasta temporária; os seus dados de desenvolvimento não são tocados.
 */
import { _electron as electron } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const APP = resolve('.')
const OUT = join(APP, 'docs', 'gifs')
const LOGO = join(APP, 'docs', 'exemplo', 'logo-oficina-modelo.svg')
const NAME = 'Oficina Modelo'
const SIZE = { width: 1280, height: 800 }
const ELECTRON =
  process.platform === 'darwin'
    ? join(APP, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron')
    : join(APP, 'node_modules/electron/dist/electron')

const userData = mkdtempSync(join(tmpdir(), 'gestao-demo-'))
const videos = mkdtempSync(join(tmpdir(), 'gestao-video-'))
mkdirSync(OUT, { recursive: true })

async function launch(record) {
  const app = await electron.launch({
    executablePath: ELECTRON,
    args: [APP],
    env: { ...process.env, GESTAO_USER_DATA: userData, GESTAO_NO_OPEN: '1' }
  })
  const page = await app.firstWindow()
  await app.evaluate(({ BrowserWindow }, size) => {
    const win = BrowserWindow.getAllWindows()[0]
    win.setContentSize(size.width, size.height)
    win.center()
  }, SIZE)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1500)
  await installCursor(page)
  if (record) page.recorder = startRecorder(page)
  return { app, page }
}

/**
 * Captura quadros da janela em sequência, guardando o instante de cada um.
 * (A gravação de vídeo do Playwright não pega a janela do Electron 42.)
 */
function startRecorder(page) {
  const frames = []
  let running = true
  const loop = (async () => {
    while (running) {
      const at = Date.now()
      try {
        frames.push({ at, buf: await page.screenshot({ type: 'png' }) })
      } catch {
        break
      }
    }
  })()
  return {
    async stop() {
      running = false
      await loop
      return frames
    }
  }
}

/** A gravação não mostra o ponteiro: desenha um cursor que segue o mouse e marca os cliques. */
async function installCursor(page) {
  await page.evaluate(() => {
    const c = document.createElement('div')
    c.id = 'demo-cursor'
    c.style.cssText =
      'position:fixed;z-index:99999;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;' +
      'background:rgba(23,25,28,.35);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4);pointer-events:none;' +
      'transition:transform .12s'
    document.body.appendChild(c)
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
    addEventListener('mousedown', () => (c.style.transform = 'scale(.7)'), true)
    addEventListener('mouseup', () => (c.style.transform = ''), true)
  })
}

const pause = (page, ms = 700) => page.waitForTimeout(ms)

async function moveTo(page, selector) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`sem posição: ${selector}`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 })
}

async function click(page, selector, wait = 500) {
  await moveTo(page, selector)
  await pause(page, 150)
  await page.locator(selector).first().click()
  await pause(page, wait)
}

async function type(page, selector, text, wait = 300) {
  await click(page, selector, 100)
  await page.locator(selector).first().fill('')
  await page.keyboard.type(text, { delay: 55 })
  await pause(page, wait)
}

/** Encerra a captura e monta o GIF com a duração real de cada quadro (paleta otimizada). */
async function finish(app, page, name) {
  await pause(page, 1500)
  const frames = await page.recorder.stop()
  await app.close()

  const dir = mkdtempSync(join(videos, `${name}-`))
  const list = []
  frames.forEach((f, i) => {
    const file = join(dir, `f${String(i).padStart(5, '0')}.png`)
    writeFileSync(file, f.buf)
    const next = frames[i + 1]?.at ?? f.at + 1500
    list.push(`file '${file}'`, `duration ${((next - f.at) / 1000).toFixed(3)}`)
  })
  list.push(`file '${join(dir, `f${String(frames.length - 1).padStart(5, '0')}.png`)}'`)
  writeFileSync(join(dir, 'list.txt'), list.join('\n'))

  const gif = join(OUT, `${name}.gif`)
  const filters =
    'fps=12,scale=1100:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle'
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-vf', filters, gif])
  console.log('ok', gif, `${frames.length} quadros`)
}

// 1. Configuração inicial (primeira abertura)
{
  const { app, page } = await launch(true)
  await page.waitForSelector('#w-name')
  await pause(page, 600)
  await type(page, '#w-name', NAME)
  await moveTo(page, 'button:has-text("Escolher imagem")')
  await page.setInputFiles('input[type=file]', LOGO)
  await pause(page, 900)
  await click(page, 'button:has-text("Continuar")', 700)
  await click(page, 'button:has-text("Verde")', 600)
  await click(page, 'button:has-text("Laranja")', 600)
  await click(page, 'button:has-text("Azul")', 900)
  await click(page, 'button:has-text("Continuar")', 600)
  await type(page, '#w-cnpj', '12.100.120/0001-40')
  await type(page, '#w-zap', '(51) 3333-4444')
  await type(page, '#w-addr', 'Av. das Indústrias, 1200 — Porto Alegre/RS', 500)
  await click(page, 'button:has-text("Continuar")', 700)
  await click(page, 'text=Sem senha', 600)
  await click(page, 'button:has-text("Concluir")', 2200)
  await finish(app, page, '01-configuracao-inicial')
}

// 2. Painel
{
  const { app, page } = await launch(true)
  await page.waitForSelector('text=Análise do mês')
  await pause(page, 1200)
  const columns = page.locator('svg[role=img]').first().locator('rect[fill=transparent]')
  for (const i of [11, 14, 17]) {
    const box = await columns.nth(i).boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6, { steps: 14 })
    await pause(page, 900)
  }
  await click(page, 'button:has-text("Semana")', 900)
  await click(page, '[aria-label="Período anterior"]', 1000)
  await click(page, 'button:has-text("Mês")', 900)
  await click(page, '[aria-label="Período anterior"]', 1100)
  await page.mouse.wheel(0, 700)
  await pause(page, 1500)
  await finish(app, page, '02-painel')
}

// 3. Orçamento novo: placa nova, cliente novo, itens do cadastro, desconto, PDF
{
  const { app, page } = await launch(true)
  await page.waitForSelector('nav a')
  await click(page, 'a:has-text("Novo orçamento")', 800)
  await type(page, '#q-plate', 'RTA4B21')
  await page.keyboard.press('Enter')
  await pause(page, 700)
  await type(page, '#q-brand', 'Fiat')
  await type(page, '#q-model', 'Argo 1.3')
  await type(page, '#q-year', '2022')
  await type(page, '#q-km', '23500')
  await type(page, '#q-cli', 'Beatriz Nunes', 700)
  await click(page, 'text=Cadastrar “Beatriz Nunes”', 400)
  await type(page, '#q-zap', '51991112222')
  await click(page, 'button:has-text("Peça")', 300)
  await page.keyboard.type('Pastilha', { delay: 70 })
  await pause(page, 900)
  await page.keyboard.press('Enter')
  await pause(page, 700)
  await click(page, 'button:has-text("Peça")', 300)
  await page.keyboard.type('Disco', { delay: 70 })
  await pause(page, 900)
  await page.keyboard.press('Enter')
  await pause(page, 500)
  const qty = page.locator('input[aria-label="Quantidade"]').nth(1)
  await qty.click()
  await qty.fill('2')
  await pause(page, 700)
  await click(page, 'button:has-text("Mão de obra")', 300)
  await page.keyboard.type('Substitui', { delay: 70 })
  await pause(page, 900)
  await page.keyboard.press('Enter')
  await pause(page, 900)
  await page.mouse.wheel(0, 500)
  await pause(page, 700)
  await type(page, 'input[aria-label="Desconto em %"]', '5', 1200)
  await page.mouse.wheel(0, -900)
  await pause(page, 500)
  await click(page, 'button:has-text("Gerar PDF")', 2500)
  await finish(app, page, '03-orcamento')
}

// 4. Ficha do veículo: histórico, garantia, troca de óleo
{
  const { app, page } = await launch(true)
  await page.waitForSelector('nav a')
  await click(page, 'nav a:has-text("Veículos")', 800)
  await type(page, 'input[data-page-search]', 'QRS', 900)
  await click(page, 'tbody tr:has-text("QRS2D47")', 1800)
  await moveTo(page, 'text=Próxima troca de óleo')
  await pause(page, 1500)
  await moveTo(page, 'text=Garantias vigentes')
  await pause(page, 1500)
  await finish(app, page, '04-veiculo')
}

// 5. Configurações: cores ao vivo e salvar
{
  const { app, page } = await launch(true)
  await page.waitForSelector('nav a')
  await click(page, 'nav a:has-text("Configurações")', 900)
  await page.mouse.wheel(0, 380)
  await pause(page, 600)
  await click(page, 'button:has-text("Vermelho")', 900)
  await click(page, 'button:has-text("Roxo")', 900)
  await click(page, 'button:has-text("Verde")', 1100)
  await page.mouse.wheel(0, 900)
  await pause(page, 900)
  await page.mouse.wheel(0, -2000)
  await pause(page, 400)
  await click(page, 'button:has-text("Salvar")', 1800)
  await finish(app, page, '05-configuracoes')
}

rmSync(userData, { recursive: true, force: true })
rmSync(videos, { recursive: true, force: true })
// O PDF da demonstração vai para Documentos/<nome do programa>; não precisa ficar.
rmSync(join(homedir(), 'Documents', NAME), { recursive: true, force: true })
