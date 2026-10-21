// prima di tutto: nome dell'app e spostamento dei dati dal vecchio nome (vedi migrate.ts)
import './migrate'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IPC, type AccountChanges, type Rect } from '@shared/api'
import type { AppSettings } from '@shared/types'
import { savedBounds, trackWindowState, wasMaximized } from './windowState'
import * as state from './state'
import * as views from './views'
import { emailFromTitle, fetchInbox, unreadFromTitle } from './unread'
import { forgetAccount, handleInbox, initNotifier, refresh, testNotification } from './notifier'
import { buildAppMenu, confirmRemove, popupAccountMenu } from './menu'
import { avatarFromFile, readAvatar } from './avatar'
import { deleteMail } from './mailActions'
import { checkForUpdates, initUpdater, quitAndInstall } from './updater'


let win: BrowserWindow
// su macOS chiudere la finestra la nasconde soltanto: le viste Gmail restano vive per notifiche e badge
let quitting = false

/** Crea la finestra principale: barra del titolo nascosta, semafori dentro la barra laterale. */
function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...savedBounds(),
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Needo',
    backgroundColor: '#0E0E10',
    titleBarStyle: 'hiddenInset',
    // nella riga alta 44px che attraversa tutta la finestra (l'intestazione lascia loro 88px)
    trafficLightPosition: { x: 18, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/app.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  // si mostra solo a contenuto pronto, così non si vede il flash bianco
  window.once('ready-to-show', () => {
    if (wasMaximized()) window.maximize()
    window.show()
  })
  trackWindowState(window)

  window.on('close', (event) => {
    if (process.platform === 'darwin' && !quitting) {
      event.preventDefault()
      window.hide()
    }
  })

  // i link esterni dell'interfaccia vanno nel browser predefinito
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

function showWindow() {
  win.show()
  win.focus()
}

/** Account la cui vista è a schermo: quello in aggiunta, altrimenti quello selezionato. */
function visibleAccountId(): string | null {
  const { adding, selectedId, settingsOpen } = state.getState()
  if (adding) return adding.id
  // con le Impostazioni generali aperte non si vede nessuna vista Gmail
  return settingsOpen ? null : selectedId
}

/** Avvio all'accensione del Mac: solo nell'app installata (in sviluppo registrerebbe Electron). */
function applyLaunchAtLogin() {
  if (!app.isPackaged) return
  const wanted = state.getState().settings.launchAtLogin
  if (app.getLoginItemSettings().openAtLogin !== wanted) app.setLoginItemSettings({ openAtLogin: wanted })
}

// --- non letti -------------------------------------------------------------

const unreadTimers = new Map<string, NodeJS.Timeout>()

/** Rilegge i non letti poco dopo un cambio del titolo (Gmail lo aggiorna a ogni nuova email). */
function refreshUnreadSoon(id: string, titleCount: number | null) {
  clearTimeout(unreadTimers.get(id))
  unreadTimers.set(
    id,
    setTimeout(async () => {
      const inbox = await fetchInbox(id)
      if (!state.findAccount(id)) return
      if (inbox) {
        state.setUnread(id, inbox.count)
        handleInbox(id, inbox.entries)
      } else if (titleCount !== null) {
        state.setUnread(id, titleCount)
      }
    }, 1500)
  )
}

function onTitle(id: string, title: string) {
  const { adding } = state.getState()

  // aggiunta in corso: quando Gmail mostra l'indirizzo nel titolo il login è riuscito
  if (adding?.id === id) {
    const onGmail = views.viewContents(id)?.getURL().startsWith('https://mail.google.com/') ?? false
    const email = onGmail ? emailFromTitle(title) : null
    if (email && !adding.email) state.setAdding({ id, email })
    return
  }
  refreshUnreadSoon(id, unreadFromTitle(title))
}

function onNavigate(id: string) {
  if (id === visibleAccountId()) state.setNav(views.navState(id))
}

/** Foto profilo: Gmail disegna la barra in alto qualche secondo dopo il caricamento, quindi riproviamo. */
function refreshAvatar(id: string, attempt = 0) {
  if (attempt === 0) state.setAvatarPending(id, true)
  setTimeout(async () => {
    const account = state.findAccount(id)
    if (!account || account.avatarCustom) return state.setAvatarPending(id, false)
    const avatar = await readAvatar(id)
    if (avatar) state.setAvatar(id, avatar)
    if (avatar || attempt >= 4) state.setAvatarPending(id, false)
    else refreshAvatar(id, attempt + 1)
  }, 3000)
}

function onLoaded(id: string) {
  if (state.findAccount(id)) refreshAvatar(id)
}

// --- aggiunta e rimozione account -------------------------------------------

function startAdd() {
  if (state.getState().adding) return
  state.setSettingsOpen(false)
  const id = randomUUID()
  state.setAdding({ id, email: null })
  // sessione nuova e vuota: si parte dalla pagina di accesso di Google per Gmail
  views.ensureView(id, true)
}

async function cancelAdd() {
  const { adding } = state.getState()
  if (!adding) return
  state.setAdding(null)
  await views.destroyView(adding.id, true)
}

function confirmAdd(label: string, color: string) {
  const { adding } = state.getState()
  if (!adding?.email) return
  state.addAccount({
    id: adding.id,
    label: label.trim() || adding.email,
    email: adding.email,
    color,
    override: null,
    autoPause: { enabled: false, rules: [] }
  })
  refreshUnreadSoon(adding.id, null)
  // Gmail è già caricato: la foto si può leggere subito
  refreshAvatar(adding.id)
}

async function chooseAvatar(id: string) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Scegli una foto',
    properties: ['openFile'],
    filters: [{ name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'heic', 'webp', 'gif', 'tiff'] }]
  })
  if (canceled || !filePaths[0]) return
  const avatar = avatarFromFile(filePaths[0])
  if (avatar) state.setCustomAvatar(id, avatar)
  else dialog.showMessageBox(win, { type: 'warning', message: 'Immagine non leggibile', detail: 'Prova con un file PNG o JPG.' })
}

function resetAvatar(id: string) {
  state.setCustomAvatar(id, null)
  refreshAvatar(id)
}

async function removeAccount(id: string) {
  state.removeAccount(id)
  forgetAccount(id)
  await views.destroyView(id, true)
}

// --- collegamenti -------------------------------------------------------------

const menuActions = {
  addAccount: () => {
    showWindow()
    startAdd()
  },
  back: () => views.viewContents(visibleAccountId())?.navigationHistory.goBack(),
  forward: () => views.viewContents(visibleAccountId())?.navigationHistory.goForward(),
  reload: () => views.viewContents(visibleAccountId())?.reload(),
  testNotification,
  checkForUpdates
}

function registerIpc() {
  ipcMain.handle(IPC.getState, () => state.getState())
  ipcMain.on(IPC.select, (_e, id: string) => state.select(id))
  ipcMain.on(IPC.move, (_e, fromId: string, toId: string) => state.move(fromId, toId))
  ipcMain.on(IPC.menu, (_e, id: string) => popupAccountMenu(win, id, removeAccount))
  ipcMain.on(IPC.resume, (_e, id: string) => state.resume(id))
  ipcMain.on(IPC.closeSettings, () => state.setEditing(null))
  ipcMain.on(IPC.checkUpdates, checkForUpdates)
  ipcMain.on(IPC.installUpdate, quitAndInstall)
  ipcMain.on(IPC.openSettingsPage, () => state.setSettingsOpen(true))
  ipcMain.on(IPC.closeSettingsPage, () => state.setSettingsOpen(false))
  ipcMain.on(IPC.setSetting, (_e, key: keyof AppSettings, value: boolean) => {
    state.setSetting(key, value)
    if (key === 'launchAtLogin') applyLaunchAtLogin()
  })
  ipcMain.on(IPC.update, (_e, id: string, changes: AccountChanges) => state.updateAccount(id, changes))
  ipcMain.on(IPC.chooseAvatar, (_e, id: string) => chooseAvatar(id))
  ipcMain.on(IPC.resetAvatar, (_e, id: string) => resetAvatar(id))
  ipcMain.on(IPC.remove, (_e, id: string) => confirmRemove(win, id, removeAccount))
  ipcMain.on(IPC.startAdd, startAdd)
  ipcMain.on(IPC.cancelAdd, cancelAdd)
  ipcMain.on(IPC.confirmAdd, (_e, label: string, color: string) => confirmAdd(label, color))
  ipcMain.on(IPC.bounds, (_e, rect: Rect) => views.setViewBounds(rect))
  ipcMain.handle(IPC.overlay, (_e, visible: boolean) => views.setOverlay(visible))
  ipcMain.on(IPC.back, menuActions.back)
  ipcMain.on(IPC.forward, menuActions.forward)
  ipcMain.on(IPC.reload, menuActions.reload)

}

app.whenReady().then(() => {
  // in sviluppo il Dock mostrerebbe l'icona di Electron; nell'app impacchettata usa build/icon.icns
  if (!app.isPackaged) app.dock?.setIcon(join(__dirname, '../../build/icon.png'))

  win = createWindow()
  views.initViews(win, { onTitle, onNavigate, onLoaded })
  initNotifier({
    showWindow,
    openLink: (id, url) => views.viewContents(id)?.loadURL(url.replace(/^http:/, 'https:')),
    deleteMail: async (id, url) => {
      const ok = await deleteMail(id, url)
      refreshUnreadSoon(id, null)
      return ok
    }
  })
  registerIpc()
  applyLaunchAtLogin()
  initUpdater(win, state.setUpdate, () => {
    quitting = true
  })

  // tutte le viste partono subito: servono anche quelle non a schermo, per non letti e notifiche
  for (const account of state.getState().accounts) views.ensureView(account.id)

  let lastVisible: string | null | undefined
  const sync = () => {
    const visible = visibleAccountId()
    if (visible !== lastVisible) {
      lastVisible = visible
      views.showView(visible)
      state.setNav(views.navState(visible))
    }
    if (!win.isDestroyed()) win.webContents.send(IPC.state, state.getState())
    buildAppMenu(menuActions)
    refresh()
  }
  state.onChange(sync)
  sync()

  // orologio delle pause automatiche e ricontrollo periodico dei non letti
  setInterval(state.emit, 30_000)
  setInterval(() => state.getState().accounts.forEach((a) => refreshUnreadSoon(a.id, null)), 60_000)
  state.getState().accounts.forEach((a) => refreshUnreadSoon(a.id, null))

  // su macOS cliccando l'icona nel Dock si riapre la finestra nascosta
  app.on('activate', showWindow)
})

app.on('before-quit', () => {
  quitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
