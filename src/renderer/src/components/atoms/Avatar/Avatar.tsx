import { LoaderCircle, Pause } from 'lucide-react'
import type { Account } from '@shared/types'
import { cn } from '@/lib/utils'

type Props = {
  account: Account
  selected?: boolean
  paused?: boolean
  /** foto profilo in arrivo: al posto delle iniziali gira un loader */
  loading?: boolean
}

/** Foto profilo dell'account (o iniziali sul suo colore), con bordo colorato e stato di pausa. */
export default function Avatar({ account, selected = false, paused = false, loading = false }: Props) {
  return (
    <span
      className={cn('relative flex size-11 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white', paused && 'opacity-55 grayscale')}
      // bordo nel colore dell'account staccato di 2px; più spesso sull'account aperto
      style={{ background: account.color, boxShadow: `0 0 0 2px var(--sidebar), 0 0 0 ${selected ? 4.5 : 3.5}px ${account.color}` }}
    >
      {account.avatar ? (
        <img src={account.avatar} alt="" draggable={false} className="size-full object-cover" />
      ) : loading ? (
        <span className="flex size-full items-center justify-center bg-[#222228]">
          <LoaderCircle className="size-4 animate-spin" style={{ color: account.color }} aria-label="Caricamento foto" />
        </span>
      ) : (
        initials(account.label)
      )}
      {paused && (
        <span className="absolute inset-0 flex items-center justify-center bg-[rgba(14,14,16,0.55)]">
          <Pause className="size-4 fill-foreground text-foreground" strokeWidth={0} aria-hidden="true" />
        </span>
      )}
    </span>
  )
}

/** "Lavoro" → "LA", "Studio Rossi" → "SR". */
function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return label.trim().slice(0, 2).toUpperCase() || '?'
}
