import type { ReactNode } from 'react'
import { RotateCw } from 'lucide-react'
import { api } from '@/app/store'
import { Button } from '@/components/ui/button'
import content from '@/content.json'

type Props = {
  children: ReactNode
  actions?: ReactNode
}

/**
 * Intestazione: ricarica della vista Gmail, poi il titolo passato da fuori.
 * Niente pulsanti indietro/avanti: in Gmail si naviga con i suoi comandi; restano ⌘[ e ⌘] nel menu Vista.
 */
export default function TopBar({ children, actions }: Props) {
  return (
    // pl: lascia spazio ai semafori, che stanno in questa riga
    <header className="app-drag flex h-11 shrink-0 items-center gap-2.5 pr-3 pl-[88px]">
      <div className="app-no-drag flex items-center gap-1">
        {/* tabIndex -1: non prende mai il focus, quindi niente bordo azzurro che resta acceso */}
        <Button variant="ghost" size="icon" tabIndex={-1} aria-label={content.topBar.reload} title={content.topBar.reload} onClick={api.reload}>
          <RotateCw className="size-3.5" />
        </Button>
      </div>
      <span className="mx-1 h-[18px] w-px bg-[#2c2c33]" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">{children}</div>
      {actions && <div className="app-no-drag flex items-center gap-2">{actions}</div>}
    </header>
  )
}
