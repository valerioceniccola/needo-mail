import type { Account, ActiveHours, TimeRule, Weekday } from './types'

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
export function ruleMatches(rule: TimeRule, now: Date): boolean {
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

/** Vero se l'account è fuori dai suoi orari di attività (quindi in pausa automatica) in questo momento. */
export function isScheduledPause(account: Account, now: Date): boolean {
  if (!account.activeHours?.enabled) return false
  return !account.activeHours.rules.some((rule) => ruleMatches(rule, now))
}

/** Stato finale dell'account: la scelta manuale vince sulla programmazione, finché non scade. */
export function isPaused(account: Account, now: Date): boolean {
  const o = account.override
  if (o?.state === 'paused' && (!o.until || now < new Date(o.until))) return true
  if (o?.state === 'active' && now < new Date(o.until)) return false
  return isScheduledPause(account, now)
}

/** Fine di una pausa manuale a tempo ("per 1 ora", "fino a domani mattina"), null se non c'è. */
export function manualPauseEndsAt(account: Account, now: Date): Date | null {
  const o = account.override
  if (o?.state !== 'paused' || !o.until) return null
  const until = new Date(o.until)
  return now < until ? until : null
}

/**
 * Converte le vecchie fasce di pausa negli orari di attività equivalenti (il loro contrario sulla settimana).
 * Minuto per minuto su una settimana di riferimento, poi per ogni giorno le fasce attive, raggruppando
 * i giorni con gli stessi orari ("lun–ven 09:00–19:00").
 */
export function pauseRulesToActiveHours(pauseRules: TimeRule[]): TimeRule[] {
  const monday = new Date(2024, 0, 1) // lunedì, lontano dai cambi d'ora
  const byKey = new Map<string, TimeRule>()
  const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  for (let day = 0; day < 7; day++) {
    let start: number | null = null
    for (let m = 0; m <= DAY_MINUTES; m++) {
      const t = new Date(monday)
      t.setDate(t.getDate() + day)
      t.setMinutes(m)
      const active = m < DAY_MINUTES && !pauseRules.some((rule) => ruleMatches(rule, t))
      if (active && start === null) start = m
      if (!active && start !== null) {
        const allDay = start === 0 && m === DAY_MINUTES
        // fine a mezzanotte = "00:00" (from > to: fino alla fine del giorno)
        const rule: TimeRule = { days: [], allDay, from: allDay ? '' : fmt(start), to: allDay ? '' : fmt(m) }
        const key = `${rule.allDay}|${rule.from}|${rule.to}`
        if (!byKey.has(key)) byKey.set(key, rule)
        byKey.get(key)!.days.push(day as Weekday)
        start = null
      }
    }
  }
  return [...byKey.values()]
}

/** Account salvato da una versione vecchia (fasce di pausa) → orari di attività. */
export function migrateAccount(account: Account): Account {
  if (account.activeHours) return account
  const old = account.autoPause
  const activeHours: ActiveHours =
    old?.enabled && old.rules.length ? { enabled: true, rules: pauseRulesToActiveHours(old.rules) } : { enabled: false, rules: [] }
  const { autoPause: _old, ...rest } = account
  return { ...rest, activeHours }
}

/**
 * Quando finisce la pausa automatica in corso, cioè quando si rientra negli orari di attività
 * (per la fascia "In pausa · fino a…" e per "Riattiva" fuori orario). Null se non è in pausa automatica.
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

/**
 * Quando inizierà la prossima pausa automatica, cioè quando si esce dagli orari di attività
 * (per "Adesso attiva · va in pausa stasera alle 19:00").
 * Null se è già in pausa automatica o se nella prossima settimana non ce n'è nessuna.
 */
export function nextScheduledPauseAt(account: Account, now: Date): Date | null {
  if (isScheduledPause(account, now)) return null
  const t = new Date(now)
  t.setSeconds(0, 0)
  for (let i = 0; i < 7 * DAY_MINUTES; i++) {
    t.setMinutes(t.getMinutes() + 1)
    if (isScheduledPause(account, t)) return new Date(t)
  }
  return null
}
