import { useLayoutEffect, useState, type RefObject } from 'react'

export interface AnchorRect {
  left: number
  top: number
  width: number
}

/**
 * Posição na tela de um campo, para abrir a lista de sugestões com position: fixed.
 * Assim a lista não é cortada por painéis ou tabelas com rolagem. Acompanha rolagem e redimensionamento.
 */
export function useAnchorRect(ref: RefObject<HTMLElement | null>, active: boolean): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null)
  useLayoutEffect(() => {
    if (!active) return
    const update = () => {
      const r = ref.current?.getBoundingClientRect()
      if (r) setRect({ left: r.left, top: r.bottom + 4, width: r.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [ref, active])
  return active ? rect : null
}
