import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, Notification } from 'electron'
import { badgeCount } from '@shared/badge'
import { isPaused } from '@shared/pause'
import { findAccount, getState, select, setSetting } from './state'
import type { Inbox, MailEntry } from './unread'
import { staleMailIds } from './staleMail'

/*
  Notifiche e badge. Regola: un account in pausa non notifica e non conta nel badge.
  Le notifiche nascono dal feed della posta (email nuove rispetto all'ultimo controllo),
  non dalle notifiche desktop di Gmail, così funzionano senza toccare le impostazioni di Gmail.
  Le email arrivate durante una pausa non vengono notificate nemmeno dopo: restano solo nei non letti.
*/

type Handlers = {
  showWindow: () => void
  /** porta la vista Gmail dell'account sulla Posta in arrivo, senza ricaricare la pagina */
  openInbox: (accountId: string) => void
}

let handlers: Handlers
// email già viste per account: la prima lettura dopo l'avvio non notifica nulla
const seen = new Map<string, Set<string>>()

/*
  Notifiche ancora a schermo (o nel Centro Notifiche), per account. Se un'email viene letta o eliminata
  altrove (telefono, browser) la sua notifica si chiude da sola al controllo successivo del feed.
  Una notifica di riepilogo ("5 nuove email") si chiude quando nessuna delle sue email è più da leggere.
  Tenere qui le notifiche serve anche a non farle raccogliere dal garbage collector.
*/
type Shown = { notification: Notification; mails: Map<string, number> }
const shown = new Map<string, Set<Shown>>()

function track(accountId: string, notification: Notification, mails: MailEntry[]) {
  const item: Shown = { notification, mails: new Map(mails.map((m) => [m.id, m.time])) }
  if (!shown.has(accountId)) shown.set(accountId, new Set())
  shown.get(accountId)!.add(item)
  // chiusa, cliccata o usata dall'utente: non c'è più niente da togliere
  const forget = () => shown.get(accountId)?.delete(item)
  notification.on('close', forget)
  notification.on('click', forget)
  notification.on('action', forget)
}

function closeStale(accountId: string, inbox: Inbox) {
  for (const item of shown.get(accountId) ?? []) {
    for (const id of staleMailIds(item.mails, inbox)) item.mails.delete(id)
    if (item.mails.size === 0) {
      shown.get(accountId)!.delete(item)
      item.notification.close()
    }
  }
}

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

// clic sulla notifica: si apre Needo sull'account, nella Posta in arrivo
function open(accountId: string) {
  select(accountId)
  handlers.showWindow()
  handlers.openInbox(accountId)
}

function notify(accountId: string, title: string, body: string): Notification {
  const n = new Notification({ title, body, sound: notificationSound() })
  n.on('click', () => open(accountId))
  n.show()
  return n
}

/** Notifica di una singola email: mittente, oggetto; il clic apre la Posta in arrivo dell'account. */
function notifyMail(accountId: string, label: string, mail: MailEntry) {
  track(accountId, notify(accountId, `${label} · ${mail.author || 'Nuova email'}`, mail.subject), [mail])
}

/**
 * Confronta le email non lette con quelle già viste e notifica le nuove (solo account attivi);
 * toglie le notifiche delle email che nel frattempo sono state lette o eliminate.
 */
export function handleInbox(accountId: string, inbox: Inbox) {
  const { entries } = inbox
  closeStale(accountId, inbox)
  const known = seen.get(accountId)
  seen.set(accountId, new Set([...(known ?? []), ...entries.map((e) => e.id)]))
  if (!known) return

  const fresh = entries.filter((e) => !known.has(e.id))
  const account = findAccount(accountId)
  if (!getState().settings.notifications) return
  if (!fresh.length || !account || isPaused(account, new Date())) return

  // tante email insieme (es. dopo il risveglio del Mac): una notifica sola
  if (fresh.length > 3) {
    track(accountId, notify(accountId, account.label, `${fresh.length} nuove email`), fresh)
    return
  }
  for (const mail of fresh) notifyMail(accountId, account.label, mail)
}

export function forgetAccount(accountId: string) {
  seen.delete(accountId)
  for (const item of shown.get(accountId) ?? []) item.notification.close()
  shown.delete(accountId)
}

/**
 * macOS chiede il permesso per le notifiche solo alla prima notifica mostrata, che altrimenti sarebbe
 * la prima email nuova (anche minuti dopo l'installazione). Con il primo account mandiamo subito una
 * notifica di benvenuto, così la richiesta compare mentre si sta configurando l'app. Una volta sola.
 */
export function introduceNotifications() {
  const { settings, accounts } = getState()
  if (settings.notificationsIntroduced || !settings.notifications || accounts.length === 0) return
  setSetting('notificationsIntroduced', true)
  new Notification({ title: 'Needo', body: 'Ti avviserò qui quando arriva una email nuova.', sound: notificationSound() }).show()
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
