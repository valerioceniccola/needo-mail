import type { Account } from './types'

/** Campi dell'account modificabili dalle Impostazioni. */
export type AccountChanges = Pick<Account, 'label' | 'color' | 'autoPause'>

/** Rettangolo in pixel della finestra (coordinate CSS dell'interfaccia). */
export type Rect = { x: number; y: number; width: number; height: number }

/** Tutto quello che l'interfaccia deve sapere: lo manda il processo principale a ogni cambiamento. */
export type AppState = {
  accounts: Account[]
  unread: Record<string, number>
  selectedId: string | null
  /** account in fase di aggiunta: email presente quando il login Google è completato */
  adding: { id: string; email: string | null } | null
  /** account di cui si sta leggendo la foto profilo */
  avatarPending: string[]
  /** account con la finestra Impostazioni aperta */
  editingId: string | null
  nav: { canGoBack: boolean; canGoForward: boolean }
}

/** Funzioni che il preload espone all'interfaccia come window.gmailHub. */
export type GmailHubApi = {
  getState: () => Promise<AppState>
  onState: (listener: (state: AppState) => void) => () => void
  select: (id: string) => void
  move: (fromId: string, toId: string) => void
  openAccountMenu: (id: string) => void
  resume: (id: string) => void
  closeSettings: () => void
  updateAccount: (id: string, changes: AccountChanges) => void
  removeAccount: (id: string) => void
  startAdd: () => void
  cancelAdd: () => void
  confirmAdd: (label: string, color: string) => void
  setViewBounds: (rect: Rect) => void
  /** nasconde (o rimostra) la vista Gmail; nascondendola restituisce un'istantanea da mettere al suo posto */
  setOverlay: (visible: boolean) => Promise<string | null>
  back: () => void
  forward: () => void
  reload: () => void
}

/** Nomi dei canali IPC, in un solo posto per main e preload. */
export const IPC = {
  getState: 'state:get',
  state: 'state',
  select: 'account:select',
  move: 'account:move',
  menu: 'account:menu',
  resume: 'account:resume',
  closeSettings: 'settings:close',
  update: 'account:update',
  remove: 'account:remove',
  startAdd: 'add:start',
  cancelAdd: 'add:cancel',
  confirmAdd: 'add:confirm',
  bounds: 'view:bounds',
  overlay: 'view:overlay',
  back: 'nav:back',
  forward: 'nav:forward',
  reload: 'nav:reload'
} as const
