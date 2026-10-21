import { useEffect } from 'react'
import { useStore } from './store'

/**
 * ⌘1…⌘9 apre l'account in quella posizione.
 * Per ora ascolta solo la finestra dell'interfaccia; quando Gmail sarà in una vista separata
 * le scorciatoie passeranno al menu dell'app nel processo principale, che le riceve sempre.
 */
export function useShortcuts() {
  const selectByIndex = useStore((s) => s.selectByIndex)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey || e.shiftKey || e.altKey || e.ctrlKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= 9) {
        e.preventDefault()
        selectByIndex(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectByIndex])
}
