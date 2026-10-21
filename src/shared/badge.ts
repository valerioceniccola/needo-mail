import type { Account } from './types'
import { isPaused } from './pause'

/** Numero sul Dock: somma dei non letti dei soli account attivi. */
export function badgeCount(accounts: Account[], unread: Record<string, number>, now: Date): number {
  return accounts.reduce((sum, a) => (isPaused(a, now) ? sum : sum + (unread[a.id] ?? 0)), 0)
}
