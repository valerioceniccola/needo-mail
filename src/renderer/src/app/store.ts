import { create } from 'zustand'
import type { AppState } from '@shared/api'

/*
  Copia locale dello stato che arriva dal processo principale.
  Le azioni non modificano niente qui: chiedono al principale, che rimanda lo stato aggiornato.
*/

type State = AppState & {
  ready: boolean
  /** istantanea di Gmail mostrata al posto della vista mentre c'è un dialog aperto */
  snapshot: string | null
  now: Date
  tick: () => void
}

export const useStore = create<State>((set) => ({
  accounts: [],
  unread: {},
  selectedId: null,
  adding: null,
  avatarPending: [],
  editingId: null,
  nav: { canGoBack: false, canGoForward: false },
  ready: false,
  snapshot: null,
  now: new Date(),
  tick: () => set({ now: new Date() })
}))

const api = window.gmailHub

// primo stato + aggiornamenti successivi
api.getState().then((s) => useStore.setState({ ...s, ready: true }))
api.onState((s) => useStore.setState({ ...s, ready: true, now: new Date() }))

export { api }

/**
 * Per i dialog: nasconde la vista Gmail mettendo al suo posto un'istantanea, poi la rimette.
 * Da chiamare in un useEffect; restituisce la funzione di pulizia.
 */
export function coverGmail(): () => void {
  let closed = false
  api.setOverlay(true).then((snapshot) => {
    if (!closed) useStore.setState({ snapshot })
  })
  return () => {
    closed = true
    api.setOverlay(false)
    // si toglie dopo che la vista è tornata visibile, così non si vede il riquadro vuoto
    setTimeout(() => useStore.setState({ snapshot: null }), 150)
  }
}
