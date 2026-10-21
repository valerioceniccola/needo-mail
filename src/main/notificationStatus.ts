import { execFile } from 'node:child_process'
import { app, shell } from 'electron'
import type { NotificationStatus } from '@shared/api'

/*
  Come sono impostate le notifiche di Needo in macOS (Impostazioni di Sistema › Notifiche).
  Electron non lo dice, quindi leggiamo le preferenze del Centro Notifiche con `defaults export`
  (sola lettura, nessun permesso da chiedere). Ogni app ha un numero "flags":
  bit 25 = notifiche consentite; bit 4 = stile Avvisi; bit 3 = stile Banner; nessuno dei due = Nessuno.
  Il formato non è documentato da Apple: se non troviamo l'app rispondiamo "unknown".
*/

// in sviluppo le notifiche risultano dell'app Electron
const bundleId = () => (app.isPackaged ? 'it.valerioceniccola.needo' : 'com.github.Electron')

// prima com.apple.ncprefs (preferenze normali dell'utente); se l'app non c'è, il gruppo di usernoted
// dove le tengono i macOS più recenti
const DOMAINS = ['com.apple.ncprefs', 'group.com.apple.usernoted']

function exportDomain(domain: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('/usr/bin/defaults', ['export', domain, '-'], { maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => resolve(err ? '' : stdout))
  })
}

/** Il numero "flags" dell'app nel plist XML esportato, o null se l'app non c'è. */
function flagsOf(xml: string, id: string): number | null {
  const at = xml.indexOf(`<string>${id}</string>`)
  if (at < 0) return null
  const start = xml.lastIndexOf('<dict>', at)
  const end = xml.indexOf('</dict>', at)
  const entry = xml.slice(start, end)
  const match = /<key>flags<\/key>\s*<integer>(\d+)<\/integer>/.exec(entry)
  return match ? Number(match[1]) : null
}

export async function notificationStatus(): Promise<NotificationStatus> {
  if (process.platform !== 'darwin') return 'unknown'
  for (const domain of DOMAINS) {
    const flags = flagsOf(await exportDomain(domain), bundleId())
    if (flags === null) continue
    if (!(flags & (1 << 25))) return 'off'
    const alerts = !!(flags & (1 << 4))
    const banners = !!(flags & (1 << 3))
    if (alerts && !banners) return 'alerts'
    if (banners && !alerts) return 'banners'
    return 'none'
  }
  return 'unknown'
}

/** Apre Impostazioni di Sistema › Notifiche direttamente sulla pagina di Needo. */
export function openNotificationSettings() {
  shell.openExternal(`x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=${bundleId()}`)
}
