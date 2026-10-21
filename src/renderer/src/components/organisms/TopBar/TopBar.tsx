import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { api, useStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import content from '@/content.json'

type Props = {
  children: ReactNode
  actions?: ReactNode
}

/** Intestazione: indietro / avanti / ricarica sulla vista Gmail, poi il titolo passato da fuori. */
export default function TopBar({ children, actions }: Props) {
  const nav = useStore((s) => s.nav)

  return (
    <header className="app-drag flex h-11 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3">
      <div className="app-no-drag flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={content.topBar.back} disabled={!nav.canGoBack} onClick={api.back}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={content.topBar.forward} disabled={!nav.canGoForward} onClick={api.forward}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={content.topBar.reload} onClick={api.reload}>
          <RotateCw className="size-3.5" />
        </Button>
      </div>
      <span className="mx-1 h-[18px] w-px bg-border" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">{children}</div>
      {actions && <div className="app-no-drag flex items-center gap-2">{actions}</div>}
    </header>
  )
}
