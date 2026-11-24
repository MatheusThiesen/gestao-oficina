import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useDebounced, useIpcQuery } from '@/hooks/use-ipc-query'
import { cn } from '@/lib/utils'

interface SuggestInputProps<T> extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string
  onChange: (text: string) => void
  fetch: (search: string) => Promise<T[]>
  onPick: (item: T) => void
  renderItem: (item: T) => ReactNode
  itemKey: (item: T) => string | number
}

/** Campo de texto livre com sugestões do cadastro (peças, serviços). */
export function SuggestInput<T>({
  value,
  onChange,
  fetch,
  onPick,
  renderItem,
  itemKey,
  className,
  ...inputProps
}: SuggestInputProps<T>) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useDebounced(value, 120)
  const wrapper = useRef<HTMLDivElement>(null)
  const { data = [] } = useIpcQuery<T[]>(
    () => (open && search.trim().length >= 2 ? fetch(search) : Promise.resolve([])),
    [search, open]
  )

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function pick(item: T) {
    onPick(item)
    setOpen(false)
  }

  return (
    <div ref={wrapper} className="relative">
      <input
        {...inputProps}
        type="text"
        role="combobox"
        aria-expanded={open && data.length > 0}
        aria-controls={listId}
        autoComplete="off"
        value={value}
        className={className}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (!open || data.length === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, data.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && data[active]) {
            e.preventDefault()
            pick(data[active])
          } else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && data.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full min-w-[320px] overflow-auto rounded-md border border-line-strong bg-white py-1 shadow-lg"
        >
          {data.map((item, i) => (
            <li
              key={itemKey(item)}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(item)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn('cursor-pointer px-3 py-1.5', i === active && 'bg-hover')}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
