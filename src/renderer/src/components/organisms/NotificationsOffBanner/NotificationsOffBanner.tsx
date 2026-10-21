import { TriangleAlert } from 'lucide-react'
import { api } from '@/app/store'
import { Button } from '@/components/ui/button'
import content from '@/content.json'

type Props = {
  onDismiss: () => void
}

/** Fascia gialla sopra Gmail quando macOS ha disattivato le notifiche di Needo. */
export default function NotificationsOffBanner({ onDismiss }: Props) {
  const text = content.macNotifications.warning
  return (
    <div role="alert" className="mr-2 mb-2 flex h-10 shrink-0 items-center gap-2.5 rounded-[10px] border border-[#5a4a1f] bg-[#2a2414] pr-1.5 pl-4">
      <TriangleAlert className="size-3.5 shrink-0 text-[#e5b53b]" strokeWidth={2.2} aria-hidden="true" />
      <span className="shrink-0 font-medium">{text.title}</span>
      <span className="truncate text-[#c9bc96]">{text.description}</span>
      <span className="flex-1" />
      <Button variant="ghost" onClick={onDismiss} className="h-7 text-[#c9bc96]">
        {text.dismiss}
      </Button>
      <Button onClick={api.openNotificationSettings} className="h-7 bg-[#e5b53b] text-[#1d1708] hover:bg-[#f0c24f]">
        {text.action}
      </Button>
    </div>
  )
}
