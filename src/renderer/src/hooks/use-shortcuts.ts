import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const SAVE_EVENT = 'app:save'

/** Ctrl+N novo orçamento, Ctrl+F foca a busca da página, Ctrl+S dispara salvar na página atual. */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const key = e.key.toLowerCase()
      if (key === 'n') {
        e.preventDefault()
        navigate('/orcamentos/novo')
      } else if (key === 'f') {
        e.preventDefault()
        focusPageSearch()
      } else if (key === 's') {
        e.preventDefault()
        window.dispatchEvent(new Event(SAVE_EVENT))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])
}

function focusPageSearch(): void {
  const search = document.querySelector<HTMLInputElement>('[data-page-search]')
  if (search) {
    search.focus()
    search.select()
  }
}

/** Registra a ação de salvar da página para o atalho Ctrl+S. */
export function useSaveShortcut(onSave: () => void): void {
  const ref = useRef(onSave)
  useEffect(() => {
    ref.current = onSave
  })
  useEffect(() => {
    const listener = () => ref.current()
    window.addEventListener(SAVE_EVENT, listener)
    return () => window.removeEventListener(SAVE_EVENT, listener)
  }, [])
}
