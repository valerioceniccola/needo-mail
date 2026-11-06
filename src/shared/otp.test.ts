import { describe, expect, it } from 'vitest'
import { findOneTimeCode } from './otp'

describe('findOneTimeCode', () => {
  it('trova i codici più comuni', () => {
    expect(findOneTimeCode('Il tuo codice di verifica', 'Usa il codice 482913 per accedere.')).toBe('482913')
    expect(findOneTimeCode('Your verification code', 'Your code is 739 214. It expires in 10 minutes.')).toBe('739214')
    expect(findOneTimeCode('G-582014 is your Google verification code', '')).toBe('582014')
    expect(findOneTimeCode('Codice di accesso: 1234', '')).toBe('1234')
    expect(findOneTimeCode('Sign in to Slack', 'Your confirmation code is 123-456')).toBe('123456')
  })

  it('ignora gli altri tipi di codice (auth-info dei domini, fiscale, cliente, sconto)', () => {
    const registerIt =
      "Gentile Valerio, confermiamo la registrazione del dominio plateva.it e ti comunichiamo il relativo codice auth-info, necessario per un eventuale trasferimento del dominio stesso. Codice auth-info per il dominio plateva.it: AI-2847193"
    expect(findOneTimeCode('Registrazione dominio plateva.it', registerIt)).toBeNull()
    expect(findOneTimeCode('Registrazione dominio plateva.it', registerIt, true)).toBeNull()
    expect(findOneTimeCode('Il tuo codice cliente', 'Codice cliente 48291374, conservalo per l\'accesso all\'area riservata')).toBeNull()
    expect(findOneTimeCode('Codice sconto', 'Usa il codice 2025 per uno sconto del 10%')).toBeNull()
    expect(findOneTimeCode('Accesso', 'Il codice è ABC12345')).toBeNull()
  })

  it('ignora ordini, importi, date e email senza parole chiave', () => {
    expect(findOneTimeCode('Ordine 123456 spedito', 'Il tuo pacco arriverà lunedì')).toBeNull()
    expect(findOneTimeCode('Fattura', 'Totale 1250 € da pagare entro il 2026')).toBeNull()
    expect(findOneTimeCode('Codice sconto', 'Valido fino al 2026')).toBeNull()
    expect(findOneTimeCode('Riunione', 'Ci vediamo alle 14:30, sala 4')).toBeNull()
  })
})

describe('codici nel testo completo', async () => {
  const { htmlToText, mentionsCode } = await import('./otp')
  it("trova il codice anche dopo un'intestazione di inoltro", () => {
    const html = `<html><head><style>p{}</style></head><body><p>To: abc@hortelab.com (chatgpt.com) From: noreply@tm.openai.com Actions: Deactivate | Block email | Block domain Removed 1 tracking pixel - View report</p><p>Per continuare, inserisci questo codice di verifica temporaneo:</p><div>052630</div><p>Se non stavi provando ad accedere a ChatGPT, reimposta la tua password.</p></body></html>`
    expect(findOneTimeCode('Il tuo codice di verifica ChatGPT', htmlToText(html), true)).toBe('052630')
    // nel testo completo "conferma" da sola non basta: un numero d'ordine non è un codice
    expect(findOneTimeCode('Conferma ordine', 'Grazie! Conferma del tuo ordine numero 482913, spedizione domani', true)).toBeNull()
    expect(mentionsCode('Il tuo codice di verifica ChatGPT', 'To: abc@hortelab.com From: noreply@tm.openai.com')).toBe(true)
  })
})
