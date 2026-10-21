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
