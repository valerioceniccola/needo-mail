import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app, clipboard, Notification } from 'electron'
import { badgeCount } from '@shared/badge'
import { isPaused } from '@shared/pause'
import { findAccount, getState, select, setSetting } from './state'
import type { Inbox, MailEntry } from './unread'
import { staleMailIds } from './staleMail'
import { findOneTimeCode } from '@shared/otp'

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
  /** apre una email precisa nella vista dell'account (id esadecimale del feed), sennò la Posta in arrivo */
  openMail: (accountId: string, messageId: string) => void
  /** sposta nel Cestino una email dalla casella dell'account (vedi deleteMailInView in views.ts) */
  deleteMail: (accountId: string, messageId: string, byUser?: boolean) => Promise<string>
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

// notifiche non legate a un'email: tenute qui solo perché il garbage collector non le faccia sparire
const kept = new Set<Notification>()
function keep(n: Notification) {
  kept.add(n)
  const forget = () => kept.delete(n)
  n.on('close', forget)
  n.on('click', forget)
}
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

/** L'id dell'email nel link del feed (…&message_id=18a3f…&…), esadecimale. */
export function messageIdOf(link: string): string | null {
  return /[?&]message_id=([0-9a-f]+)/i.exec(link)?.[1] ?? null
}

// clic sulla notifica: si apre Needo sull'account, sull'email della notifica o nella Posta in arrivo
function open(accountId: string, link?: string) {
  select(accountId)
  handlers.showWindow()
  const messageId = link ? messageIdOf(link) : null
  if (messageId) handlers.openMail(accountId, messageId)
  else handlers.openInbox(accountId)
}

function notify(accountId: string, title: string, body: string, link?: string): Notification {
  const n = new Notification({ title, body, sound: notificationSound() })
  n.on('click', () => open(accountId, link))
  n.show()
  return n
}

/**
 * Notifica di una singola email: mittente, oggetto; il clic apre proprio quell'email.
 * Pulsante Elimina: l'email va nel Cestino dalla casella già aperta (deleteMailInView), senza aprire Needo.
 * macOS mostra i pulsanti con lo stile avvisi "Permanenti"; con "Temporanei" compaiono passandoci sopra col mouse.
 */
function notifyMail(accountId: string, label: string, mail: MailEntry) {
  const messageId = messageIdOf(mail.link)
  const n = new Notification({
    title: `${label} · ${mail.author || 'Nuova email'}`,
    body: mail.subject,
    actions: messageId ? [{ type: 'button', text: 'Elimina' }] : [],
    closeButtonText: 'Chiudi',
    sound: notificationSound()
  })
  n.on('click', () => open(accountId, mail.link))
  n.on('action', async () => {
    if (!messageId) return
    const result = await handlers.deleteMail(accountId, messageId, true)
    if (result !== 'ok') {
      new Notification({ title: `${label} · email non eliminata`, body: `"${mail.subject}": ${DELETE_ERRORS[result] ?? 'eliminala da Gmail'}.`, sound: notificationSound() }).show()
    }
  })
  n.show()
  track(accountId, n, [mail])
}

/**
 * Email con un codice monouso (verifica, accesso): il codice va negli appunti e la notifica lo dice.
 * Vale anche per gli account in pausa, perché il codice l'hai appena chiesto tu; solo email arrivate da
 * poco (dopo un risveglio del Mac un codice vecchio non serve più e sporcherebbe gli appunti).
 * Restituisce true se l'email è stata gestita così (niente notifica normale).
 */
function copyCode(accountId: string, label: string, mail: MailEntry): boolean {
  const { settings } = getState()
  if (!settings.copyCodes) return false
  if (mail.time && Date.now() - mail.time > 10 * 60_000) return false
  const code = findOneTimeCode(mail.subject, mail.summary)
  if (!code) return false
  // in Electron gli appunti sono asincroni: l'eliminazione aspetta che la scrittura sia finita
  const written = clipboard.writeText(code).catch(() => {})
  if (settings.notifications) {
    // non legata all'email (niente track): con l'eliminazione automatica, o se la leggi altrove, l'email sparisce
    // e la notifica si chiuderebbe da sola dopo pochi secondi; deve invece restare come le altre
    const n = notify(accountId, `Codice copiato: ${code}`, `${label} · ${mail.author || mail.subject} — incollalo con ⌘V`, mail.link)
    keep(n)
  }
  if (settings.deleteCodeMails) written.then(() => deleteCodeMail(accountId, label, mail, code))
  return true
}

const DELETE_ERRORS: Record<string, string> = {
  busy: 'stai guardando quella casella, non ti sposto',
  'not-ready': 'la casella non era ancora caricata',
  'not-found': "non ho trovato l'email",
  'no-button': 'non ho trovato il cestino di Gmail',
  'not-deleted': 'Gmail non ha confermato'
}

/** Email del codice nel Cestino, solo se negli appunti c'è davvero il codice. Avvisa solo se non riesce. */
async function deleteCodeMail(accountId: string, label: string, mail: MailEntry, code: string) {
  const messageId = messageIdOf(mail.link)
  if (!messageId || (await clipboard.readText()) !== code) return
  // un attimo di respiro: Gmail fa in tempo a mostrare l'email arrivata nella casella
  await new Promise((r) => setTimeout(r, 3000))
  let result = await handlers.deleteMail(accountId, messageId)
  // casella non ancora pronta o la stai guardando: si riprova una volta poco dopo
  if (result === 'not-ready' || result === 'busy') {
    await new Promise((r) => setTimeout(r, 30_000))
    result = await handlers.deleteMail(accountId, messageId)
  }
  if (result !== 'ok') {
    new Notification({ title: `${label} · email del codice non eliminata`, body: DELETE_ERRORS[result] ?? 'Eliminala da Gmail.', sound: notificationSound() }).show()
  }
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

  let fresh = entries.filter((e) => !known.has(e.id))
  const account = findAccount(accountId)
  if (account) fresh = fresh.filter((mail) => !copyCode(accountId, account.label, mail))
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

/** Solo in sviluppo: finta email con un codice, per provare la copia senza farsene mandare una. */
export function testCode() {
  const account = getState().accounts[0]
  if (!account) return
  const mail = { id: `test-${Date.now()}`, subject: 'Il tuo codice di verifica', summary: 'Usa il codice 482913 per accedere. Scade tra 10 minuti.', author: 'Servizio di prova', link: '', time: Date.now() }
  if (!copyCode(account.id, account.label, mail)) new Notification({ title: 'Needo', body: 'Copia dei codici disattivata nelle Impostazioni.' }).show()
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
