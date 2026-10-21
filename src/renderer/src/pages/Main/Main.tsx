import { useState } from 'react'
import { isPaused, scheduledPauseEndsAt } from '@shared/pause'
import { api, useStore } from '@/app/store'
import { formatWhen } from '@/lib/format'
import PausedBanner from '@/components/organisms/PausedBanner/PausedBanner'
import NotificationsOffBanner from '@/components/organisms/NotificationsOffBanner/NotificationsOffBanner'
import GmailFrame from '@/components/organisms/GmailFrame/GmailFrame'
import NewAccountDialog from '@/components/organisms/NewAccountDialog/NewAccountDialog'
import content from '@/content.json'

/** Area a destra della colonna degli avatar: eventuali fasce (notifiche spente, pausa), poi Gmail. */
export default function Main() {
  const { accounts, selectedId, adding, now, settings, macNotifications } = useStore()
  // "Non ora" la nasconde fino al prossimo avvio dell'app
  const [warningDismissed, setWarningDismissed] = useState(false)

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
      {/* solo se in Needo le notifiche sono accese ma macOS le blocca */}
      {settings.notifications && settings.notificationsWarning && macNotifications === 'off' && !warningDismissed && <NotificationsOffBanner onDismiss={() => setWarningDismissed(true)} />}
      {paused && <PausedBanner until={end ? `${content.paused.until} ${formatWhen(end, now)}` : null} onResume={() => api.resume(account.id)} />}
      <GmailFrame />
    </main>
  )
}
