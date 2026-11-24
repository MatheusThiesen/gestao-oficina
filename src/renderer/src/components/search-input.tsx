import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  placeholder: string
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

/** Campo de busca da página. Recebe o foco com Ctrl+F (atributo data-page-search). */
export function SearchInput({ placeholder, label, value, onChange, className }: SearchInputProps) {
  return (
    <Input
      type="search"
      data-page-search
      placeholder={placeholder}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('w-[260px]', className)}
    />
  )
}
