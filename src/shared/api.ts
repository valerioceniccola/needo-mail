import type { Account, AppSettings } from './types'

/** Campi dell'account modificabili dalle Impostazioni. */
export type AccountChanges = Pick<Account, 'label' | 'color' | 'autoPause'> & { badge: boolean }

/** Stato degli aggiornamenti, mostrato in fondo alle Impostazioni. */
export type UpdateStatus =
  | { state: 'dev' }
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'latest' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }

/** Notifiche di Needo in macOS: spente, stile Temporanei (spariscono da sole), Permanenti (restano), Nessuno, o non si sa. */
export type NotificationStatus = 'off' | 'banners' | 'alerts' | 'none' | 'unknown'

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
  /** pagina delle Impostazioni generali aperta al posto di Gmail */
  settingsOpen: boolean
  settings: AppSettings
  /** l'avvio al login si può impostare solo nell'app installata, non in sviluppo */
  canLaunchAtLogin: boolean
  /** versione dell'app (da package.json) */
  appVersion: string
  update: UpdateStatus
  /** come macOS mostra le notifiche di Needo (riletto a ogni ritorno sulla finestra) */
  macNotifications: NotificationStatus
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
  openSettingsPage: () => void
  closeSettingsPage: () => void
  checkForUpdates: () => void
  openNotificationSettings: () => void
  installUpdate: () => void
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  updateAccount: (id: string, changes: AccountChanges) => void
  removeAccount: (id: string) => void
  /** sceglie un'immagine dal Mac e la usa come foto dell'account */
  chooseAvatar: (id: string) => void
  /** riprende la foto dal profilo Google (anche al posto di una caricata a mano) */
  resetAvatar: (id: string) => void
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
  openSettingsPage: 'settings-page:open',
  closeSettingsPage: 'settings-page:close',
  setSetting: 'settings:set',
  checkUpdates: 'update:check',
  openNotificationSettings: 'notifications:open-settings',
  installUpdate: 'update:install',
  update: 'account:update',
  remove: 'account:remove',
  chooseAvatar: 'account:avatar-choose',
  resetAvatar: 'account:avatar-reset',
  startAdd: 'add:start',
  cancelAdd: 'add:cancel',
  confirmAdd: 'add:confirm',
  bounds: 'view:bounds',
  overlay: 'view:overlay',
  back: 'nav:back',
  forward: 'nav:forward',
  reload: 'nav:reload'
} as const
