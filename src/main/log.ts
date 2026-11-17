import { appendFile, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { app, shell } from 'electron'

/*
  Registro diagnostico minimo (userData/needo.log): solo eventi utili a capire un problema dopo,
  per esempio la posta che smette di arrivare. Niente contenuti delle email. Oltre 512 KB il file
  diventa needo.old.log e se ne inizia uno nuovo.
*/

const MAX = 512 * 1024
const file = () => join(app.getPath('userData'), 'needo.log')

let queue = Promise.resolve()

export function log(message: string) {
  const line = `${new Date().toISOString()} ${message}\n`
  queue = queue
    .then(async () => {
      const size = await stat(file())
        .then((s) => s.size)
        .catch(() => 0)
      if (size > MAX) await rename(file(), join(app.getPath('userData'), 'needo.old.log')).catch(() => {})
      await appendFile(file(), line)
    })
    .catch(() => {})
}

/** Dal menu Aiuto: mostra il file nel Finder, così si può allegare a una segnalazione. */
export function showLog() {
  shell.showItemInFolder(file())
}
