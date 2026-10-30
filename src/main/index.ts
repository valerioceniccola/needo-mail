// prima di tutto: nome dell'app e spostamento dei dati dal vecchio nome (vedi migrate.ts)
import './migrate'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, powerMonitor, shell } from 'electron'
import { IPC, type AccountChanges, type Rect } from '@shared/api'
import type { AppSettings } from '@shared/types'
import { savedBounds, trackWindowState, wasMaximized } from './windowState'
import * as state from './state'
import * as views from './views'
import { emailFromTitle, fetchInbox, unreadFromTitle } from './unread'
import { forgetAccount, handleInbox, initNotifier, introduceNotifications, refresh, testCode, testNotification } from './notifier'
import { buildAppMenu, confirmRemove, popupAccountMenu } from './menu'
import { avatarFromFile, readAvatar } from './avatar'
import { notificationStatus, openNotificationSettings } from './notificationStatus'
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
        // i non letti sono cambiati (email nuova, o letta/eliminata altrove): anche la pagina di Gmail
        // si riallinea, così non mostra uno stato vecchio. Solo quando cambiano: non costa nulla negli altri casi.
        const before = state.getState().unread[id]
        if (before !== undefined && before !== inbox.count) views.refreshGmail(id)
        state.setUnread(id, inbox.count)
        handleInbox(id, inbox)
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

/**
 * Foto profilo da Google. Si legge da sola una volta sola (account appena aggiunto o ancora senza foto),
 * poi resta salvata in accounts.json: si riprende solo col pulsante "Prendi da Google".
 * Gmail disegna la barra in alto qualche secondo dopo il caricamento, quindi riproviamo.
 * Con `manual` la foto di Google sostituisce anche una foto caricata a mano.
 */
function refreshAvatar(id: string, manual = false, attempt = 0) {
  if (attempt === 0) state.setAvatarPending(id, true)
  setTimeout(async () => {
    const account = state.findAccount(id)
    if (!account || (account.avatarCustom && !manual)) return state.setAvatarPending(id, false)
    const avatar = await readAvatar(id)
    if (avatar) state.setGoogleAvatar(id, avatar)
    if (avatar || attempt >= (manual ? 6 : 4)) {
      state.setAvatarPending(id, false)
      if (!avatar && manual) dialog.showMessageBox(win, { type: 'warning', message: 'Foto non trovata', detail: 'Non sono riuscito a prendere la foto dal profilo Google. Riprova tra qualche secondo, quando Gmail ha finito di caricare.' })
    } else refreshAvatar(id, manual, attempt + 1)
  }, attempt === 0 && manual ? 0 : 3000)
}

function onLoaded(id: string) {
  const account = state.findAccount(id)
  if (account && !account.avatar && !state.getState().avatarPending.includes(id)) refreshAvatar(id)
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
  introduceNotifications()
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
  // la vista dell'account potrebbe non essere ancora aperta in questa sessione
  views.ensureView(id)
  refreshAvatar(id, true)
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
  zoom: (step: -1 | 0 | 1) => {
    const wc = views.viewContents(visibleAccountId())
    if (wc) wc.setZoomLevel(step === 0 ? 0 : Math.max(-3, Math.min(3, wc.getZoomLevel() + step * 0.5)))
  },
  gmailDevTools: () => views.viewContents(visibleAccountId())?.openDevTools({ mode: 'detach' }),
  // solo in sviluppo: lo stesso giro del risveglio del Mac, per provarlo senza mettere il Mac in stop
  simulateWake: () => {},
  testCode,
  testNotification,
  checkForUpdates
}

function registerIpc() {
  ipcMain.handle(IPC.getState, () => state.getState())
  ipcMain.on(IPC.openNotificationSettings, () => openNotificationSettings())
  ipcMain.on(IPC.select, (_e, id: string) => state.selectByUser(id))
  state.setOnReselect((id) => views.backToGmail(id))
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
  ipcMain.on(IPC.backToGmail, () => views.backToGmail(visibleAccountId()))

}

app.whenReady().then(() => {
  // in sviluppo il Dock mostrerebbe l'icona di Electron; nell'app impacchettata usa build/icon.icns
  if (!app.isPackaged) app.dock?.setIcon(join(__dirname, '../../build/icon.png'))

  win = createWindow()
  views.initViews(win, { onTitle, onNavigate, onLoaded })
  initNotifier({
    showWindow,
    openInbox: views.openInbox,
    openMail: views.openMail,
    deleteMail: async (id, messageId, byUser) => {
      const result = await views.deleteMailInView(id, messageId, byUser)
      if (result === 'ok') refreshUnreadSoon(id, null)
      return result
    }
  })
  registerIpc()
  applyLaunchAtLogin()
  initUpdater(win, state.setUpdate, () => {
    quitting = true
  })

  // stato delle notifiche in macOS: all'avvio e a ogni ritorno sulla finestra (es. dalle Impostazioni di Sistema)
  const readMacNotifications = () => notificationStatus().then(state.setMacNotifications)
  readMacNotifications()
  win.on('focus', readMacNotifications)

  // prima la vista dell'account aperto, così ha tutto il Mac per sé; le altre partono tutte insieme 4 secondi dopo.
  // Non letti e notifiche non dipendono dalle viste (arrivano dal feed con i cookie dell'account),
  // quindi funzionano da subito per tutti gli account. Cliccando un account non ancora caricato parte subito.
  const first = state.getState().selectedId
  if (first) views.ensureView(first)
  state
    .getState()
    .accounts.filter((a) => a.id !== first)
    .forEach((account) => setTimeout(() => state.findAccount(account.id) && views.ensureView(account.id), 4000))

  let lastVisible: string | null | undefined
  const sync = () => {
    const visible = visibleAccountId()
    const changed = visible !== lastVisible
    lastVisible = visible
    // aprendo le Impostazioni la vista Gmail si toglie un attimo dopo aver mandato lo stato:
    // così sotto c'è già la pagina scura delle Impostazioni e non si intravede la sagoma di Gmail
    const delayHide = changed && visible === null && state.getState().settingsOpen
    if (changed && !delayHide) {
      views.showView(visible)
      state.setNav(views.navState(visible))
    }
    if (!win.isDestroyed()) win.webContents.send(IPC.state, state.getState())
    if (delayHide)
      setTimeout(() => {
        if (lastVisible === null) views.showView(null)
      }, 80)
    buildAppMenu(menuActions)
    refresh()
  }
  state.onChange(sync)
  sync()

  // orologio delle pause automatiche e ricontrollo periodico dei non letti
  setInterval(state.emit, 30_000)
  // posta nuova ogni 10 secondi: il feed è una richiesta leggera (pochi kB per account). Più spesso no,
  // per non rischiare limiti di Google; un'email arriva sul Mac in media ~5 secondi dopo
  setInterval(() => state.getState().accounts.forEach((a) => refreshUnreadSoon(a.id, null)), 10_000)
  state.getState().accounts.forEach((a) => refreshUnreadSoon(a.id, null))
  // chi ha già account ma non ha mai visto la richiesta di macOS (versioni precedenti) la riceve ora
  introduceNotifications()
  // al risveglio del Mac o allo sblocco si ricontrolla subito: le notifiche di email già gestite
  // dal telefono durante la notte si chiudono, quelle nuove arrivano senza aspettare il giro dei 10 secondi
  // e dopo lo stop si preme "Aggiorna" in ogni casella: Gmail potrebbe essere rimasto allo stato di prima.
  // Due volte: dopo pochi secondi e dopo 20, perché al risveglio la rete può tornare con calma.
  const checkNow = () => {
    state.getState().accounts.forEach((a) => refreshUnreadSoon(a.id, null))
    for (const delay of [3000, 20_000]) setTimeout(() => state.getState().accounts.forEach((a) => views.refreshGmail(a.id)), delay)
  }
  powerMonitor.on('resume', checkNow)
  powerMonitor.on('unlock-screen', checkNow)
  menuActions.simulateWake = checkNow

  // su macOS cliccando l'icona nel Dock si riapre la finestra nascosta
  app.on('activate', showWindow)
})

app.on('before-quit', () => {
  quitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
