import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import type { Account } from '@shared/types'
import { Button } from '@/components/ui/button'
import ColorDot from '@/components/atoms/ColorDot/ColorDot'
import content from '@/content.json'

type Props = {
  account: Account
}

/** Intestazione: indietro / avanti / ricarica sulla vista Gmail, poi etichetta ed email dell'account. */
export default function TopBar({ account }: Props) {
  return (
    <header className="app-drag flex h-11 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3">
      {/* disattivati finché Gmail non è caricato in una vista vera */}
      <div className="app-no-drag flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={content.topBar.back} disabled>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={content.topBar.forward} disabled>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={content.topBar.reload} disabled>
          <RotateCw className="size-3.5" />
        </Button>
      </div>
      <span className="mx-1 h-[18px] w-px bg-border" aria-hidden="true" />
      <ColorDot color={account.color} />
      <strong className="font-semibold">{account.label}</strong>
      <span className="text-[#5a5b63]">/</span>
      <span className="truncate text-muted-foreground">{account.email}</span>
    </header>
  )
}
