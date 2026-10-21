import type { Account, PauseRule, Weekday } from './types'

const DAY_MINUTES = 24 * 60

/** Converte "HH:mm" in minuti dalla mezzanotte. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Giorno della settimana con lunedì = 0 (Date.getDay() parte dalla domenica). */
function weekday(date: Date): Weekday {
  return ((date.getDay() + 6) % 7) as Weekday
}

/** Vero se `now` cade dentro la fascia. */
export function ruleMatches(rule: PauseRule, now: Date): boolean {
  const day = weekday(now)
  if (rule.allDay) return rule.days.includes(day)

  const minute = now.getHours() * 60 + now.getMinutes()
  const from = toMinutes(rule.from)
  const to = toMinutes(rule.to)

  // stessa ora di inizio e fine: la trattiamo come tutto il giorno
  if (from === to) return rule.days.includes(day)

  if (from < to) return rule.days.includes(day) && minute >= from && minute < to

  // fascia che scavalca la mezzanotte (es. 19:00–09:00): la parte serale appartiene
  // al giorno scelto, quella del mattino al giorno dopo
  const yesterday = ((day + 6) % 7) as Weekday
  return (rule.days.includes(day) && minute >= from) || (rule.days.includes(yesterday) && minute < to)
}

/** Vero se la pausa automatica dell'account è in corso in questo momento. */
export function isScheduledPause(account: Account, now: Date): boolean {
  if (!account.autoPause.enabled) return false
  return account.autoPause.rules.some((rule) => ruleMatches(rule, now))
}

/** Stato finale dell'account: la scelta manuale vince sulla programmazione. */
export function isPaused(account: Account, now: Date): boolean {
  const o = account.override
  if (o?.state === 'paused') return true
  if (o?.state === 'active' && now < new Date(o.until)) return false
  return isScheduledPause(account, now)
}

/**
 * Quando finisce la pausa automatica in corso (per la fascia "In pausa · fino a…"
 * e per "Riattiva" durante una pausa automatica). Null se non è in pausa automatica.
 * Avanza minuto per minuto fino a una settimana: semplice e abbastanza veloce.
 */
export function scheduledPauseEndsAt(account: Account, now: Date): Date | null {
  if (!isScheduledPause(account, now)) return null
  const t = new Date(now)
  t.setSeconds(0, 0)
  for (let i = 0; i < 7 * DAY_MINUTES; i++) {
    t.setMinutes(t.getMinutes() + 1)
    if (!isScheduledPause(account, t)) return new Date(t)
  }
  return null // in pausa tutta la settimana
}
