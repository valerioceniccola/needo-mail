import { isPaused, scheduledPauseEndsAt } from '@shared/pause'
import { useStore } from '@/app/store'
import { formatWhen } from '@/lib/format'
import TopBar from '@/components/organisms/TopBar/TopBar'
import PausedBanner from '@/components/organisms/PausedBanner/PausedBanner'
import GmailFrame from '@/components/organisms/GmailFrame/GmailFrame'
import content from '@/content.json'

/** Area a destra della barra laterale: intestazione, eventuale fascia di pausa, Gmail. */
export default function Main() {
  const { accounts, selectedId, now, resume } = useStore()
  const account = accounts.find((a) => a.id === selectedId)
  if (!account) return <main className="flex-1" />

  const paused = isPaused(account, now)
  const end = paused && account.override?.state !== 'paused' ? scheduledPauseEndsAt(account, now) : null

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <TopBar account={account} />
      {paused && <PausedBanner until={end ? `${content.paused.until} ${formatWhen(end, now)}` : null} onResume={() => resume(account.id)} />}
      <GmailFrame email={account.email} />
    </main>
  )
}
