import { create } from 'zustand'
import type { Account } from '@shared/types'
import { isPaused, scheduledPauseEndsAt } from '@shared/pause'

// Dati di prova finché account e non letti non arrivano dal processo principale.
const demoAccounts: Account[] = [
  { id: 'personal', label: 'Personale', email: 'valerio@gmail.com', color: '#5E9CF2', override: null, autoPause: { enabled: false, rules: [] } },
  {
    id: 'work',
    label: 'Lavoro',
    email: 'valerio@studio.it',
    color: '#F2994A',
    override: null,
    autoPause: {
      enabled: true,
      rules: [
        { days: [0, 1, 2, 3, 4], allDay: false, from: '19:00', to: '09:00' },
        { days: [5, 6], allDay: true, from: '', to: '' }
      ]
    }
  },
  { id: 'clients', label: 'Clienti', email: 'info@studio.it', color: '#4CB782', override: null, autoPause: { enabled: false, rules: [] } },
  { id: 'news', label: 'Newsletter', email: 'news.valerio@gmail.com', color: '#8A8B93', override: { state: 'paused' }, autoPause: { enabled: false, rules: [] } }
]

type State = {
  accounts: Account[]
  unread: Record<string, number>
  selectedId: string | null
  now: Date
  select: (id: string) => void
  selectByIndex: (index: number) => void
  move: (fromId: string, toId: string) => void
  pause: (id: string) => void
  resume: (id: string) => void
  remove: (id: string) => void
  tick: () => void
}

export const useStore = create<State>((set, get) => ({
  accounts: demoAccounts,
  unread: { personal: 3, work: 12, clients: 5, news: 48 },
  selectedId: demoAccounts[0].id,
  now: new Date(),

  select: (id) => set({ selectedId: id }),

  // ⌘1…⌘9: la scorciatoia dipende solo dalla posizione nella lista
  selectByIndex: (index) => {
    const account = get().accounts[index]
    if (account) set({ selectedId: account.id })
  },

  move: (fromId, toId) =>
    set(({ accounts }) => {
      const from = accounts.findIndex((a) => a.id === fromId)
      const to = accounts.findIndex((a) => a.id === toId)
      if (from < 0 || to < 0 || from === to) return {}
      const next = [...accounts]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { accounts: next }
    }),

  pause: (id) => update(set, id, () => ({ override: { state: 'paused' } })),

  // se è in pausa automatica, resta attivo fino alla fine della fascia in corso
  resume: (id) =>
    update(set, id, (a) => {
      const cleared = { ...a, override: null }
      const now = get().now
      if (!isPaused(cleared, now)) return { override: null }
      const end = scheduledPauseEndsAt(cleared, now)
      return { override: end ? { state: 'active', until: end.toISOString() } : null }
    }),

  remove: (id) =>
    set(({ accounts, selectedId }) => {
      const next = accounts.filter((a) => a.id !== id)
      return { accounts: next, selectedId: selectedId === id ? (next[0]?.id ?? null) : selectedId }
    }),

  tick: () => set({ now: new Date() })
}))

/** Aggiorna un solo account con i campi restituiti da `patch`. */
function update(set: (fn: (s: State) => Partial<State>) => void, id: string, patch: (a: Account) => Partial<Account>) {
  set(({ accounts }) => ({ accounts: accounts.map((a) => (a.id === id ? { ...a, ...patch(a) } : a)) }))
}
