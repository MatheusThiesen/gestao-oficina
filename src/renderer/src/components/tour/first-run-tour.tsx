import { ArrowLeft, ArrowRight, FilePlus2, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBranding } from '@/branding/branding-context'
import { Button } from '@/components/ui/button'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'

interface Step {
  /** Elemento destacado ([data-tour="…"]); sem alvo, o balão fica no centro. */
  target?: string
  /** Tela onde o alvo aparece. */
  route?: string
  title: string
  body: string
}

const STEPS: Step[] = [
  { route: '/painel', title: 'Boas-vindas!', body: '' },
  {
    target: 'new-quote',
    title: 'Comece por aqui',
    body: 'Todo serviço começa com um orçamento. Digite a placa: o programa traz o carro e o cliente, ou cadastra os dois ali mesmo. Atalho: Ctrl+N.'
  },
  {
    target: 'today',
    route: '/painel',
    title: 'O dia da oficina',
    body: 'Carros em serviço, prontos para entregar e orçamentos esperando resposta. Logo abaixo, o resultado do mês com faturamento e lucro.'
  },
  {
    target: 'nav-quotes',
    title: 'Orçamentos e OS',
    body: 'Todos os orçamentos e ordens de serviço. Busque pela placa, pelo cliente, pelo número ou pelo número da chave, e filtre pela situação.'
  },
  {
    target: 'nav-customers',
    title: 'Clientes e veículos',
    body: 'O cadastro de quem atende e dos carros, com histórico de serviços, garantias e a próxima troca de óleo.'
  },
  {
    target: 'nav-keys',
    title: 'Chaves',
    body: 'Os chaveiros numerados: quais estão livres e com qual carro estão os outros. Ao abrir uma OS, o programa sugere a chave livre.'
  },
  {
    target: 'nav-settings',
    title: 'Configurações',
    body: 'Nome, logo, cores, dados da empresa, valores padrão do orçamento, senha e backup. Você pode rever este tour por lá.'
  },
  { title: 'Tudo pronto!', body: 'Que tal fazer o primeiro orçamento agora?' }
]

const PAD = 6
const POPOVER_W = 340

type Rect = { left: number; top: number; width: number; height: number }

function findTarget(step: Step): HTMLElement | null {
  return step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
}

/** Tour do primeiro acesso: destaca as partes principais da tela, uma de cada vez. */
export function FirstRunTour() {
  const { branding, reload } = useBranding()
  const navigate = useNavigate()
  const location = useLocation()
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const nextButton = useRef<HTMLButtonElement>(null)
  // Some na hora ao encerrar (sem esperar o recarregamento da marca).
  const [dismissed, setDismissed] = useState(false)
  if (dismissed && branding.tourCompleted) {
    setDismissed(false)
    setIndex(0)
  }
  const active = !branding.tourCompleted && !dismissed
  const step = STEPS[index]!
  const last = index === STEPS.length - 1

  const finish = useCallback(
    async (then?: string) => {
      setDismissed(true)
      if (then) navigate(then)
      await call('tour:setCompleted', { completed: true }).catch(() => undefined)
      reload()
    },
    [navigate, reload]
  )

  // Vai para a tela do passo, se precisar.
  useEffect(() => {
    if (active && step.route && location.pathname !== step.route) navigate(step.route)
  }, [active, step, location.pathname, navigate])

  // Mede o alvo (e acompanha redimensionamento e rolagem).
  useLayoutEffect(() => {
    if (!active) return
    const measure = () => {
      const el = findTarget(step)
      if (!el) return setRect(null)
      el.scrollIntoView({ block: 'nearest' })
      const r = el.getBoundingClientRect()
      setRect({ left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
    }
    measure()
    // A tela do passo pode ainda estar carregando: mede de novo em seguida.
    const retry = setTimeout(measure, 250)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(retry)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [active, step, location.pathname])

  useEffect(() => {
    if (active) nextButton.current?.focus()
  }, [active, index])

  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') void finish()
      else if (e.key === 'ArrowRight' && !last) setIndex((i) => i + 1)
      else if (e.key === 'ArrowLeft' && index > 0) setIndex((i) => i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish, index, last])

  if (!active) return null

  const centered = !step.target || !rect
  const popover = centered ? null : placePopover(rect)

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Fundo escurecido com recorte no alvo */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id="tour-hole">
            <rect width="100%" height="100%" fill="white" />
            {rect && !centered && <rect x={rect.left} y={rect.top} width={rect.width} height={rect.height} rx={8} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(10,11,12,0.62)" mask="url(#tour-hole)" />
      </svg>
      {rect && !centered && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-brand transition-all duration-200 motion-reduce:transition-none"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
      )}

      <div
        className={cn(
          'absolute rounded-xl border border-line bg-panel text-ink shadow-2xl',
          centered && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
        )}
        style={{ width: centered ? 420 : POPOVER_W, ...(popover ?? {}) }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div>
            {index === 0 && <span className="text-[12px] text-muted">{branding.appName}</span>}
            {index > 0 && !last && (
              <span className="text-[12px] text-muted">
                {index} de {STEPS.length - 2}
              </span>
            )}
            <h2 id="tour-title" className="m-0 text-[18px] font-semibold">
              {index === 0 ? 'Boas-vindas!' : step.title}
            </h2>
          </div>
          <Button variant="icon" aria-label="Pular o tour" onClick={() => void finish()}>
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <p className="mx-5 mt-2 mb-4 text-[14px] leading-relaxed text-muted">
          {index === 0
            ? 'Em um minuto mostramos onde fica cada coisa. Você pode pular agora e rever o tour depois, em Configurações.'
            : step.body}
        </p>

        {!last && index > 0 && (
          <div className="mx-5 mb-3 flex gap-1" aria-hidden="true">
            {STEPS.slice(1, -1).map((_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full', i < index ? 'bg-brand' : 'bg-line')} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-line px-5 py-3">
          {index === 0 ? (
            <>
              <Button onClick={() => void finish()}>Agora não</Button>
              <span className="flex-1" />
              <Button ref={nextButton} variant="primary" onClick={() => setIndex(1)}>
                Começar o tour
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </>
          ) : last ? (
            <>
              <Button onClick={() => void finish()}>Concluir</Button>
              <span className="flex-1" />
              <Button ref={nextButton} variant="primary" onClick={() => void finish('/orcamentos/novo')}>
                <FilePlus2 size={15} aria-hidden="true" />
                Fazer o primeiro orçamento
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIndex(index - 1)}>
                <ArrowLeft size={15} aria-hidden="true" />
                Voltar
              </Button>
              <span className="flex-1" />
              <Button ref={nextButton} variant="primary" onClick={() => setIndex(index + 1)}>
                Próximo
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Balão à direita do alvo (menu lateral) ou abaixo dele; sempre dentro da janela. */
function placePopover(r: Rect): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const gap = 14
  const height = 230
  if (r.left + r.width + gap + POPOVER_W < vw - 12) {
    return { left: r.left + r.width + gap, top: clamp(r.top, 12, vh - height - 12) }
  }
  const below = r.top + r.height + gap
  const top = below + height < vh ? below : Math.max(12, r.top - gap - height)
  return { left: clamp(r.left, 12, vw - POPOVER_W - 12), top }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
