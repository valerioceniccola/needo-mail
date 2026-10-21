import { create } from 'zustand'
import type { AppState } from '@shared/api'
import { DEFAULT_SETTINGS } from '@shared/types'

/*
  Copia locale dello stato che arriva dal processo principale.
  Le azioni non modificano niente qui: chiedono al principale, che rimanda lo stato aggiornato.
*/

type State = AppState & {
  ready: boolean
  /** istantanea di Gmail mostrata al posto della vista mentre c'è un dialog aperto */
  snapshot: string | null
  /** c'è un dialog aperto: la vista Gmail è nascosta */
  covered: boolean
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
  settingsOpen: false,
  settings: DEFAULT_SETTINGS,
  canLaunchAtLogin: false,
  appVersion: '',
  nav: { canGoBack: false, canGoForward: false },
  ready: false,
  snapshot: null,
  covered: false,
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
// quanti dialog coprono Gmail in questo momento: con un contatore aprire, chiudere e riaprire
// in fretta (o il doppio effetto di React in sviluppo) non lascia mai lo stato a metà
let covers = 0

export function coverGmail(): () => void {
  covers++
  useStore.setState({ covered: true })
  if (covers === 1) {
    api.setOverlay(true).then((snapshot) => {
      if (covers > 0 && snapshot) useStore.setState({ snapshot })
    })
  }
  return () => {
    covers--
    if (covers > 0) return
    api.setOverlay(false)
    // si toglie dopo che la vista è tornata visibile, così non si vede il riquadro vuoto
    setTimeout(() => {
      if (covers === 0) useStore.setState({ snapshot: null, covered: false })
    }, 150)
  }
}
