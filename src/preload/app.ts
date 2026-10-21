import { contextBridge } from 'electron'
import type { GmailHubApi } from '@shared/api'

// ponte tra interfaccia e processo principale: per ora espone solo la piattaforma,
// le chiamate IPC per account, pause e badge arriveranno qui
const api: GmailHubApi = {
  platform: process.platform
}

contextBridge.exposeInMainWorld('gmailHub', api)
