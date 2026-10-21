import { contextBridge } from 'electron'

/*
  Script iniettato in ogni vista Gmail.
  Le notifiche le crea il processo principale leggendo il feed della posta, così funzionano
  senza attivare nulla in Gmail e rispettano la pausa. Se in Gmail fossero attive anche le sue
  notifiche desktop arriverebbero doppie (e anche per gli account in pausa): le assorbiamo qui.
  executeInMainWorld gira nel contesto della pagina prima dei suoi script.
*/
contextBridge.executeInMainWorld({
  func: () => {
    class SilentNotification extends EventTarget {
      onclick: ((e: Event) => void) | null = null
      onclose: ((e: Event) => void) | null = null
      close() {}
      static get permission() {
        return 'granted'
      }
      static requestPermission(callback?: (p: string) => void) {
        callback?.('granted')
        return Promise.resolve('granted')
      }
    }
    Object.defineProperty(window, 'Notification', { value: SilentNotification, writable: true, configurable: true })
  }
})

/*
  Selettore di account di Gmail (in alto a destra): ogni account ha già la sua vista, quindi lo togliamo.
  Il CSS in views.ts copre gli account @gmail.com; negli account Workspace il pulsante sta in una "pillola"
  insieme al logo dell'azienda e ha un markup diverso. Qui lo cerchiamo in modo più robusto (link a
  SignOutOptions oppure etichetta con l'indirizzo email), risaliamo fino al contenitore che non include
  altri pulsanti (così sparisce anche il logo accanto) e lo nascondiamo.
  Dallo stesso pulsante prendiamo la foto profilo: il processo principale la legge da data-needo-avatar.
*/
if (location.hostname === 'mail.google.com') {
  const HIDDEN = 'data-needo-hidden'
  const INTERACTIVE = 'a, button, [role="button"], input, form'

  const findAccountButton = (): HTMLElement | null => {
    const bar = document.querySelector('#gb, header[role="banner"], header')
    if (!bar) return null
    const link = bar.querySelector<HTMLElement>('a[href*="accounts.google.com/SignOutOptions"]')
    if (link) return link
    for (const el of bar.querySelectorAll<HTMLElement>('a[aria-label], button[aria-label], [role="button"][aria-label]')) {
      if (el.getAttribute('aria-label')?.includes('@')) return el
    }
    return null
  }

  // risale finché il genitore non contiene altri elementi cliccabili (icone, ricerca, griglia delle app)
  const containerOf = (button: HTMLElement): HTMLElement => {
    let box = button
    for (let i = 0; i < 5; i++) {
      const parent = box.parentElement
      if (!parent || parent.matches('#gb, header, body')) break
      const others = [...parent.querySelectorAll(INTERACTIVE)].some((el) => el !== button && !button.contains(el))
      if (others) break
      box = parent
    }
    return box
  }

  const apply = () => {
    const button = findAccountButton()
    if (!button) return
    const img = button.querySelector('img')
    if (img?.src) document.documentElement.dataset.needoAvatar = img.src
    const box = containerOf(button)
    if (!box.hasAttribute(HIDDEN)) box.setAttribute(HIDDEN, '')
  }

  const start = () => {
    const style = document.createElement('style')
    style.textContent = `[${HIDDEN}] { display: none !important; }`
    document.head.append(style)
    apply()
    // Gmail ridisegna la barra quando vuole: si ricontrolla, al massimo una volta per frame
    let queued = false
    new MutationObserver(() => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        apply()
      })
    }).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
}
