import type { AccountChanges, AppState, NotificationStatus, UpdateStatus } from '@shared/api'
import { DEFAULT_SETTINGS, type Account, type AppSettings } from '@shared/types'
import { app } from 'electron'
import { isPaused, scheduledPauseEndsAt } from '@shared/pause'
import { createStore } from './store'

/*
  Stato dell'app, tenuto nel processo principale (che è sempre vivo, anche a finestra chiusa).
  Account, ordine e selezione si salvano su disco; non letti, aggiunta in corso e navigazione no.
*/

type Saved = { accounts: Account[]; selectedId: string | null }

const store = createStore<Saved>('accounts', { accounts: [], selectedId: null })
const saved = store.read()
const settingsStore = createStore<AppSettings>('settings', DEFAULT_SETTINGS)

const state: AppState = {
  accounts: saved.accounts,
  selectedId: saved.selectedId ?? saved.accounts[0]?.id ?? null,
  unread: {},
  adding: null,
  avatarPending: [],
  editingId: null,
  settingsOpen: false,
  settings: settingsStore.read(),
  canLaunchAtLogin: app.isPackaged,
  appVersion: app.getVersion(),
  update: { state: 'idle' },
  macNotifications: 'unknown',
  nav: { canGoBack: false, canGoForward: false, outsideGmail: false }
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
  if (!findAccount(id)) return
  // cliccando un account si torna sempre a Gmail, anche se era già quello selezionato
  if (state.selectedId === id && !state.settingsOpen) return
  state.selectedId = id
  state.settingsOpen = false
  commit()
}

export function setUpdate(update: UpdateStatus) {
  state.update = update
  emit()
}

export function setMacNotifications(status: NotificationStatus) {
  if (state.macNotifications === status) return
  state.macNotifications = status
  emit()
}

export function setSettingsOpen(open: boolean) {
  if (state.settingsOpen === open) return
  state.settingsOpen = open
  emit()
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  if (!(key in DEFAULT_SETTINGS) || typeof value !== typeof DEFAULT_SETTINGS[key]) return
  state.settings = { ...state.settings, [key]: value }
  settingsStore.write(state.settings)
  emit()
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

/** Salva le Impostazioni dell'account: solo i campi ammessi, con un minimo di controllo. */
export function updateAccount(id: string, changes: AccountChanges) {
  const label = changes.label.trim()
  const rules = changes.autoPause.rules.filter((r) => r.days.length > 0)
  patch(id, {
    ...(label ? { label } : {}),
    color: changes.color,
    badge: changes.badge !== false,
    autoPause: { enabled: changes.autoPause.enabled && rules.length > 0, rules }
  })
  state.editingId = null
  emit()
}

export function setEditing(id: string | null) {
  state.editingId = id && findAccount(id) ? id : null
  emit()
}

export function removeAccount(id: string) {
  if (state.editingId === id) state.editingId = null
  state.accounts = state.accounts.filter((a) => a.id !== id)
  delete state.unread[id]
  if (state.selectedId === id) state.selectedId = state.accounts[0]?.id ?? null
  commit()
}

/** Foto presa da Google (al primo accesso o col pulsante "Prendi da Google"). */
export function setGoogleAvatar(id: string, avatar: string) {
  patch(id, { avatar, avatarCustom: false })
}

/** Foto scelta a mano dal Mac (data URL). */
export function setCustomAvatar(id: string, avatar: string) {
  patch(id, { avatar, avatarCustom: true })
}

/** Foto profilo in caricamento: l'interfaccia mostra un loader al posto delle iniziali. */
export function setAvatarPending(id: string, pending: boolean) {
  const has = state.avatarPending.includes(id)
  if (pending === has) return
  state.avatarPending = pending ? [...state.avatarPending, id] : state.avatarPending.filter((x) => x !== id)
  emit()
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
