import type { Account } from './types'

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
  startAdd: () => void
  cancelAdd: () => void
  confirmAdd: (label: string, color: string) => void
  setViewBounds: (rect: Rect) => void
  setOverlay: (visible: boolean) => void
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
  startAdd: 'add:start',
  cancelAdd: 'add:cancel',
  confirmAdd: 'add:confirm',
  bounds: 'view:bounds',
  overlay: 'view:overlay',
  back: 'nav:back',
  forward: 'nav:forward',
  reload: 'nav:reload'
} as const
