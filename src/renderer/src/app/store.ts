import { create } from 'zustand'
import type { AppState } from '@shared/api'

/*
  Copia locale dello stato che arriva dal processo principale.
  Le azioni non modificano niente qui: chiedono al principale, che rimanda lo stato aggiornato.
*/

type State = AppState & {
  ready: boolean
  now: Date
  tick: () => void
}

export const useStore = create<State>((set) => ({
  accounts: [],
  unread: {},
  selectedId: null,
  adding: null,
  nav: { canGoBack: false, canGoForward: false },
  ready: false,
  now: new Date(),
  tick: () => set({ now: new Date() })
}))

const api = window.gmailHub

// primo stato + aggiornamenti successivi
api.getState().then((s) => useStore.setState({ ...s, ready: true }))
api.onState((s) => useStore.setState({ ...s, ready: true, now: new Date() }))

export { api }
