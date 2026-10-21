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
  // lo rilegge il processo principale a ogni ritorno sulla finestra (es. dalle Impostazioni di Sistema)
  const status = useStore((s) => s.macNotifications)
  const [label, hint] = content.macNotifications.status[status]

  return (
    <>
      <h2 className="mt-5 text-[15px] font-semibold">{content.macNotifications.title}</h2>
      <div className="overflow-hidden rounded-lg border border-border bg-sidebar">
        <div className="flex items-center gap-3 px-3.5 py-[11px]">
          <span className={cn('size-2 shrink-0 rounded-full', DOT[status])} />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
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
