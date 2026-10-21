import type { GmailHubApi } from '../shared/api'

declare global {
  interface Window {
    gmailHub: GmailHubApi
  }
}
