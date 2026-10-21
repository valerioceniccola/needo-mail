import { join } from 'node:path'
import { session, shell, WebContentsView, type BrowserWindow, type Rectangle, type Session, type WebContents } from 'electron'
import type { Rect } from '@shared/api'

/*
  Una WebContentsView per account, ognuna con la sua sessione persistente (cookie e login separati).
  L'interfaccia dice dove sta il riquadro di Gmail (setBounds); qui si mostra solo la vista dell'account aperto.
*/

const GMAIL_URL = 'https://mail.google.com/mail/u/0/'

// Google blocca il login nei browser "non sicuri": ci presentiamo come Chrome, senza la parola Electron
const USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`

// questi domini restano dentro l'app (login, Gmail, allegati, Drive…); tutto il resto va nel browser
const GOOGLE_HOSTS = /(^|\.)(google\.com|googleusercontent\.com|gstatic\.com|youtube\.com|google\.it)$/

type Callbacks = {
  onTitle: (id: string, title: string) => void
  onNavigate: (id: string) => void
}

const views = new Map<string, WebContentsView>()
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

function setupSession(ses: Session) {
  ses.setUserAgent(USER_AGENT)
  // notifiche: le concediamo a Gmail, poi è il processo principale a decidere se mostrarle
  const allowed = new Set(['notifications', 'clipboard-sanitized-write', 'fullscreen'])
  ses.setPermissionRequestHandler((_wc, permission, done) => done(allowed.has(permission)))
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission))
}

/** Crea (o restituisce) la vista Gmail di un account. */
export function ensureView(id: string): WebContentsView {
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
  view.setBackgroundColor('#BBD5EC')
  view.setBorderRadius(10)
  view.setVisible(false)
  win.contentView.addChildView(view)
  views.set(id, view)

  const wc = view.webContents
  wc.setUserAgent(USER_AGENT)

  // finestre nuove (allegati, "apri in nuova finestra"): Google resta nell'app con la stessa sessione, il resto va nel browser
  wc.setWindowOpenHandler(({ url }) => {
    if (isGoogle(url)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })
  wc.on('will-navigate', (event, url) => {
    if (!isGoogle(url)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  wc.on('page-title-updated', (_e, title) => callbacks.onTitle(id, title))
  wc.on('did-navigate', () => callbacks.onNavigate(id))
  wc.on('did-navigate-in-page', () => callbacks.onNavigate(id))

  wc.loadURL(GMAIL_URL)
  layout()
  return view
}

/** Chiude la vista; con `clearData` cancella anche cookie e dati della sessione (account rimosso). */
export async function destroyView(id: string, clearData: boolean) {
  const view = views.get(id)
  if (view) {
    win.contentView.removeChildView(view)
    view.webContents.close()
    views.delete(id)
  }
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

/** Con un dialog aperto nell'interfaccia la vista va nascosta, altrimenti gli starebbe sopra. */
export function setOverlay(visible: boolean) {
  overlay = visible
  layout()
}

function layout() {
  for (const [id, view] of views) {
    const show = id === visibleId && !overlay && bounds.width > 0
    view.setVisible(show)
    if (show) view.setBounds(bounds)
  }
}

export function viewContents(id: string | null): WebContents | undefined {
  return id ? views.get(id)?.webContents : undefined
}

/** Da quale account arriva un messaggio IPC (es. una notifica dal preload Gmail). */
export function accountOfContents(contents: WebContents): string | undefined {
  for (const [id, view] of views) if (view.webContents === contents) return id
  return undefined
}

export function navState(id: string | null) {
  const history = viewContents(id)?.navigationHistory
  return { canGoBack: history?.canGoBack() ?? false, canGoForward: history?.canGoForward() ?? false }
}
