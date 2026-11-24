import type { CatalogBrand, CatalogModel } from '@shared/vehicle-catalog'
import { SuggestInput } from '@/components/suggest-input'
import { fieldBase } from '@/components/ui/input'
import { call } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { BrandLogo } from './brand-logo'

interface PickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** Marca com logo (catálogo FIPE). Aceita marca fora da lista. */
export function BrandPicker({ id, value, onChange, disabled }: PickerProps) {
  return (
    <div className="relative">
      <SuggestInput<CatalogBrand>
        id={id}
        disabled={disabled}
        searchEmpty
        placeholder="Ex.: Chevrolet"
        className={cn(fieldBase, value && 'pl-9')}
        value={value}
        onChange={onChange}
        fetch={(search) => call('vehicleCatalog:brands', { search })}
        onPick={(b) => onChange(b.name)}
        itemKey={(b) => b.name}
        itemText={(b) => b.name}
        renderItem={(b) => (
          <span className="flex items-center gap-2.5">
            <BrandLogo brand={b.name} size={24} />
            {b.name}
          </span>
        )}
        customLabel={(text) => (
          <>
            Usar “{text}” <span className="text-muted">(marca fora da lista)</span>
          </>
        )}
      />
      {value && <BrandLogo brand={value} size={22} className="pointer-events-none absolute top-[5px] left-[5px]" />}
    </div>
  )
}

/** Modelo da marca escolhida: modelos primeiro, depois versões da FIPE. Aceita modelo fora da lista. */
export function ModelPicker({ id, value, onChange, disabled, brand }: PickerProps & { brand: string }) {
  return (
    <SuggestInput<CatalogModel>
      id={id}
      disabled={disabled}
      searchEmpty={!!brand}
      placeholder={brand ? 'Ex.: Onix' : 'Escolha a marca primeiro'}
      className={fieldBase}
      value={value}
      onChange={onChange}
      fetch={(search) => (brand ? call('vehicleCatalog:models', { brand, search }) : Promise.resolve([]))}
      onPick={(m) => onChange(m.name)}
      itemKey={(m) => `${m.kind}:${m.name}`}
      itemText={(m) => m.name}
      renderItem={(m) =>
        m.kind === 'model' ? (
          <span className="font-semibold">{m.name}</span>
        ) : (
          <span className="text-[13px] text-muted">{m.name}</span>
        )
      }
      customLabel={(text) => (
        <>
          Usar “{text}” <span className="text-muted">(modelo fora da lista)</span>
        </>
      )}
    />
  )
}

const COLORS: { name: string; hex: string }[] = [
  { name: 'Branco', hex: '#ffffff' },
  { name: 'Preto', hex: '#17191c' },
  { name: 'Prata', hex: '#c0c4c8' },
  { name: 'Cinza', hex: '#7a7f85' },
  { name: 'Vermelho', hex: '#c8121a' },
  { name: 'Azul', hex: '#1d4fae' },
  { name: 'Verde', hex: '#2f6b3a' },
  { name: 'Marrom', hex: '#6b4a2f' },
  { name: 'Bege', hex: '#d9c7a3' },
  { name: 'Amarelo', hex: '#e8b70c' },
  { name: 'Laranja', hex: '#e0620b' },
  { name: 'Vinho', hex: '#6d1a2a' },
  { name: 'Dourado', hex: '#b8913a' }
]

/** Cor com amostras; aceita qualquer texto. */
export function ColorPicker({ id, value, onChange, disabled }: PickerProps) {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return (
    <SuggestInput<{ name: string; hex: string }>
      id={id}
      disabled={disabled}
      searchEmpty
      className={fieldBase}
      value={value}
      onChange={onChange}
      fetch={async (search) => COLORS.filter((c) => fold(c.name).startsWith(fold(search.trim())))}
      onPick={(c) => onChange(c.name)}
      itemKey={(c) => c.name}
      itemText={(c) => c.name}
      renderItem={(c) => (
        <span className="flex items-center gap-2">
          <span className="size-4 rounded-full border border-line-strong" style={{ background: c.hex }} />
          {c.name}
        </span>
      )}
    />
  )
}
