import { app, Notification } from 'electron'
import { badgeCount } from '@shared/badge'
import { isPaused } from '@shared/pause'
import { findAccount, getState, select } from './state'

/*
  Notifiche e badge. Regola: un account in pausa non notifica e non conta nel badge.
  Quando un account torna attivo arriva un solo riepilogo invece delle notifiche arretrate.
*/

let showWindow: () => void = () => {}
// stato di pausa all'ultimo controllo, per accorgersi di quando un account torna attivo
let lastPaused = new Map<string, boolean>()

export function initNotifier(onShowWindow: () => void) {
  showWindow = onShowWindow
  lastPaused = pausedMap()
}

function pausedMap() {
  const now = new Date()
  return new Map(getState().accounts.map((a) => [a.id, isPaused(a, now)]))
}

function notify(accountId: string, title: string, body: string) {
  const n = new Notification({ title, body })
  n.on('click', () => {
    select(accountId)
    showWindow()
  })
  n.show()
}

/** Notifica arrivata da Gmail: si mostra solo se l'account è attivo. */
export function notifyFromGmail(accountId: string, title: string, body: string) {
  const account = findAccount(accountId)
  if (!account || isPaused(account, new Date())) return
  notify(accountId, `${account.label} · ${title}`, body)
}

/** Da chiamare a ogni cambiamento di stato: aggiorna il badge e manda i riepiloghi di fine pausa. */
export function refresh() {
  const { accounts, unread } = getState()
  const now = new Date()

  const count = badgeCount(accounts, unread, now)
  app.dock?.setBadge(count > 0 ? String(count) : '')

  const current = pausedMap()
  for (const account of accounts) {
    const wasPaused = lastPaused.get(account.id)
    const n = unread[account.id] ?? 0
    if (wasPaused && !current.get(account.id) && n > 0) {
      notify(account.id, `${account.label} è di nuovo attivo`, n === 1 ? '1 non letto arrivato durante la pausa' : `${n} non letti arrivati durante la pausa`)
    }
  }
  lastPaused = current
}
