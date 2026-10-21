import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { app, shell } from 'electron'
import type { NotificationStatus } from '@shared/api'

/*
  Come sono impostate le notifiche di Needo in macOS (Impostazioni di Sistema › Notifiche).
  Electron non lo dice. Strada principale: un piccolo modulo nativo (native/notification-settings)
  che chiede a macOS con l'API ufficiale UNUserNotificationCenter. Se il modulo manca (es. non compilato
  in sviluppo) proviamo le preferenze del Centro Notifiche dei macOS più vecchi (com.apple.ncprefs):
  ogni app ha un numero "flags", bit 25 = consentite, bit 4 = Permanenti, bit 3 = Temporanei.
  Il gruppo di usernoted dei macOS recenti non si legge: macOS lo protegge e chiederebbe un permesso.
*/

type NativeSettings = { authorization: 'authorized' | 'denied' | 'provisional' | 'notDetermined'; alertStyle: 'alert' | 'banner' | 'none' }
type NativeModule = { getSettings: () => NativeSettings | null }

let native: NativeModule | null | undefined

function loadNative(): NativeModule | null {
  if (native !== undefined) return native
  native = null
  try {
    // nell'app installata il .node sta fuori dall'asar (asarUnpack in electron-builder.yml)
    const file = join(app.getAppPath(), 'native/notification-settings/build/Release/notification_settings.node').replace('app.asar', 'app.asar.unpacked')
    const mod = { exports: {} as NativeModule }
    process.dlopen(mod, file)
    native = mod.exports
  } catch {
    // niente modulo: si usa la lettura delle preferenze
  }
  return native
}

function fromNative(): NotificationStatus | null {
  const settings = loadNative()?.getSettings()
  if (!settings || settings.authorization === 'notDetermined') return null
  if (settings.authorization === 'denied') return 'off'
  return settings.alertStyle === 'alert' ? 'alerts' : settings.alertStyle === 'banner' ? 'banners' : 'none'
}

// in sviluppo le notifiche risultano dell'app Electron
const bundleId = () => (app.isPackaged ? 'it.valerioceniccola.needo' : 'com.github.Electron')

const DOMAINS = ['com.apple.ncprefs']

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
  try {
    const status = fromNative()
    if (status) return status
  } catch {
    // si prova la strada vecchia
  }
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
