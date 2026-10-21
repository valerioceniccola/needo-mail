import { api, useStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import ColorDot from '@/components/atoms/ColorDot/ColorDot'
import TopBar from '@/components/organisms/TopBar/TopBar'
import content from '@/content.json'

/**
 * Riga in alto larga quanto la finestra, come in Slack: semafori a sinistra, poi navigazione
 * e account aperto. Così la colonna degli avatar sotto può restare stretta.
 */
export default function Header() {
  const { ready, accounts, selectedId, adding } = useStore()

  // primo avvio: solo la riga da cui trascinare la finestra
  if (!ready || (accounts.length === 0 && !adding)) return <header className="app-drag h-11 shrink-0" />

  if (adding) {
    return (
      <TopBar
        actions={
          <Button variant="outline" size="sm" onClick={api.cancelAdd}>
            {content.add.cancel}
          </Button>
        }
      >
        <span className="rounded-[10px] border border-input px-2 text-xs font-semibold text-sidebar-foreground">{content.add.step1}</span>
        <strong className="font-semibold">{content.add.title}</strong>
        <span className="text-[#5a5b63]">/</span>
        <span className="truncate text-muted-foreground">{content.add.signIn}</span>
      </TopBar>
    )
  }

  const account = accounts.find((a) => a.id === selectedId)
  if (!account) return <header className="app-drag h-11 shrink-0" />

  return (
    <TopBar>
      <ColorDot color={account.color} />
      <strong className="font-semibold">{account.label}</strong>
      <span className="text-[#5a5b63]">/</span>
      <span className="truncate text-muted-foreground">{account.email}</span>
    </TopBar>
  )
}
