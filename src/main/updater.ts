import { app, dialog, type BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '@shared/api'

/*
  Aggiornamenti automatici dalle Release di GitHub (valerioceniccola/needo-mail, vedi electron-builder.yml).
  All'avvio e poi ogni 4 ore controlla se c'è una versione nuova; se c'è chiede se scaricarla,
  la scarica in background e propone di riavviare. Funziona solo nell'app installata, firmata e notarizzata.
*/

const { autoUpdater } = electronUpdater
const EVERY = 4 * 60 * 60 * 1000

let win: BrowserWindow
let onStatus: (status: UpdateStatus) => void = () => {}
let prepareQuit: () => void = () => {}
// controllo partito dal pulsante: se non c'è nulla di nuovo lo diciamo, altrimenti si tace
let manual = false

export function initUpdater(window: BrowserWindow, statusListener: (status: UpdateStatus) => void, beforeQuit: () => void) {
  win = window
  onStatus = statusListener
  prepareQuit = beforeQuit
  if (!app.isPackaged) return onStatus({ state: 'dev' })

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => onStatus({ state: 'checking' }))
  autoUpdater.on('update-not-available', () => {
    onStatus({ state: 'latest' })
    if (manual) dialog.showMessageBox(win, { message: 'Needo è aggiornato', detail: `Hai già l'ultima versione (${app.getVersion()}).` })
    manual = false
  })
  autoUpdater.on('update-available', async (info) => {
    manual = false
    onStatus({ state: 'available', version: info.version })
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      message: `È disponibile Needo ${info.version}`,
      detail: `Hai la versione ${app.getVersion()}. Vuoi scaricare l'aggiornamento? Puoi continuare a usare l'app mentre si scarica.`,
      buttons: ['Scarica', 'Più tardi'],
      defaultId: 0,
      cancelId: 1
    })
    if (response === 0) autoUpdater.downloadUpdate()
  })
  autoUpdater.on('download-progress', (p) => onStatus({ state: 'downloading', percent: Math.round(p.percent) }))
  autoUpdater.on('update-downloaded', async (info) => {
    onStatus({ state: 'ready', version: info.version })
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      message: `Needo ${info.version} è pronto`,
      detail: "Riavvia per completare l'aggiornamento. Se scegli più tardi, si installerà alla prossima chiusura dell'app.",
      buttons: ['Riavvia ora', 'Più tardi'],
      defaultId: 0,
      cancelId: 1
    })
    if (response === 0) quitAndInstall()
  })
  autoUpdater.on('error', (err) => {
    onStatus({ state: 'error', message: err.message })
    // messaggio breve: l'errore tecnico completo non serve a chi usa l'app
    if (manual)
      dialog.showMessageBox(win, {
        type: 'warning',
        message: 'Controllo aggiornamenti non riuscito',
        detail: 'Non riesco a controllare gli aggiornamenti in questo momento. Controlla la connessione e riprova tra qualche minuto.'
      })
    manual = false
  })

  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), EVERY)
}

/** Dal menu o dalle Impostazioni: "Controlla aggiornamenti". */
export function checkForUpdates() {
  if (!app.isPackaged) {
    dialog.showMessageBox(win, { message: 'Aggiornamenti non disponibili in sviluppo', detail: "Il controllo funziona nell'app installata dal .dmg." })
    return
  }
  manual = true
  autoUpdater.checkForUpdates().catch(() => {})
}

export function quitAndInstall() {
  // su macOS chiudere la finestra la nasconde soltanto: senza questo l'installazione resterebbe in attesa
  prepareQuit()
  autoUpdater.quitAndInstall()
}
