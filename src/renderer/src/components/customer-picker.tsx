import { useEffect, useId, useRef, useState } from 'react'
import { formatPhone } from '@shared/format'
import type { CustomerListItem } from '@shared/registry'
import { Input } from '@/components/ui/input'
import { useAnchorRect } from '@/hooks/use-anchor-rect'
import { useDebounced, useIpcQuery } from '@/hooks/use-ipc-query'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'

export interface PickedCustomer {
  id: number
  name: string
  whatsapp: string | null
}

interface CustomerPickerProps {
  id?: string
  value: PickedCustomer | null
  onChange: (customer: PickedCustomer | null) => void
  /** Mostra "Cadastrar <nome>" quando ninguém corresponde à busca. */
  onCreate?: (name: string) => void
  placeholder?: string
}

/** Campo de busca de cliente com lista de sugestões (nome, telefone ou CPF). */
export function CustomerPicker({ id, value, onChange, onCreate, placeholder }: CustomerPickerProps) {
  const listId = useId()
  const [text, setText] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useDebounced(text, 150)
  const wrapper = useRef<HTMLDivElement>(null)

  const { data: results = [] } = useIpcQuery<CustomerListItem[]>(
    () => (open && search.trim().length >= 2 ? call('customers:list', { search }) : Promise.resolve([])),
    [search, open]
  )
  const options = results.slice(0, 8)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function pick(c: CustomerListItem) {
    onChange({ id: c.id, name: c.name, whatsapp: c.whatsapp })
    setText(c.name)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault()
      pick(options[active])
    } else if (e.key === 'Escape') setOpen(false)
  }

  const showCreate = onCreate && search.trim().length >= 2 && options.length === 0
  const anchor = useAnchorRect(wrapper, open && (options.length > 0 || !!showCreate))

  return (
    <div ref={wrapper} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        placeholder={placeholder ?? 'Nome, telefone ou CPF'}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
          setActive(0)
          if (value) onChange(null)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (options.length > 0 || showCreate) && (
        <ul
          id={listId}
          role="listbox"
          style={anchor ? { left: anchor.left, top: anchor.top, width: anchor.width } : undefined}
          className="fixed z-50 max-h-72 min-w-[280px] overflow-auto rounded-md border border-line-strong bg-white py-1 shadow-lg"
        >
          {options.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(c)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('cursor-pointer px-3 py-1.5', i === active && 'bg-hover')}
            >
              <div className="font-semibold">{c.name}</div>
              <div className="text-[12px] text-muted">
                {[formatPhone(c.whatsapp), c.vehicles.map((v) => v.plate).join(', ')].filter(Boolean).join(' — ')}
              </div>
            </li>
          ))}
          {showCreate && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault()
                setOpen(false)
                onCreate(search.trim())
              }}
              className="cursor-pointer px-3 py-1.5 text-brand-text hover:bg-hover"
            >
              Cadastrar “{search.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
