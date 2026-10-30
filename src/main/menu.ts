import { app, dialog, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { isPaused } from '@shared/pause'
import { findAccount, getState, pause, resume, selectByIndex, setEditing } from './state'

type Actions = {
  addAccount: () => void
  back: () => void
  forward: () => void
  reload: () => void
  zoom: (step: -1 | 0 | 1) => void
  gmailDevTools: () => void
  simulateWake: () => void
  testCode: () => void
  testNotification: () => void
  checkForUpdates: () => void
}

/**
 * Menu dell'app nella barra in alto. Le scorciatoie ⌘1…⌘9 stanno qui (e non nell'interfaccia)
 * perché funzionano anche quando il cursore è dentro Gmail.
 */
export function buildAppMenu(actions: Actions) {
  const { accounts, selectedId } = getState()

  const accountItems: MenuItemConstructorOptions[] = accounts.map((a, i) => ({
    label: a.label,
    type: 'radio',
    checked: a.id === selectedId,
    accelerator: i < 9 ? `CmdOrCtrl+${i + 1}` : undefined,
    click: () => selectByIndex(i)
  }))

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: `Informazioni su ${app.name}` },
        { label: 'Controlla aggiornamenti…', click: actions.checkForUpdates },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [{ label: 'Aggiungi account…', click: actions.addAccount }, { type: 'separator' }, { role: 'close', label: 'Chiudi finestra' }]
    },
    { role: 'editMenu' },
    {
      label: 'Vista',
      submenu: [
        { label: 'Indietro', accelerator: 'CmdOrCtrl+[', click: actions.back },
        { label: 'Avanti', accelerator: 'CmdOrCtrl+]', click: actions.forward },
        { label: 'Ricarica', accelerator: 'CmdOrCtrl+R', click: actions.reload },
        { type: 'separator' },
        // zoom di Gmail, per account: Chromium lo ricorda da solo nella sessione dell'account
        { label: 'Dimensioni reali', accelerator: 'CmdOrCtrl+0', click: () => actions.zoom(0) },
        { label: 'Ingrandisci', accelerator: 'CmdOrCtrl+Plus', click: () => actions.zoom(1) },
        { label: 'Ingrandisci', accelerator: 'CmdOrCtrl+=', visible: false, acceleratorWorksWhenHidden: true, click: () => actions.zoom(1) },
        { label: 'Riduci', accelerator: 'CmdOrCtrl+-', click: () => actions.zoom(-1) },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Schermo intero' },
        { type: 'separator' },
        { label: 'Invia una notifica di prova', click: actions.testNotification },
        ...(app.isPackaged
          ? []
          : ([
              { role: 'toggleDevTools' },
              { label: 'Strumenti per sviluppatori di Gmail', accelerator: 'Alt+CmdOrCtrl+J', click: actions.gmailDevTools },
              { label: 'Simula risveglio del Mac', click: () => actions.simulateWake() },
              { label: 'Simula email con codice', click: actions.testCode }
            ] as MenuItemConstructorOptions[]))
      ]
    },
    { label: 'Account', submenu: accountItems.length ? accountItems : [{ label: 'Nessun account', enabled: false }] },
    { role: 'windowMenu' }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/**
 * Menu del tasto destro su un account. È nativo (non disegnato nell'interfaccia)
 * perché un menu HTML finirebbe sotto la vista Gmail, che sta sopra la pagina.
 */
export function popupAccountMenu(win: BrowserWindow, id: string, onRemove: (id: string) => void) {
  const account = findAccount(id)
  if (!account) return
  const paused = isPaused(account, new Date())

  Menu.buildFromTemplate([
    paused ? { label: 'Riattiva', click: () => resume(id) } : { label: 'Metti in pausa', click: () => pause(id) },
    { label: 'Impostazioni…', click: () => setEditing(id) },
    { type: 'separator' },
    { label: 'Rimuovi account…', click: () => confirmRemove(win, id, onRemove) }
  ]).popup({ window: win })
}


/** Conferma prima di rimuovere un account (dal tasto destro o dalle Impostazioni). */
export async function confirmRemove(win: BrowserWindow, id: string, onRemove: (id: string) => void) {
  const account = findAccount(id)
  if (!account) return
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    message: `Rimuovere ${account.label}?`,
    detail: `${account.email} verrà scollegato da Needo e la sua sessione cancellata. L'account Google non viene toccato.`,
    buttons: ['Rimuovi', 'Annulla'],
    defaultId: 1,
    cancelId: 1
  })
  if (response === 0) onRemove(id)
}
