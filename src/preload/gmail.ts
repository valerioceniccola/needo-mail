import { contextBridge, ipcRenderer } from 'electron'

// Valore scritto qui e non importato: un preload in sandbox non può caricare altri file del progetto,
// e importarlo creerebbe un file condiviso tra i due preload.
// = IPC.notify in shared/api.ts
const NOTIFY_CHANNEL = 'gmail:notify'

/*
  Script iniettato in ogni vista Gmail. executeInMainWorld gira nel contesto della pagina
  prima dei suoi script, quindi la sostituzione è già al suo posto quando Gmail la usa.
*/

// Notifiche: Gmail usa window.Notification; la nostra versione passa titolo e testo al processo
// principale, che decide se mostrarle (account in pausa → no)
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
