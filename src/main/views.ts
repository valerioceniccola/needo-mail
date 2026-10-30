import { join } from 'node:path'
import { session, shell, WebContentsView, type BrowserWindow, type Rectangle, type Session, type WebContents } from 'electron'
import type { Rect } from '@shared/api'
import { attachContextMenu } from './contextMenu'

/*
  Una WebContentsView per account, ognuna con la sua sessione persistente (cookie e login separati).
  L'interfaccia dice dove sta il riquadro di Gmail (setBounds); qui si mostra solo la vista dell'account aperto.
*/

const GMAIL_URL = 'https://mail.google.com/mail/u/0/'

// Nessun travestimento dello user agent: come Meru, lasciamo quello di Electron, che si dichiara onestamente.
// Uno user agent "da Chrome" con i segnali di Chromium incorporato è proprio ciò che Google blocca al login.

// pagina di accesso di Google per Gmail: da qui parte l'aggiunta di un account
export const SIGN_IN_URL = 'https://accounts.google.com/ServiceLogin?service=mail&continue=https://mail.google.com/mail/u/0/'

// questi domini restano dentro l'app (login, Gmail, allegati, Drive…); tutto il resto va nel browser
const GOOGLE_HOSTS = /(^|\.)(google\.com|googleusercontent\.com|gstatic\.com|youtube\.com|google\.it)$/

type Callbacks = {
  onTitle: (id: string, title: string) => void
  onNavigate: (id: string) => void
  onLoaded: (id: string) => void
}

const views = new Map<string, WebContentsView>()
// viste pronte da mostrare: finché Gmail carica resta nascosta e sotto si vede la rotellina dell'interfaccia
const ready = new Set<string>()

// Gmail ha il suo selettore di account (foto in alto a destra): qui ogni account ha già la sua vista,
// quindi lo togliamo per non avere due modi di cambiare account. Si nasconde il contenitore del pulsante
// (display: none), così le icone accanto scorrono a destra; il :not evita di nascondere per sbaglio
// un contenitore che ha dentro anche la griglia delle app Google. La foto resta nella pagina per l'avatar.
const ACCOUNT_LINK = 'a[href^="https://accounts.google.com/SignOutOptions"]'
const HIDE_ACCOUNT_SWITCHER = `
  header div:has(> ${ACCOUNT_LINK}):not(:has(a[href*="/about/products"])),
  header ${ACCOUNT_LINK} {
    display: none !important;
  }
`

// pagine Google per aggiungere o scegliere un altro account dentro la stessa sessione: non servono
const ACCOUNT_SWITCH_PAGES = /^https:\/\/accounts\.google\.com\/(AddSession|AccountChooser|SignOutOptions)/
let win: BrowserWindow
let callbacks: Callbacks
let bounds: Rectangle = { x: 0, y: 0, width: 0, height: 0 }
let overlay = false
let visibleId: string | null = null

export function initViews(window: BrowserWindow, cb: Callbacks) {
  win = window
  callbacks = cb
}

export function partitionOf(id: string): Session {
  return session.fromPartition(`persist:account-${id}`)
}

function isGoogle(url: string): boolean {
  try {
    return GOOGLE_HOSTS.test(new URL(url).hostname)
  } catch {
    return false
  }
}

// finestre nuove che restano nell'app: solo Gmail stesso e gli allegati (anteprima e download).
// Tutto il resto, compresi i link dentro le email e Drive/Docs, va nel browser predefinito.
const IN_APP_WINDOWS = /^https:\/\/(mail\.google\.com|accounts\.google\.com|[^/]*\.googleusercontent\.com)\//

/** Gmail fa passare i link delle email da google.com/url?q=…: si apre direttamente l'indirizzo vero. */
export function unwrapGoogleRedirect(url: string): string {
  try {
    const u = new URL(url)
    if (/(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname === '/url') return u.searchParams.get('q') || u.searchParams.get('url') || url
  } catch {
    // indirizzo non valido: si lascia com'è
  }
  return url
}

function setupSession(ses: Session) {
  // notifiche: le concediamo a Gmail, poi è il processo principale a decidere se mostrarle
  const allowed = new Set(['notifications', 'clipboard-sanitized-write', 'fullscreen'])
  ses.setPermissionRequestHandler((_wc, permission, done) => done(allowed.has(permission)))
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission))

}

/** Crea (o restituisce) la vista Gmail di un account; `signIn` parte dalla pagina di accesso di Google. */
export function ensureView(id: string, signIn = false): WebContentsView {
  const existing = views.get(id)
  if (existing) return existing

  const ses = partitionOf(id)
  setupSession(ses)

  const view = new WebContentsView({
    webPreferences: {
      session: ses,
      preload: join(__dirname, '../preload/gmail.js'),
      contextIsolation: true,
      sandbox: true
    }
  })
  view.setBackgroundColor('#F6F8FC')
  view.setBorderRadius(10)
  view.setVisible(false)
  // l'interfaccia non ha ancora detto dov'è il riquadro (avvio): intanto la finestra intera, mai 0×0
  if (bounds.width === 0) {
    const [width, height] = win.getContentSize()
    view.setBounds({ x: 0, y: 0, width, height })
  }
  win.contentView.addChildView(view)
  views.set(id, view)

  const wc = view.webContents
  // niente freno di Chromium sulle viste nascoste: col freno Gmail caricava in decine di secondi e, una volta
  // carica, dietro le quinte si aggiornava solo ogni tanto (le email nuove comparivano con ritardo aprendo
  // l'account). Senza freno Gmail resta sincronizzato come una scheda in primo piano; a riposo consuma poco.
  wc.setBackgroundThrottling(false)

  // finestre nuove: allegati e Gmail restano nell'app con la stessa sessione; i link delle email nel browser
  wc.setWindowOpenHandler(({ url }) => {
    const target = unwrapGoogleRedirect(url)
    if (IN_APP_WINDOWS.test(target)) return { action: 'allow' }
    // a volte Gmail apre una finestra vuota e poi le dà l'indirizzo: la lasciamo nascere nascosta e
    // al primo indirizzo vero la chiudiamo e apriamo quello nel browser (did-create-window qui sotto)
    if (target === 'about:blank' || target === '') return { action: 'allow', overrideBrowserWindowOptions: { show: false } }
    if (/^(https?|mailto):/.test(target)) shell.openExternal(target)
    return { action: 'deny' }
  })
  wc.on('did-create-window', (child, { url }) => {
    if (url !== 'about:blank' && url !== '') return
    const redirect = (event: { preventDefault: () => void }, next: string) => {
      const target = unwrapGoogleRedirect(next)
      if (IN_APP_WINDOWS.test(target)) {
        child.show()
        return
      }
      event.preventDefault()
      if (/^(https?|mailto):/.test(target)) shell.openExternal(target)
      child.close()
    }
    child.webContents.on('will-navigate', redirect)
    child.webContents.on('will-redirect', redirect)
    // se nessuno le dà un indirizzo entro qualche secondo, la finestra vuota si chiude
    setTimeout(() => {
      if (!child.isDestroyed() && !child.isVisible()) child.close()
    }, 5000)
  })
  wc.on('will-navigate', (event, url) => {
    // durante l'aggiunta (signIn) Google può passare dalla scelta dell'account, dopo no
    if (!signIn && ACCOUNT_SWITCH_PAGES.test(url)) {
      event.preventDefault()
      return
    }
    if (!isGoogle(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  wc.on('page-title-updated', (_e, title) => callbacks.onTitle(id, title))
  wc.on('did-navigate', () => callbacks.onNavigate(id))
  wc.on('did-navigate-in-page', () => callbacks.onNavigate(id))
  wc.on('did-finish-load', () => callbacks.onLoaded(id))
  // caricamento di pagina intera verso Gmail (avvio, ricarica, fine dell'accesso): si torna alla rotellina
  wc.on('did-start-navigation', (details) => {
    if (details.isMainFrame && !details.isSameDocument && details.url.startsWith('https://mail.google.com/')) {
      ready.delete(id)
      layout()
    }
  })
  attachContextMenu(wc)
  wc.on('dom-ready', () => {
    if (wc.getURL().startsWith('https://mail.google.com/')) {
      wc.insertCSS(HIDE_ACCOUNT_SWITCHER)
      waitForGmail(id, wc)
    } else markReady(id) // pagina di accesso di Google: si mostra subito
  })

  wc.loadURL(signIn ? SIGN_IN_URL : GMAIL_URL)
  layout()
  return view
}

function markReady(id: string) {
  if (ready.has(id)) return
  ready.add(id)
  layout()
}

// Gmail mostra prima una sua schermata di caricamento (#loading): la vista si scopre quando Gmail l'ha
// nascosta, oppure quando c'è già la casella. Al massimo 12 secondi, poi si mostra comunque quello che c'è.
const GMAIL_READY = `(() => {
  const l = document.getElementById('loading')
  const loaderHidden = !!l && (getComputedStyle(l).display === 'none' || getComputedStyle(l).visibility === 'hidden')
  return loaderHidden || !!document.querySelector('[role="main"]')
})()`

function waitForGmail(id: string, wc: WebContents) {
  const started = Date.now()
  const tick = async () => {
    if (wc.isDestroyed() || ready.has(id)) return
    let ok = false
    try {
      ok = await wc.executeJavaScript(GMAIL_READY, true)
    } catch {
      // pagina in cambio: si riprova
    }
    if (ok || Date.now() - started > 12_000) return markReady(id)
    setTimeout(tick, 200)
  }
  tick()
}

/** Chiude la vista; con `clearData` cancella anche cookie e dati della sessione (account rimosso). */
export async function destroyView(id: string, clearData: boolean) {
  const view = views.get(id)
  if (view) {
    win.contentView.removeChildView(view)
    view.webContents.close()
    views.delete(id)
  }
  ready.delete(id)
  if (clearData) await partitionOf(id).clearStorageData()
  if (visibleId === id) visibleId = null
}

/** Quale vista mostrare (null = nessuna, es. schermata di benvenuto). */
export function showView(id: string | null) {
  if (id) ensureView(id)
  visibleId = id
  layout()
  if (id) views.get(id)?.webContents.focus()
}

export function setViewBounds(rect: Rect) {
  bounds = { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
  layout()
}

/**
 * Con un dialog aperto nell'interfaccia la vista va nascosta, altrimenti gli starebbe sopra.
 * Prima di nasconderla ne scattiamo un'istantanea: l'interfaccia la mette al suo posto sotto il dialog,
 * così Gmail sembra restare lì (solo non cliccabile) invece di sparire.
 */
export async function setOverlay(visible: boolean): Promise<string | null> {
  if (!visible) {
    overlay = false
    layout()
    return null
  }
  const view = visibleId ? views.get(visibleId) : undefined
  // si fotografa solo una vista davvero a schermo; se è già nascosta si riusa l'ultima foto
  if (view && view.getVisible() && bounds.width > 0) {
    try {
      const image = await view.webContents.capturePage()
      if (!image.isEmpty()) lastSnapshot = { id: visibleId!, data: `data:image/jpeg;base64,${image.toJPEG(85).toString('base64')}` }
    } catch {
      // nessuna foto: l'interfaccia mostra il riquadro sfocato vuoto
    }
  }
  overlay = true
  // un attimo di ritardo: l'interfaccia fa in tempo a disegnare l'istantanea, niente lampo azzurro
  setTimeout(layout, 80)
  return lastSnapshot?.id === visibleId ? lastSnapshot.data : null
}

let lastSnapshot: { id: string; data: string } | null = null

function layout() {
  for (const [id, view] of views) {
    const show = id === visibleId && !overlay && ready.has(id) && bounds.width > 0
    // anche le viste nascoste hanno le dimensioni del riquadro: Gmail sceglie l'impaginazione
    // (densità, colonne, anteprime) dalla larghezza che ha quando carica; nascosta a 0×0 si compatta
    if (bounds.width > 0) view.setBounds(bounds)
    view.setVisible(show)
  }
}

export function viewContents(id: string | null): WebContents | undefined {
  return id ? views.get(id)?.webContents : undefined
}


export function navState(id: string | null) {
  const contents = viewContents(id)
  const history = contents?.navigationHistory
  const url = contents && !contents.isDestroyed() ? contents.getURL() : ''
  return {
    canGoBack: history?.canGoBack() ?? false,
    canGoForward: history?.canGoForward() ?? false,
    // la vista è finita su un'altra pagina Google (account, guida, accesso…): compare "Torna a Gmail"
    outsideGmail: url.startsWith('https://') && !url.startsWith('https://mail.google.com/')
  }
}

/** Pulsante casa: Posta in arrivo. Dentro Gmail basta cambiare il # (istantaneo); da un'altra pagina si ricarica Gmail. */
export function backToGmail(id: string | null) {
  const wc = viewContents(id)
  if (!wc || wc.isDestroyed()) return
  if (wc.getURL().startsWith('https://mail.google.com/')) wc.executeJavaScript(`location.hash = '#inbox'`, true).catch(() => {})
  else wc.loadURL(GMAIL_URL)
}

/*
  "Aggiorna" di Gmail (il pulsante sopra l'elenco, act=20): rilegge l'elenco dai server senza ricaricare la pagina.
  Serve quando la pagina è rimasta indietro, tipicamente dopo lo stop del Mac: Gmail perde il collegamento
  in tempo reale e mostra ancora email gestite altrove finché non si aggiorna. I pulsanti di Gmail reagiscono
  a mousedown/mouseup, non a click. Se il pulsante non c'è (si sta leggendo un'email, Gmail cambiato) non succede nulla.
*/
const PRESS_REFRESH = `(() => {
  const button = document.querySelector('[act="20"]')
  if (!button) return false
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  // come se il mouse se ne andasse: Gmail toglie l'evidenziazione grigia, che altrimenti resterebbe
  button.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
  button.blur()
  return true
})()`

export function refreshGmail(id: string) {
  const wc = viewContents(id)
  if (!wc || wc.isDestroyed() || !ready.has(id) || !wc.getURL().startsWith('https://mail.google.com/')) return
  wc.executeJavaScript(PRESS_REFRESH, true).catch(() => {})
}

/**
 * Clic su una notifica: Posta in arrivo, cambiando solo il # (niente ricarica). Nessun "Aggiorna" qui:
 * quando arriva l'email i non letti cambiano e la casella si è già aggiornata (refreshUnreadSoon in index.ts).
 */
export function openInbox(id: string) {
  const wc = viewContents(id)
  if (!wc || wc.isDestroyed() || !wc.getURL().startsWith('https://mail.google.com/')) return
  wc.executeJavaScript(`location.hash = '#inbox'`, true).catch(() => {})
}

/**
 * Clic sulla notifica di una email: la apre nella casella già caricata cambiando solo il # (#inbox/<id>),
 * senza ricaricare Gmail. L'id del feed è nel formato vecchio (esadecimale) e Gmail lo accetta ancora; se dopo
 * 3 secondi l'email non è a schermo (id non riconosciuto, email già eliminata) si torna alla Posta in arrivo.
 */
export function openMail(id: string, messageId: string) {
  const wc = viewContents(id)
  if (!wc || wc.isDestroyed() || !wc.getURL().startsWith('https://mail.google.com/')) return
  if (!/^[0-9a-f]+$/i.test(messageId)) return openInbox(id)
  wc.executeJavaScript(
    `(() => {
      location.hash = '#inbox/${messageId}'
      setTimeout(() => {
        const shown = document.querySelector('[data-legacy-message-id="${messageId}"], [data-legacy-thread-id="${messageId}"]')
        if (!shown && location.hash.includes('${messageId}')) location.hash = '#inbox'
      }, 3000)
    })()`,
    true
  ).catch(() => {})
}
