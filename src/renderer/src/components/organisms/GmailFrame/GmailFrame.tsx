import { useLayoutEffect, useRef } from 'react'
import { api, useStore } from '@/app/store'
import GmailSkeleton from '@/components/molecules/GmailSkeleton/GmailSkeleton'

/**
 * Riquadro dove appare Gmail. La vista vera (WebContentsView) la disegna il processo principale
 * sopra questo rettangolo: qui misuriamo il riquadro e gli mandiamo posizione e dimensioni.
 */
export default function GmailFrame() {
  const ref = useRef<HTMLDivElement>(null)
  const snapshot = useStore((s) => s.snapshot)
  const covered = useStore((s) => s.covered)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const send = () => {
      const r = el.getBoundingClientRect()
      api.setViewBounds({ x: r.x, y: r.y, width: r.width, height: r.height })
    }
    send()
    const observer = new ResizeObserver(send)
    observer.observe(el)
    window.addEventListener('resize', send)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', send)
      // riquadro smontato (es. schermata di benvenuto): la vista sparisce
      api.setViewBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 pr-2 pb-2">
      <div ref={ref} className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[10px] bg-[#f6f8fc] shadow-[0_0_0_1px_#26262b]">
        {/* finché Gmail carica si vede la sua sagoma; sotto un dialog: o l'istantanea, o il riquadro vuoto sfocato */}
        {!covered && <GmailSkeleton />}
        {snapshot && <img src={snapshot} alt="" draggable={false} className="absolute inset-0 size-full object-cover object-top-left" />}
      </div>
    </div>
  )
}
