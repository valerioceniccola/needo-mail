import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'

/**
 * Archivio locale minimo: un file JSON in ~/Library/Application Support/Gmail Hub/.
 * Al posto di electron-store, che dalla v10 è solo ESM mentre il nostro processo principale è CommonJS.
 */
export function createStore<T extends object>(name: string, defaults: T) {
  const file = join(app.getPath('userData'), `${name}.json`)

  const read = (): T => {
    try {
      return { ...defaults, ...JSON.parse(readFileSync(file, 'utf-8')) }
    } catch {
      // primo avvio o file rovinato: si riparte dai valori predefiniti
      return { ...defaults }
    }
  }

  const write = (data: T) => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(data, null, 2))
  }

  return { read, write }
}
