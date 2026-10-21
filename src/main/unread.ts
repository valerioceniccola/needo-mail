import { partitionOf } from './views'

/*
  Non letti della Posta in arrivo.
  Il titolo di Gmail ("Posta in arrivo (12) - …") perde il numero quando apri un'email,
  quindi leggiamo il feed Atom di Gmail con i cookie della sessione dell'account: <fullcount>12</fullcount>.
*/

const FEED_URL = 'https://mail.google.com/mail/u/0/feed/atom'

/** Numero di non letti, oppure null se il feed non risponde (es. login non ancora fatto). */
export async function fetchUnread(id: string): Promise<number | null> {
  try {
    const res = await partitionOf(id).fetch(FEED_URL)
    if (!res.ok) return null
    const match = (await res.text()).match(/<fullcount>(\d+)<\/fullcount>/)
    return match ? Number(match[1]) : null
  } catch {
    return null
  }
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
