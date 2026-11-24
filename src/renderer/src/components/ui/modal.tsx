import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './button'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}

/** Janela modal com <dialog> nativo: foco preso, Esc fecha, fundo escurecido. */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-auto w-[min(520px,92vw)] rounded-lg border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-black/40"
    >
      {open && (
        <form
          method="dialog"
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col"
        >
          <header className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="m-0 text-[16px] font-semibold">{title}</h2>
            <Button variant="icon" aria-label="Fechar" onClick={onClose}>
              <X size={16} aria-hidden="true" />
            </Button>
          </header>
          <div className="flex flex-col gap-4 px-5 py-4">{children}</div>
          <footer className="flex justify-end gap-2 border-t border-line bg-bg/50 px-5 py-3">{footer}</footer>
        </form>
      )}
    </dialog>
  )
}
