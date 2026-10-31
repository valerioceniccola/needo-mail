import { htmlToText } from '@shared/otp'
import { partitionOf, viewContents } from './views'

/*
  Testo completo di una email, per i codici monouso che non stanno nell'anteprima del feed
  (anteprima corta, o riempita da intestazioni come quelle dei servizi di inoltro/alias).
  Si usa la "versione stampabile" di Gmail, scaricata con i cookie dell'account; serve il codice
  interno dell'account (ik), che si legge dalla pagina di Gmail già aperta. Se qualcosa manca: null.
*/
export async function fetchMailText(accountId: string, messageId: string): Promise<string | null> {
  if (!/^[0-9a-f]+$/i.test(messageId)) return null
  const wc = viewContents(accountId)
  if (!wc || wc.isDestroyed() || !wc.getURL().startsWith('https://mail.google.com/')) return null
  try {
    const ik: unknown = await wc.executeJavaScript(`(window.GLOBALS && window.GLOBALS[9]) || null`, true)
    if (typeof ik !== 'string' || !/^[0-9a-f]+$/i.test(ik)) return null
    const url = `https://mail.google.com/mail/u/0/?ik=${ik}&view=pt&search=all&th=${messageId}`
    const res = await partitionOf(accountId).fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    return htmlToText(await res.text())
  } catch {
    return null
  }
}
