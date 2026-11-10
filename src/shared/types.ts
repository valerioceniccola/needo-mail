/** Giorno della settimana: 0 = lunedì … 6 = domenica. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * Fascia oraria su alcuni giorni. Orari "HH:mm"; se from > to la fascia scavalca la mezzanotte
 * ("00:00" come fine = fino a mezzanotte). Usata per gli orari di attività.
 */
export type TimeRule = {
  days: Weekday[]
  allDay: boolean
  from: string
  to: string
}

/** Nome vecchio, per il codice che parla ancora di "fasce". */
export type PauseRule = TimeRule

/**
 * Scelta manuale che vince sulla programmazione.
 * - paused: in pausa fino a `until` (ISO), oppure finché non lo riattivi se `until` manca
 * - active: riattivato a mano fuori orario, fino al prossimo cambio d'orario (`until`, ISO)
 */
export type Override = { state: 'paused'; until?: string } | { state: 'active'; until: string } | null

/**
 * Orari di attività: se `enabled`, l'account è attivo solo dentro le fasce e in pausa fuori.
 * (Prima c'era `autoPause`, fasce di pausa: alla lettura vengono convertite, vedi `migrateAccount`.)
 */
export type ActiveHours = { enabled: boolean; rules: TimeRule[] }

export type Account = {
  id: string
  label: string
  email: string
  color: string
  /** foto del profilo Google come data URL, letta dalla pagina di Gmail */
  avatar?: string
  /** foto caricata a mano dalle Impostazioni dell'account: quella di Google non la sostituisce più */
  avatarCustom?: boolean
  /** conta nel badge del Dock (assente = sì, per gli account salvati prima di questa opzione) */
  badge?: boolean
  override: Override
  activeHours: ActiveHours
  /** solo negli account salvati da versioni vecchie, convertito all'avvio */
  autoPause?: { enabled: boolean; rules: TimeRule[] }
}

/** Impostazioni generali dell'app (icona dell'ingranaggio). */
export type AppSettings = {
  /** numero dei non letti sull'icona del Dock (solo account attivi) */
  badge: boolean
  /** notifiche delle email nuove */
  notifications: boolean
  /** apri Needo all'accensione del Mac */
  launchAtLogin: boolean
  /** fascia gialla sopra Gmail quando macOS ha disattivato le notifiche ("Non chiedermelo più" la spegne) */
  notificationsWarning: boolean
  /** prima notifica di benvenuto già mostrata: è quella che fa chiedere a macOS il permesso */
  notificationsIntroduced: boolean
  /** codici monouso (verifica, accesso) copiati da soli negli appunti all'arrivo dell'email */
  copyCodes: boolean
  /** dopo aver copiato il codice, l'email va nel Cestino (spento di default) */
  deleteCodeMails: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  badge: true,
  notifications: true,
  launchAtLogin: false,
  notificationsWarning: true,
  notificationsIntroduced: false,
  copyCodes: true,
  deleteCodeMails: false
}

/** Palette fissa dei colori degli account (dalla tela di design). */
export const ACCOUNT_COLORS = ['#5E9CF2', '#F2994A', '#4CB782', '#B37FEB', '#E86C8E', '#4DB6C4', '#8A8B93'] as const
