import { contextBridge, ipcRenderer } from 'electron'

// Valori scritti qui e non importati: un preload in sandbox non può caricare altri file del progetto,
// e importarli creerebbe un file condiviso tra i due preload.
// = IPC.notify in shared/api.ts
const NOTIFY_CHANNEL = 'gmail:notify'
// = FIREFOX_USER_AGENT in main/views.ts
const FIREFOX_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0'

/*
  Script iniettato in ogni vista Gmail. executeInMainWorld gira nel contesto della pagina
  prima dei suoi script, quindi le sostituzioni sono già al loro posto quando Google le legge.
*/

// 1) Pagina di accesso Google: anche dentro la pagina ci presentiamo come Firefox, coerenti con gli header
if (location.hostname === 'accounts.google.com') {
  contextBridge.executeInMainWorld({
    func: (ua: string) => {
      const set = (key: string, value: unknown) => Object.defineProperty(Navigator.prototype, key, { get: () => value, configurable: true })
      set('userAgent', ua)
      set('appVersion', '5.0 (Macintosh)')
      set('vendor', '')
      set('platform', 'MacIntel')
      set('userAgentData', undefined)
    },
    args: [FIREFOX_USER_AGENT]
  })
}

// 2) Notifiche: Gmail usa window.Notification; la nostra versione passa titolo e testo al processo
//    principale, che decide se mostrarle (account in pausa → no)
contextBridge.exposeInMainWorld('__gmailHub', {
  notify: (title: string, body: string) => ipcRenderer.send(NOTIFY_CHANNEL, String(title), String(body))
})

contextBridge.executeInMainWorld({
  func: () => {
    const bridge = (window as unknown as { __gmailHub: { notify: (t: string, b: string) => void } }).__gmailHub
    class GmailHubNotification extends EventTarget {
      title: string
      body: string
      onclick: ((e: Event) => void) | null = null
      onclose: ((e: Event) => void) | null = null
      constructor(title: string, options: { body?: string } = {}) {
        super()
        this.title = title
        this.body = options.body ?? ''
        bridge.notify(title, this.body)
      }
      close() {}
      static get permission() {
        return 'granted'
      }
      static requestPermission(callback?: (p: string) => void) {
        callback?.('granted')
        return Promise.resolve('granted')
      }
    }
    Object.defineProperty(window, 'Notification', { value: GmailHubNotification, writable: true, configurable: true })
  }
})
