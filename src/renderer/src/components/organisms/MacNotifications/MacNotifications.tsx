import { useEffect, useState } from 'react'
import type { NotificationStatus } from '@shared/api'
import { api, useStore } from '@/app/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import content from '@/content.json'

const DOT: Record<NotificationStatus, string> = {
  alerts: 'bg-[#4cb782]',
  banners: 'bg-[#e5a33b]',
  none: 'bg-[#e5a33b]',
  off: 'bg-destructive',
  unknown: 'bg-subtle'
}

/** Come macOS mostra le notifiche di Needo (Avvisi, Banner, spente) e come averle fisse a schermo. */
export default function MacNotifications() {
  const update = useStore((s) => s.update)
  const [status, setStatus] = useState<NotificationStatus | null>(null)

  // si rilegge all'apertura e ogni volta che si torna su Needo (es. dalle Impostazioni di Sistema)
  useEffect(() => {
    const read = () => api.notificationStatus().then(setStatus)
    read()
    window.addEventListener('focus', read)
    return () => window.removeEventListener('focus', read)
  }, [])

  const [label, hint] = content.macNotifications.status[status ?? 'unknown']

  return (
    <>
      <h2 className="mt-5 text-[15px] font-semibold">{content.macNotifications.title}</h2>
      <div className="overflow-hidden rounded-lg border border-border bg-sidebar">
        <div className="flex items-center gap-3 px-3.5 py-[11px]">
          <span className={cn('size-2 shrink-0 rounded-full', status ? DOT[status] : 'bg-subtle')} />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="font-medium">{status ? label : '…'}</span>
            <span className="text-xs text-muted-foreground">{status && hint}</span>
          </span>
          <Button variant="outline" size="sm" onClick={api.openNotificationSettings}>
            {content.macNotifications.open}
          </Button>
        </div>
        {status !== 'alerts' && (
          <p className="border-t border-[#232328] px-3.5 py-[11px] text-xs leading-relaxed text-muted-foreground">
            {content.macNotifications.howTo}
            {update.state === 'dev' && <> {content.macNotifications.dev}</>}
          </p>
        )}
      </div>
    </>
  )
}
