import { app, dialog, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { isPaused } from '@shared/pause'
import { findAccount, getState, pause, resume, selectByIndex } from './state'

type Actions = {
  addAccount: () => void
  back: () => void
  forward: () => void
  reload: () => void
  testNotification: () => void
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
    { role: 'appMenu' },
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
        { role: 'togglefullscreen', label: 'Schermo intero' },
        { type: 'separator' },
        { label: 'Invia una notifica di prova', click: actions.testNotification },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' } as MenuItemConstructorOptions])
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
    { label: 'Impostazioni…', enabled: false, toolTip: 'In arrivo: etichetta, colore e pausa automatica' },
    { type: 'separator' },
    {
      label: 'Rimuovi account…',
      click: async () => {
        const { response } = await dialog.showMessageBox(win, {
          type: 'warning',
          message: `Rimuovere ${account.label}?`,
          detail: `${account.email} verrà scollegato da Gmail Hub e la sua sessione cancellata. L'account Google non viene toccato.`,
          buttons: ['Rimuovi', 'Annulla'],
          defaultId: 1,
          cancelId: 1
        })
        if (response === 0) onRemove(id)
      }
    }
  ]).popup({ window: win })
}

