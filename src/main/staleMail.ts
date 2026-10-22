import type { Inbox } from './unread'

/**
 * Email notificate che non sono più da leggere: lette o eliminate altrove (telefono, browser, Gmail in Needo).
 * Il feed contiene solo le ultime ~20 non lette: se un'email manca ma il feed è completo, oppure è più recente
 * della più vecchia del feed, allora non è più non letta. Se è più vecchia e il feed è troncato non si sa: resta.
 */
export function staleMailIds(notified: Map<string, number>, inbox: Inbox): string[] {
  const present = new Set(inbox.entries.map((e) => e.id))
  const complete = inbox.count <= inbox.entries.length
  const times = inbox.entries.map((e) => e.time).filter((t) => t > 0)
  const oldest = times.length ? Math.min(...times) : Infinity
  return [...notified].filter(([id, time]) => !present.has(id) && (complete || (time > 0 && time >= oldest))).map(([id]) => id)
}
