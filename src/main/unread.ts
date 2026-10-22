import { partitionOf } from './views'

/*
  Posta in arrivo dal feed Atom di Gmail, letto con i cookie della sessione dell'account.
  Dà sia il numero dei non letti (<fullcount>) sia le ultime email non lette (<entry>),
  che usiamo per le notifiche: così non dipendiamo dalle notifiche desktop di Gmail.
*/

const FEED_URL = 'https://mail.google.com/mail/u/0/feed/atom'

export type MailEntry = {
  id: string
  subject: string
  author: string
  summary: string
  link: string
  /** arrivo dell'email (ms), 0 se il feed non lo dice */
  time: number
}

export type Inbox = { count: number; entries: MailEntry[] }

/** Non letti e ultime email non lette, oppure null se il feed non risponde (es. login non ancora fatto). */
export async function fetchInbox(id: string): Promise<Inbox | null> {
  try {
    const res = await partitionOf(id).fetch(FEED_URL)
    if (!res.ok) return null
    return parseFeed(await res.text())
  } catch {
    return null
  }
}

export function parseFeed(xml: string): Inbox | null {
  const count = xml.match(/<fullcount>(\d+)<\/fullcount>/)
  if (!count) return null
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: tag(e, 'id'),
    subject: tag(e, 'title') || '(senza oggetto)',
    author: tag(e.match(/<author>([\s\S]*?)<\/author>/)?.[1] ?? '', 'name'),
    summary: tag(e, 'summary'),
    link: decode(e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? ''),
    time: Date.parse(tag(e, 'issued') || tag(e, 'modified')) || 0
  }))
  return { count: Number(count[1]), entries: entries.filter((e) => e.id) }
}

function tag(xml: string, name: string): string {
  return decode(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? '')
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** Ripiego dal titolo della pagina, quando contiene il conteggio. */
export function unreadFromTitle(title: string): number | null {
  const match = title.match(/^[^-]*\((\d+)\)/)
  return match ? Number(match[1]) : null
}

/** Email dell'account dal titolo di Gmail ("Posta in arrivo - nome@gmail.com - Gmail"). */
export function emailFromTitle(title: string): string | null {
  const match = title.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/)
  return match ? match[0] : null
}
