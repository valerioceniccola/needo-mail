import type { Account } from './types'
import { isPaused } from './pause'

/** Numero sul Dock: somma dei non letti degli account attivi che contano nel badge. */
export function badgeCount(accounts: Account[], unread: Record<string, number>, now: Date): number {
  return accounts.reduce((sum, a) => (a.badge === false || isPaused(a, now) ? sum : sum + (unread[a.id] ?? 0)), 0)
}
