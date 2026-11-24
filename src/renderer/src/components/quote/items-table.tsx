import { Package, Wrench, X } from 'lucide-react'
import { bpToInput, centsToInput, formatMoney, milliToInput } from '@shared/format'
import type { CatalogPart, CatalogService, PricedItem } from '@shared/quotes'
import type { AppSettings } from '@shared/settings'
import { ItemTypeTag } from '@/components/status-tag'
import { SuggestInput } from '@/components/suggest-input'
import { Button } from '@/components/ui/button'
import { CellInput } from '@/components/ui/input'
import { Panel, PanelHeader } from '@/components/ui/panel'
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table'
import { call } from '@/lib/ipc'
import { newLaborItem, newPartItem, type ItemDraft } from '@/lib/quote-draft'
import { cn } from '@/lib/utils'

interface Props {
  items: ItemDraft[]
  priced: PricedItem[] | undefined
  onChange: (items: ItemDraft[]) => void
  settings: AppSettings
  hourlyRateCents: number
  errors: Record<string, string>
  readOnly: boolean
}

const cellText =
  'h-7 w-full rounded-md border border-transparent bg-transparent px-2 hover:border-line focus:border-line-strong focus:bg-white'

export function ItemsTable({ items, priced, onChange, settings, hourlyRateCents, errors, readOnly }: Props) {
  const setItem = (key: string, patch: Partial<ItemDraft>) =>
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  function add(item: ItemDraft) {
    onChange([...items, item])
    // Foca a descrição da linha nova depois do render.
    requestAnimationFrame(() => document.getElementById(`item-${item.key}`)?.focus())
  }

  const pickPart = (key: string, p: CatalogPart) =>
    setItem(key, {
      description: p.name,
      partId: p.id,
      cost: centsToInput(p.lastCostCents),
      markup: bpToInput(p.defaultMarkupBp ?? settings.defaultMarkupBp)
    })

  const pickService = (key: string, s: CatalogService) =>
    setItem(key, {
      description: s.name,
      serviceId: s.id,
      ...(s.fixedPriceCents != null
        ? { qty: '1', price: centsToInput(s.fixedPriceCents) }
        : { qty: milliToInput(s.defaultHoursMilli ?? 1000), price: centsToInput(hourlyRateCents) })
    })

  return (
    <Panel>
      <PanelHeader>
        Itens
        {!readOnly && (
          <span className="flex gap-2">
            <Button onClick={() => add(newPartItem(settings))}>
              <Package size={15} aria-hidden="true" />
              Peça
            </Button>
            <Button onClick={() => add(newLaborItem(hourlyRateCents))}>
              <Wrench size={15} aria-hidden="true" />
              Mão de obra
            </Button>
          </span>
        )}
      </PanelHeader>
      <Table className="min-w-[820px]">
        <THead>
          <Tr>
            <Th className="w-[34%]">Descrição</Th>
            <Th>Tipo</Th>
            <Th className="num w-20">Qtd</Th>
            <Th className="num w-[110px]">Custo un.</Th>
            <Th className="num w-[90px]">Markup %</Th>
            <Th className="num w-[120px]">Preço un.</Th>
            <Th className="num w-[110px]">Total</Th>
            <Th className="w-10" />
          </Tr>
        </THead>
        <TBody>
          {items.map((item, index) => {
            const p = priced?.[index]
            const error = errors[`items.${index}`]
            const isPart = item.type === 'PECA'
            return (
              <Tr key={item.key} className={cn(error && '[&>td]:bg-[#fff5f5]')}>
                <Td className="py-1">
                  {readOnly ? (
                    <span className="px-2">{item.description}</span>
                  ) : isPart ? (
                    <SuggestInput<CatalogPart>
                      id={`item-${item.key}`}
                      aria-label="Descrição"
                      placeholder="Descrição da peça"
                      className={cellText}
                      value={item.description}
                      onChange={(description) => setItem(item.key, { description, partId: null })}
                      fetch={(search) => call('catalog:parts', { search })}
                      onPick={(part) => pickPart(item.key, part)}
                      itemKey={(part) => part.id}
                      renderItem={(part) => (
                        <span className="flex justify-between gap-3">
                          <span>
                            {part.name}
                            {part.brand && <span className="text-muted"> — {part.brand}</span>}
                          </span>
                          <span className="text-[12px] text-muted">custo {formatMoney(part.lastCostCents)}</span>
                        </span>
                      )}
                    />
                  ) : (
                    <SuggestInput<CatalogService>
                      id={`item-${item.key}`}
                      aria-label="Descrição"
                      placeholder="Serviço"
                      className={cellText}
                      value={item.description}
                      onChange={(description) => setItem(item.key, { description, serviceId: null })}
                      fetch={(search) => call('catalog:services', { search })}
                      onPick={(service) => pickService(item.key, service)}
                      itemKey={(service) => service.id}
                      renderItem={(service) => (
                        <span className="flex justify-between gap-3">
                          <span>{service.name}</span>
                          <span className="text-[12px] text-muted">
                            {service.fixedPriceCents != null
                              ? formatMoney(service.fixedPriceCents)
                              : `${milliToInput(service.defaultHoursMilli ?? 0)} h`}
                          </span>
                        </span>
                      )}
                    />
                  )}
                  {error && <span className="block px-2 text-[12px] text-brand-text">{error}</span>}
                </Td>
                <Td>
                  <ItemTypeTag type={item.type} />
                </Td>
                <Td className="py-1">
                  <NumCell
                    label={isPart ? 'Quantidade' : 'Horas'}
                    value={item.qty}
                    readOnly={readOnly}
                    onChange={(qty) => setItem(item.key, { qty })}
                  />
                </Td>
                <Td className="py-1">
                  {isPart ? (
                    <NumCell label="Custo unitário" value={item.cost} readOnly={readOnly} onChange={(cost) => setItem(item.key, { cost })} />
                  ) : (
                    <span className="num block px-2 text-muted">—</span>
                  )}
                </Td>
                <Td className="py-1">
                  {isPart ? (
                    <NumCell label="Markup em %" value={item.markup} readOnly={readOnly} onChange={(markup) => setItem(item.key, { markup })} />
                  ) : (
                    <span className="num block px-2 text-muted">—</span>
                  )}
                </Td>
                <Td className="num py-1">
                  {isPart ? (
                    <span className="px-2">{p ? formatMoney(p.unitPriceCents) : ''}</span>
                  ) : (
                    <NumCell label="Valor da hora" value={item.price} readOnly={readOnly} onChange={(price) => setItem(item.key, { price })} />
                  )}
                </Td>
                <Td className="num font-semibold">{p ? formatMoney(p.totalCents) : ''}</Td>
                <Td className="py-1">
                  {!readOnly && (
                    <Button
                      variant="icon"
                      aria-label="Remover item"
                      onClick={() => onChange(items.filter((i) => i.key !== item.key))}
                    >
                      <X size={15} aria-hidden="true" />
                    </Button>
                  )}
                </Td>
              </Tr>
            )
          })}
          {items.length === 0 && (
            <Tr>
              <Td colSpan={8} className="py-8 text-center text-muted">
                {readOnly ? 'Sem itens.' : 'Adicione as peças e a mão de obra do serviço.'}
              </Td>
            </Tr>
          )}
        </TBody>
      </Table>
    </Panel>
  )
}

function NumCell({
  label,
  value,
  onChange,
  readOnly
}: {
  label: string
  value: string
  onChange: (v: string) => void
  readOnly: boolean
}) {
  if (readOnly) return <span className="num block px-2">{value}</span>
  return (
    <CellInput
      aria-label={label}
      inputMode="decimal"
      className="text-right tabular-nums"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
    />
  )
}
