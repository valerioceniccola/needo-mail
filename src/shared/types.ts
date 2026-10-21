/** Giorno della settimana: 0 = lunedì … 6 = domenica. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Fascia di pausa automatica. Orari "HH:mm"; se from > to la fascia scavalca la mezzanotte. */
export type PauseRule = {
  days: Weekday[]
  allDay: boolean
  from: string
  to: string
}

/**
 * Scelta manuale che vince sulla programmazione.
 * - paused: in pausa finché non lo riattivi
 * - active: riattivato a mano durante una pausa automatica, fino a `until` (ISO)
 */
export type Override = { state: 'paused' } | { state: 'active'; until: string } | null

export type Account = {
  id: string
  label: string
  email: string
  color: string
  override: Override
  autoPause: { enabled: boolean; rules: PauseRule[] }
}

/** Palette fissa dei colori degli account (dalla tela di design). */
export const ACCOUNT_COLORS = ['#5E9CF2', '#F2994A', '#4CB782', '#B37FEB', '#E86C8E', '#4DB6C4', '#8A8B93'] as const
