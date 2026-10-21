import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, Notification } from 'electron'
import { badgeCount } from '@shared/badge'
import { isPaused } from '@shared/pause'
import { findAccount, getState, select } from './state'
import type { MailEntry } from './unread'

/*
  Notifiche e badge. Regola: un account in pausa non notifica e non conta nel badge.
  Le notifiche nascono dal feed della posta (email nuove rispetto all'ultimo controllo),
  non dalle notifiche desktop di Gmail, così funzionano senza toccare le impostazioni di Gmail.
  Le email arrivate durante una pausa non vengono notificate nemmeno dopo: restano solo nei non letti.
*/

type Handlers = {
  showWindow: () => void
  openLink: (accountId: string, url: string) => void
  deleteMail: (accountId: string, url: string) => Promise<boolean>
}

let handlers: Handlers
// email già viste per account: la prima lettura dopo l'avvio non notifica nulla
const seen = new Map<string, Set<string>>()

export function initNotifier(h: Handlers) {
  handlers = h
}

/*
  Suono delle notifiche: quello di Mail ("Nuova email"), che sta dentro Mail.app su ogni Mac.
  macOS suona per le notifiche solo i file nell'app o nelle cartelle Sounds, quindi lo copiamo una volta
  in ~/Library/Sounds e lo usiamo per nome. Così è macOS a suonarlo: rispetta Full immersion / Non disturbare
  e l'interruttore "Riproduci suono" nelle impostazioni delle notifiche. Se Mail non c'è, il suono "Glass".
*/
const MAIL_SOUND_FILES = ['/System/Applications/Mail.app/Contents/Resources/New Mail.aiff', '/Applications/Mail.app/Contents/Resources/New Mail.aiff']
const SOUND_NAME = 'Needo Nuova email'
let sound: string | undefined

function notificationSound(): string {
  if (sound) return sound
  sound = 'Glass'
  try {
    const dir = join(homedir(), 'Library', 'Sounds')
    const target = join(dir, `${SOUND_NAME}.aiff`)
    if (!existsSync(target)) {
      const source = MAIL_SOUND_FILES.find((f) => existsSync(f))
      if (source) {
        mkdirSync(dir, { recursive: true })
        copyFileSync(source, target)
      }
    }
    if (existsSync(target)) sound = SOUND_NAME
  } catch {
    // resta Glass
  }
  return sound
}

function open(accountId: string, link?: string) {
  select(accountId)
  handlers.showWindow()
  if (link) handlers.openLink(accountId, link)
}

function notify(accountId: string, title: string, body: string, link?: string) {
  const n = new Notification({ title, body, sound: notificationSound() })
  n.on('click', () => open(accountId, link))
  n.show()
}

/**
 * Notifica di una singola email con i pulsanti Elimina e Apri.
 * macOS mostra i pulsanti solo se l'app è firmata e ha lo stile avvisi "Permanenti" (NSUserNotificationAlertStyle
 * in electron-builder.yml): in sviluppo resta il clic sulla notifica, che apre l'email.
 */
function notifyMail(accountId: string, label: string, mail: MailEntry) {
  const n = new Notification({
    title: `${label} · ${mail.author || 'Nuova email'}`,
    body: mail.subject,
    actions: mail.link ? [{ type: 'button', text: 'Elimina' }, { type: 'button', text: 'Apri' }] : [],
    closeButtonText: 'Chiudi',
    sound: notificationSound()
  })
  n.on('click', () => open(accountId, mail.link || undefined))
  n.on('action', async (event) => {
    if (event.actionIndex === 1) return open(accountId, mail.link)
    const deleted = await handlers.deleteMail(accountId, mail.link)
    if (!deleted) notify(accountId, `${label} · non eliminata`, `Non sono riuscito a eliminare "${mail.subject}". Aprila e riprova da Gmail.`, mail.link)
  })
  n.show()
}

/** Confronta le email non lette con quelle già viste e notifica le nuove (solo account attivi). */
export function handleInbox(accountId: string, entries: MailEntry[]) {
  const known = seen.get(accountId)
  seen.set(accountId, new Set([...(known ?? []), ...entries.map((e) => e.id)]))
  if (!known) return

  const fresh = entries.filter((e) => !known.has(e.id))
  const account = findAccount(accountId)
  if (!getState().settings.notifications) return
  if (!fresh.length || !account || isPaused(account, new Date())) return

  // tante email insieme (es. dopo il risveglio del Mac): una notifica sola
  if (fresh.length > 3) {
    notify(accountId, account.label, `${fresh.length} nuove email`)
    return
  }
  for (const mail of fresh) notifyMail(accountId, account.label, mail)
}

export function forgetAccount(accountId: string) {
  seen.delete(accountId)
}

/** Notifica di prova dal menu, per controllare i permessi di macOS. */
export function testNotification() {
  new Notification({ title: 'Needo', body: 'Le notifiche funzionano.', sound: notificationSound() }).show()
}

/** Da chiamare a ogni cambiamento di stato: aggiorna il badge sul Dock. */
export function refresh() {
  const { accounts, unread, settings } = getState()
  const count = badgeCount(accounts, unread, new Date())
  app.dock?.setBadge(settings.badge && count > 0 ? String(count) : '')
}
