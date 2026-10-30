/*
  Riconosce un codice monouso (verifica, accesso, OTP) in oggetto e anteprima di un'email.
  Prudente apposta: serve una parola tipo "codice" / "code" vicino al numero, così ordini,
  fatture, date e importi non vengono scambiati per codici.
*/

const KEYWORDS = /(codice|code|otp|verifica|verification|verify|one[- ]?time|monouso|accesso|sign[- ]?in|log[- ]?in|security|sicurezza|pin|passcode|conferma|confirm|autenticazione|authentication)/gi

// 4–8 cifre, anche divise in due gruppi da spazio o trattino (123 456, 123-456); "G-123456" di Google incluso
// (dopo il codice un punto o una virgola di fine frase va bene; un punto seguito da cifre no: è un numero decimale)
const CANDIDATE = /(?<![\d€$£#/]|\d[.,:])(?:[A-Z]-)?(\d{3,4}[ -]\d{3,4}|\d{4,8})(?!\d|[.,:/]\d|\s?%|\s?(?:€|eur\b|euro|usd|\$))/gi

/** Distanza massima (in caratteri) tra la parola chiave e il codice. */
const NEAR = 60

export function findOneTimeCode(subject: string, summary: string): string | null {
  const text = `${subject} \n ${summary}`
  const keywords = [...text.matchAll(KEYWORDS)].map((m) => m.index ?? 0)
  if (!keywords.length) return null

  let best: { code: string; distance: number } | null = null
  for (const match of text.matchAll(CANDIDATE)) {
    const code = match[1].replace(/[ -]/g, '')
    if (code.length < 4 || code.length > 8) continue
    // anni (1990–2099) da soli non sono codici
    if (code.length === 4 && /^(19|20)\d\d$/.test(code)) continue
    const at = match.index ?? 0
    const distance = Math.min(...keywords.map((k) => Math.abs(k - at)))
    if (distance > NEAR) continue
    if (!best || distance < best.distance || (distance === best.distance && code.length === 6)) best = { code, distance }
  }
  return best?.code ?? null
}
