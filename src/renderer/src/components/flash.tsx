import { Check } from 'lucide-react'

export function Flash({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <span role="status" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#17693a]">
      <Check size={15} aria-hidden="true" />
      {message}
    </span>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="mb-4 rounded-md border border-[#f3c2c5] bg-[#fde6e7] px-3 py-2 text-[13.5px] text-[#a10e15]">
      {message}
    </div>
  )
}
