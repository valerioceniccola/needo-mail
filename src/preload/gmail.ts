import { contextBridge, ipcRenderer, webFrame } from 'electron'

// stesso valore di IPC.notify in shared/api.ts: scritto qui perché un preload in sandbox
// non può caricare altri file del progetto, e importarlo creerebbe un file condiviso tra i due preload
const NOTIFY_CHANNEL = 'gmail:notify'

/*
  Script iniettato in ogni vista Gmail.
  Gmail mostra le notifiche desktop con window.Notification: la sostituiamo con una versione
  che passa titolo e testo al processo principale, che decide se mostrarle (account in pausa → no).
*/

contextBridge.exposeInMainWorld('__gmailHub', {
  notify: (title: string, body: string) => ipcRenderer.send(NOTIFY_CHANNEL, String(title), String(body))
})

// gira nel contesto della pagina, dove vive il window.Notification usato da Gmail
const shim = `(() => {
  const bridge = window.__gmailHub;
  class GmailHubNotification extends EventTarget {
    constructor(title, options = {}) {
      super();
      this.title = title;
      this.body = options.body || '';
      this.onclick = null;
      this.onclose = null;
      bridge.notify(title, this.body);
    }
    close() {}
    static get permission() { return 'granted'; }
    static requestPermission(callback) {
      if (callback) callback('granted');
      return Promise.resolve('granted');
    }
  }
  Object.defineProperty(window, 'Notification', { value: GmailHubNotification, writable: true, configurable: true });
})();`

webFrame.executeJavaScript(shim)
