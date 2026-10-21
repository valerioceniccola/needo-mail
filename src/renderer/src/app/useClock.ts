import { useEffect } from 'react'
import { useStore } from './store'

/** Aggiorna l'ora dello store ogni 30 secondi, così le pause automatiche scattano da sole. */
export function useClock() {
  const tick = useStore((s) => s.tick)
  useEffect(() => {
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [tick])
}
