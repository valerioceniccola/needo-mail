import { useLayoutEffect, useRef } from 'react'
import { api } from '@/app/store'
import content from '@/content.json'

/**
 * Riquadro dove appare Gmail. La vista vera (WebContentsView) la disegna il processo principale
 * sopra questo rettangolo: qui misuriamo il riquadro e gli mandiamo posizione e dimensioni.
 */
export default function GmailFrame() {
  const ref = useRef<HTMLDivElement>(null)

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
    <div className="flex min-h-0 flex-1 p-2">
      <div ref={ref} className="flex flex-1 items-center justify-center rounded-[10px] bg-[#bbd5ec] text-[#444746] shadow-[0_0_0_1px_#26262b]">
        {content.gmail.loading}
      </div>
    </div>
  )
}
