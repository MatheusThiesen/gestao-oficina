import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useAnchorRect } from '@/hooks/use-anchor-rect'
import { useDebounced, useIpcQuery } from '@/hooks/use-ipc-query'
import { cn } from '@/lib/utils'

interface SuggestInputProps<T> extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string
  onChange: (text: string) => void
  fetch: (search: string) => Promise<T[]>
  onPick: (item: T) => void
  renderItem: (item: T) => ReactNode
  itemKey: (item: T) => string | number
  /** Texto de cada sugestão, para saber se o digitado já está na lista. */
  itemText?: (item: T) => string
  /** Mostra "Usar “texto”" quando o digitado não está na lista (o valor digitado vale assim mesmo). */
  customLabel?: (text: string) => ReactNode
  /** Busca mesmo com o campo vazio (ex.: marcas populares ao focar). */
  searchEmpty?: boolean
}

/** Campo de texto livre com sugestões do cadastro (peças, serviços). */
export function SuggestInput<T>({
  value,
  onChange,
  fetch,
  onPick,
  renderItem,
  itemKey,
  itemText,
  customLabel,
  searchEmpty,
  className,
  ...inputProps
}: SuggestInputProps<T>) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useDebounced(value, 120)
  const wrapper = useRef<HTMLDivElement>(null)
  const { data = [] } = useIpcQuery<T[]>(
    () => (open && (searchEmpty || search.trim().length >= 2) ? fetch(search) : Promise.resolve([])),
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

  const typed = value.trim()
  const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const showCustom =
    !!customLabel && typed.length > 0 && !(itemText && data.some((d) => fold(itemText(d)) === fold(typed)))
  const optionCount = data.length + (showCustom ? 1 : 0)
  const anchor = useAnchorRect(wrapper, open && optionCount > 0)

  return (
    <div ref={wrapper} className="relative">
      <input
        {...inputProps}
        type="text"
        role="combobox"
        aria-expanded={open && optionCount > 0}
        aria-controls={listId}
        autoComplete="off"
        value={value}
        className={className}
        onFocus={() => searchEmpty && setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (!open || optionCount === 0) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, optionCount - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && data[active]) {
            e.preventDefault()
            pick(data[active])
          } else if (e.key === 'Enter' && showCustom && active === data.length) {
            e.preventDefault()
            setOpen(false)
          } else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {open && optionCount > 0 && (
        <ul
          id={listId}
          role="listbox"
          style={anchor ? { left: anchor.left, top: anchor.top, width: anchor.width } : undefined}
          className="fixed z-50 max-h-72 min-w-[320px] overflow-auto rounded-md border border-line-strong bg-white py-1 shadow-lg"
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
          {showCustom && (
            <li
              role="option"
              aria-selected={active === data.length}
              onMouseDown={(e) => {
                e.preventDefault()
                setOpen(false)
              }}
              onMouseEnter={() => setActive(data.length)}
              className={cn(
                'cursor-pointer border-t border-line px-3 py-1.5 text-brand-text',
                active === data.length && 'bg-hover'
              )}
            >
              {customLabel!(typed)}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
