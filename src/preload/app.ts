import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type AppState, type GmailHubApi } from '@shared/api'

// ponte tra interfaccia e processo principale: l'interfaccia chiede, il principale decide e rimanda lo stato
const api: GmailHubApi = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (listener) => {
    const handler = (_: unknown, state: AppState) => listener(state)
    ipcRenderer.on(IPC.state, handler)
    return () => ipcRenderer.off(IPC.state, handler)
  },
  select: (id) => ipcRenderer.send(IPC.select, id),
  move: (fromId, toId) => ipcRenderer.send(IPC.move, fromId, toId),
  openAccountMenu: (id) => ipcRenderer.send(IPC.menu, id),
  resume: (id) => ipcRenderer.send(IPC.resume, id),
  closeSettings: () => ipcRenderer.send(IPC.closeSettings),
  openSettingsPage: () => ipcRenderer.send(IPC.openSettingsPage),
  closeSettingsPage: () => ipcRenderer.send(IPC.closeSettingsPage),
  setSetting: (key, value) => ipcRenderer.send(IPC.setSetting, key, value),
  checkForUpdates: () => ipcRenderer.send(IPC.checkUpdates),
  installUpdate: () => ipcRenderer.send(IPC.installUpdate),
  updateAccount: (id, changes) => ipcRenderer.send(IPC.update, id, changes),
  chooseAvatar: (id) => ipcRenderer.send(IPC.chooseAvatar, id),
  resetAvatar: (id) => ipcRenderer.send(IPC.resetAvatar, id),
  removeAccount: (id) => ipcRenderer.send(IPC.remove, id),
  startAdd: () => ipcRenderer.send(IPC.startAdd),
  cancelAdd: () => ipcRenderer.send(IPC.cancelAdd),
  confirmAdd: (label, color) => ipcRenderer.send(IPC.confirmAdd, label, color),
  setViewBounds: (rect) => ipcRenderer.send(IPC.bounds, rect),
  setOverlay: (visible) => ipcRenderer.invoke(IPC.overlay, visible),
  back: () => ipcRenderer.send(IPC.back),
  forward: () => ipcRenderer.send(IPC.forward),
  reload: () => ipcRenderer.send(IPC.reload)
}

contextBridge.exposeInMainWorld('gmailHub', api)
