/*
  Riconosce un codice monouso (verifica, accesso, OTP) in oggetto e anteprima di un'email.
  Prudente apposta, perché il codice finisce negli appunti e l'email può essere eliminata da sola:
  1. l'email deve parlare di verifica / accesso / codice temporaneo (OTP_CONTEXT): "codice" da solo non basta,
     esistono codici fiscali, sconto, cliente, auth-info dei domini…;
  2. vicino al numero ci vuole una parola da codice (KEYWORDS) e nessuna parola da "altro tipo di codice" (NOT_OTP);
  3. il numero deve stare da solo: non attaccato a lettere o trattini (AI-2…, ABC123), non un importo, una data, un orario.
*/

const KEYWORDS = /(codice|code|otp|verifica|verification|verify|one[- ]?time|monouso|accesso|sign[- ]?in|log[- ]?in|security|sicurezza|pin|passcode|conferma|confirm|autenticazione|authentication)/gi

// l'email parla di un codice usa-e-getta (in oggetto o testo)
const OTP_CONTEXT = /(verifica|verification|verify|otp|one[- ]?time|monouso|temporane|temporary|accesso|accedere|access code|log[- ]?in|sign[- ]?in|2fa|due fattori|two[- ]factor|autenticazione|authentication|sicurezza|security code|passcode|scade|expire|valid for|valido per)/i

// altri tipi di "codice": vicino al numero, non è un codice monouso
const NOT_OTP = /(auth[- ]?info|authinfo|\bepp\b|trasferimento|transfer|fiscale|tax|sconto|discount|coupon|promo|voucher|gift|regalo|cliente|customer|ordine|order|tracking|spedizion|shipment|fattura|invoice|iban|pratica|riferimento|reference|prenotazione|booking|contratto|contract|abbonamento|subscription|\bpod\b|\bpdr\b|cap\b|postal)/i

// 4–8 cifre da sole, anche divise in due gruppi (123 456, 123-456); "G-123456" di Google incluso.
// Prima: niente lettere, cifre, trattini o simboli di valuta. Dopo: niente lettere o cifre, né decimali, percentuali, valute.
const CANDIDATE = /(?<![\p{L}\d€$£#/_-]|\d[.,:])(?:G-)?(\d{3,4}[ -]\d{3,4}|\d{4,8})(?![\p{L}\d_]|[.,:/-]\d|\s?%|\s?(?:€|eur\b|euro|usd|\$))/giu

// per il testo completo dell'email solo le parole più sicure: "conferma", "accesso", "sicurezza"… compaiono
// anche in email di ordini o avvisi con numeri qualsiasi
const STRONG_KEYWORDS = /(codice|code|otp|verifica|verification|verify|one[- ]?time|monouso|passcode)/gi

/** Distanza massima (in caratteri) tra la parola chiave e il codice. */
const NEAR = 60

export function findOneTimeCode(subject: string, summary: string, strict = false): string | null {
  const text = `${subject} \n ${summary}`
  if (!OTP_CONTEXT.test(text)) return null
  const keywords = [...text.matchAll(strict ? STRONG_KEYWORDS : KEYWORDS)].map((m) => m.index ?? 0)
  if (!keywords.length) return null

  let best: { code: string; distance: number } | null = null
  for (const match of text.matchAll(CANDIDATE)) {
    const code = match[1].replace(/[ -]/g, '')
    if (code.length < 4 || code.length > 8) continue
    // anni (1990–2099) da soli non sono codici
    if (code.length === 4 && /^(19|20)\d\d$/.test(code)) continue
    const at = match.index ?? 0
    // intorno al numero si parla di un altro tipo di codice (auth-info, cliente, ordine…): no
    if (NOT_OTP.test(text.slice(Math.max(0, at - NEAR), at + match[0].length + 20))) continue
    const distance = Math.min(...keywords.map((k) => Math.abs(k - at)))
    if (distance > NEAR) continue
    if (!best || distance < best.distance || (distance === best.distance && code.length === 6)) best = { code, distance }
  }
  return best?.code ?? null
}

/** L'email parla di un codice di verifica / accesso: allora vale la pena guardare il testo completo. */
export function mentionsCode(subject: string, summary: string): boolean {
  KEYWORDS.lastIndex = 0
  const text = `${subject} ${summary}`
  return OTP_CONTEXT.test(text) && KEYWORDS.test(text)
}

/** Testo semplice da una pagina HTML (versione stampabile di un'email). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
