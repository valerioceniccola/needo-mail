import { readFileSync } from 'node:fs'
import { Menu, nativeImage, Tray } from 'electron'
import { badgeCount } from '@shared/badge'
import { isPaused } from '@shared/pause'
import { getState, pause, resume, select } from './state'
import icon1x from '../../resources/trayTemplate.png?asset'
import icon2x from '../../resources/trayTemplate@2x.png?asset'

/*
  Icona nella barra dei menu (Impostazioni › Icona nella barra dei menu).
  Accanto all'icona il totale dei non letti degli account attivi; cliccando, un account per riga
  con la spunta "attivo": togliendola l'account va in pausa.
*/

let tray: Tray | null = null
let showWindow: () => void = () => {}

function trayImage() {
  // immagine "template": macOS la colora da solo in chiaro o scuro a seconda della barra
  const image = nativeImage.createEmpty()
  image.addRepresentation({ scaleFactor: 1, buffer: readFileSync(icon1x) })
  image.addRepresentation({ scaleFactor: 2, buffer: readFileSync(icon2x) })
  image.setTemplateImage(true)
  return image
}

export function initTray(onShowWindow: () => void) {
  showWindow = onShowWindow
}

/** Crea, aggiorna o toglie l'icona secondo l'impostazione; da chiamare a ogni cambiamento di stato. */
export function updateTray() {
  const { accounts, unread, settings } = getState()

  if (!settings.menuBar) {
    tray?.destroy()
    tray = null
    return
  }
  if (!tray) {
    tray = new Tray(trayImage())
    tray.setToolTip('Gmail Hub')
  }

  const now = new Date()
  const count = badgeCount(accounts, unread, now)
  tray.setTitle(count > 0 ? String(count) : '', { fontType: 'monospacedDigit' })

  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...accounts.map((a) => {
        const paused = isPaused(a, now)
        const n = unread[a.id] ?? 0
        return {
          label: `${a.label}${!paused && n ? `  ·  ${n}` : ''}`,
          type: 'checkbox' as const,
          checked: !paused,
          toolTip: paused ? 'In pausa: spunta per riattivarlo' : 'Attivo: togli la spunta per metterlo in pausa',
          click: () => (paused ? resume(a.id) : pause(a.id))
        }
      }),
      ...(accounts.length ? [{ type: 'separator' as const }] : []),
      {
        label: 'Apri Gmail Hub',
        click: () => {
          const selected = getState().selectedId
          if (selected) select(selected)
          showWindow()
        }
      },
      { label: 'Esci', role: 'quit' as const }
    ])
  )
}
