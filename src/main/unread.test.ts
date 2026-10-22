import { describe, expect, it, vi } from 'vitest'

// il modulo importa electron solo per la sessione: per i test del parser basta un finto
vi.mock('./views', () => ({ partitionOf: () => ({}) }))

import { parseFeed } from './unread'

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed version="0.3" xmlns="http://purl.org/atom/ns#">
<title>Gmail - Posta in arrivo per valerio@studio.it</title>
<fullcount>2</fullcount>
<entry>
<title>Revisione preventivo &quot;sito&quot;</title>
<summary>Ciao Valerio, ti mando le ultime modifiche &amp; il PDF</summary>
<link rel="alternate" href="https://mail.google.com/mail?account_id=valerio@studio.it&amp;message_id=18a&amp;view=conv" type="text/html" />
<id>tag:gmail.google.com,2004:111</id>
<issued>2026-10-21T22:14:03Z</issued>
<author><name>Marco Bianchi</name><email>marco@example.com</email></author>
</entry>
<entry>
<title></title>
<summary></summary>
<link rel="alternate" href="https://mail.google.com/mail?message_id=18b" type="text/html" />
<id>tag:gmail.google.com,2004:222</id>
<author><name>Studio Rossi</name><email>info@rossi.it</email></author>
</entry>
</feed>`

describe('parseFeed', () => {
  it('legge conteggio ed email non lette', () => {
    const inbox = parseFeed(feed)!
    expect(inbox.count).toBe(2)
    expect(inbox.entries).toHaveLength(2)
    expect(inbox.entries[0]).toEqual({
      id: 'tag:gmail.google.com,2004:111',
      subject: 'Revisione preventivo "sito"',
      author: 'Marco Bianchi',
      summary: 'Ciao Valerio, ti mando le ultime modifiche & il PDF',
      link: 'https://mail.google.com/mail?account_id=valerio@studio.it&message_id=18a&view=conv',
      time: Date.parse('2026-10-21T22:14:03Z')
    })
    expect(inbox.entries[1].subject).toBe('(senza oggetto)')
  })

  it('null se la risposta non è il feed (es. pagina di login)', () => {
    expect(parseFeed('<html>Accedi</html>')).toBeNull()
  })
})
