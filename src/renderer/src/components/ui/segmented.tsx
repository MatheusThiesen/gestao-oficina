import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  label: string
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
}

/** Filtro em segmentos (.filters do protótipo), com contagem opcional por opção. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="mb-3 flex w-max max-w-full flex-wrap gap-0.5 rounded-lg border border-line bg-white p-0.5"
    >
      {options.map((opt) => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md border-0 px-3',
              on ? 'bg-side text-side-strong' : 'bg-transparent text-ink hover:bg-hover'
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-[11.5px] leading-[18px] font-semibold tabular-nums',
                  on ? 'bg-side-hover text-side-strong' : 'bg-bg text-muted'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
