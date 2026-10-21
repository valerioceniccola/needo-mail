import { isPaused, scheduledPauseEndsAt } from '@shared/pause'
import { api, useStore } from '@/app/store'
import { formatWhen } from '@/lib/format'
import { Button } from '@/components/ui/button'
import ColorDot from '@/components/atoms/ColorDot/ColorDot'
import TopBar from '@/components/organisms/TopBar/TopBar'
import PausedBanner from '@/components/organisms/PausedBanner/PausedBanner'
import GmailFrame from '@/components/organisms/GmailFrame/GmailFrame'
import NewAccountDialog from '@/components/organisms/NewAccountDialog/NewAccountDialog'
import content from '@/content.json'

/** Area a destra della barra laterale: intestazione, eventuale fascia di pausa, Gmail. */
export default function Main() {
  const { accounts, selectedId, adding, now } = useStore()

  // aggiunta di un account: login Google nella vista, poi dialog con etichetta e colore
  if (adding) {
    return (
      <main className="flex min-w-0 flex-1 flex-col">
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
        <GmailFrame />
        {adding.email && <NewAccountDialog email={adding.email} />}
      </main>
    )
  }

  const account = accounts.find((a) => a.id === selectedId)
  if (!account) return <main className="flex-1" />

  const paused = isPaused(account, now)
  const end = paused && account.override?.state !== 'paused' ? scheduledPauseEndsAt(account, now) : null

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <TopBar>
        <ColorDot color={account.color} />
        <strong className="font-semibold">{account.label}</strong>
        <span className="text-[#5a5b63]">/</span>
        <span className="truncate text-muted-foreground">{account.email}</span>
      </TopBar>
      {paused && <PausedBanner until={end ? `${content.paused.until} ${formatWhen(end, now)}` : null} onResume={() => api.resume(account.id)} />}
      <GmailFrame />
    </main>
  )
}
