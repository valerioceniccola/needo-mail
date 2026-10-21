import { app, Notification } from 'electron'
import { badgeCount } from '@shared/badge'
import { isPaused } from '@shared/pause'
import { findAccount, getState, select } from './state'
import type { MailEntry } from './unread'

/*
  Notifiche e badge. Regola: un account in pausa non notifica e non conta nel badge.
  Le notifiche nascono dal feed della posta (email nuove rispetto all'ultimo controllo),
  non dalle notifiche desktop di Gmail, così funzionano senza toccare le impostazioni di Gmail.
  Quando un account torna attivo arriva un solo riepilogo invece delle notifiche arretrate.
*/

type Handlers = {
  showWindow: () => void
  openLink: (accountId: string, url: string) => void
  deleteMail: (accountId: string, url: string) => Promise<boolean>
}

let handlers: Handlers
// stato di pausa all'ultimo controllo, per accorgersi di quando un account torna attivo
let lastPaused = new Map<string, boolean>()
// email già viste per account: la prima lettura dopo l'avvio non notifica nulla
const seen = new Map<string, Set<string>>()

export function initNotifier(h: Handlers) {
  handlers = h
  lastPaused = pausedMap()
}

function pausedMap() {
  const now = new Date()
  return new Map(getState().accounts.map((a) => [a.id, isPaused(a, now)]))
}

function open(accountId: string, link?: string) {
  select(accountId)
  handlers.showWindow()
  if (link) handlers.openLink(accountId, link)
}

function notify(accountId: string, title: string, body: string, link?: string) {
  const n = new Notification({ title, body })
  n.on('click', () => open(accountId, link))
  n.show()
}

/**
 * Notifica di una singola email con i pulsanti Elimina e Apri.
 * macOS mostra i pulsanti solo se l'app è firmata e ha lo stile "Avvisi" (NSUserNotificationAlertStyle
 * in electron-builder.yml): in sviluppo resta il clic sulla notifica, che apre l'email.
 */
function notifyMail(accountId: string, label: string, mail: MailEntry) {
  const n = new Notification({
    title: `${label} · ${mail.author || 'Nuova email'}`,
    body: mail.subject,
    actions: mail.link ? [{ type: 'button', text: 'Elimina' }, { type: 'button', text: 'Apri' }] : [],
    closeButtonText: 'Chiudi'
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
  new Notification({ title: 'Gmail Hub', body: 'Le notifiche funzionano.' }).show()
}

/** Da chiamare a ogni cambiamento di stato: aggiorna il badge e manda i riepiloghi di fine pausa. */
export function refresh() {
  const { accounts, unread } = getState()
  const now = new Date()

  const count = badgeCount(accounts, unread, now)
  app.dock?.setBadge(count > 0 ? String(count) : '')

  const current = pausedMap()
  for (const account of accounts) {
    const n = unread[account.id] ?? 0
    if (lastPaused.get(account.id) && !current.get(account.id) && n > 0) {
      notify(account.id, `${account.label} è di nuovo attivo`, n === 1 ? '1 non letto arrivato durante la pausa' : `${n} non letti arrivati durante la pausa`)
    }
  }
  lastPaused = current
}
