import { isPaused, scheduledPauseEndsAt } from '@shared/pause'
import { api, useStore } from '@/app/store'
import { formatWhen } from '@/lib/format'
import PausedBanner from '@/components/organisms/PausedBanner/PausedBanner'
import GmailFrame from '@/components/organisms/GmailFrame/GmailFrame'
import NewAccountDialog from '@/components/organisms/NewAccountDialog/NewAccountDialog'
import content from '@/content.json'

/** Area a destra della colonna degli avatar: eventuale fascia di pausa, poi Gmail. */
export default function Main() {
  const { accounts, selectedId, adding, now } = useStore()

  // aggiunta di un account: login Google nella vista, poi dialog con etichetta e colore
  if (adding) {
    return (
      <main className="flex min-w-0 flex-1 flex-col">
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
      {paused && <PausedBanner until={end ? `${content.paused.until} ${formatWhen(end, now)}` : null} onResume={() => api.resume(account.id)} />}
      <GmailFrame />
    </main>
  )
}
