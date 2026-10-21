import { CirclePause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import content from '@/content.json'

type Props = {
  until: string | null
  onResume: () => void
}

/** Fascia sopra Gmail quando l'account aperto è in pausa. */
export default function PausedBanner({ until, onResume }: Props) {
  return (
    <div role="status" className="flex h-10 shrink-0 items-center gap-2.5 border-b border-paused-border bg-paused pr-3 pl-[18px]">
      <CirclePause className="size-3.5 text-[#a5acf0]" strokeWidth={2.2} aria-hidden="true" />
      <span className="font-medium">{content.paused.title}</span>
      <span className="truncate text-paused-foreground">{content.paused.description}</span>
      <span className="flex-1" />
      <span className="shrink-0 text-xs text-paused-foreground">{until ?? content.paused.manual}</span>
      <Button onClick={onResume} className="h-7">
        {content.paused.resume}
      </Button>
    </div>
  )
}
