// Compila il modulo nativo delle notifiche (solo su macOS). Parte da solo dopo npm install.
// In locale un errore non blocca nulla (l'app dirà "Non rilevabile"); su GitHub Actions (CI) blocca il rilascio.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

if (process.platform !== 'darwin') process.exit(0)
const require = createRequire(import.meta.url)
const nodeGyp = require.resolve('node-gyp/bin/node-gyp.js')
const result = spawnSync(process.execPath, [nodeGyp, 'rebuild', '--directory', 'native/notification-settings'], { stdio: 'inherit' })
if (result.status !== 0) {
  console.warn('Modulo nativo delle notifiche non compilato: lo stato delle notifiche risulterà "Non rilevabile".')
  if (process.env.CI) process.exit(1)
}
