import type { AppState } from '@shared/api'
import type { Account } from '@shared/types'
import { isPaused, scheduledPauseEndsAt } from '@shared/pause'
import { createStore } from './store'

/*
  Stato dell'app, tenuto nel processo principale (che è sempre vivo, anche a finestra chiusa).
  Account, ordine e selezione si salvano su disco; non letti, aggiunta in corso e navigazione no.
*/

type Saved = { accounts: Account[]; selectedId: string | null }

const store = createStore<Saved>('accounts', { accounts: [], selectedId: null })
const saved = store.read()

const state: AppState = {
  accounts: saved.accounts,
  selectedId: saved.selectedId ?? saved.accounts[0]?.id ?? null,
  unread: {},
  adding: null,
  nav: { canGoBack: false, canGoForward: false }
}

const listeners = new Set<() => void>()

export function getState(): AppState {
  return state
}

/** Chiamata a ogni cambiamento (anche ogni 30 secondi dall'orologio delle pause). */
export function onChange(listener: () => void) {
  listeners.add(listener)
}

export function emit() {
  listeners.forEach((l) => l())
}

function commit() {
  store.write({ accounts: state.accounts, selectedId: state.selectedId })
  emit()
}

export function findAccount(id: string): Account | undefined {
  return state.accounts.find((a) => a.id === id)
}

export function select(id: string) {
  if (!findAccount(id) || state.selectedId === id) return
  state.selectedId = id
  commit()
}

/** ⌘1…⌘9: la scorciatoia dipende solo dalla posizione nella lista. */
export function selectByIndex(index: number) {
  const account = state.accounts[index]
  if (account) select(account.id)
}

export function move(fromId: string, toId: string) {
  const from = state.accounts.findIndex((a) => a.id === fromId)
  const to = state.accounts.findIndex((a) => a.id === toId)
  if (from < 0 || to < 0 || from === to) return
  const [moved] = state.accounts.splice(from, 1)
  state.accounts.splice(to, 0, moved)
  commit()
}

export function pause(id: string) {
  patch(id, { override: { state: 'paused' } })
}

/** Se l'account è in pausa automatica, resta attivo fino alla fine della fascia in corso. */
export function resume(id: string) {
  const account = findAccount(id)
  if (!account) return
  const cleared = { ...account, override: null }
  const now = new Date()
  if (!isPaused(cleared, now)) return patch(id, { override: null })
  const end = scheduledPauseEndsAt(cleared, now)
  patch(id, { override: end ? { state: 'active', until: end.toISOString() } : null })
}

export function addAccount(account: Account) {
  state.accounts.push(account)
  state.selectedId = account.id
  state.adding = null
  commit()
}

export function removeAccount(id: string) {
  state.accounts = state.accounts.filter((a) => a.id !== id)
  delete state.unread[id]
  if (state.selectedId === id) state.selectedId = state.accounts[0]?.id ?? null
  commit()
}

export function setAvatar(id: string, avatar: string) {
  if (findAccount(id)?.avatar === avatar) return
  patch(id, { avatar })
}

export function setAdding(adding: AppState['adding']) {
  state.adding = adding
  emit()
}

export function setUnread(id: string, count: number) {
  if (state.unread[id] === count) return
  state.unread[id] = count
  emit()
}

export function setNav(nav: AppState['nav']) {
  if (nav.canGoBack === state.nav.canGoBack && nav.canGoForward === state.nav.canGoForward) return
  state.nav = nav
  emit()
}

function patch(id: string, changes: Partial<Account>) {
  state.accounts = state.accounts.map((a) => (a.id === id ? { ...a, ...changes } : a))
  commit()
}
