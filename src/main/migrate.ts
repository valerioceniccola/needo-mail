import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/*
  Primo file caricato dal processo principale (va importato prima di tutto in index.ts):
  fissa il nome dell'app e, se serve, sposta i dati dalla cartella del vecchio nome.
  Needo prima si chiamava "Gmail Hub": account, impostazioni e sessioni stavano in
  ~/Library/Application Support/Gmail Hub/ e li portiamo nella cartella nuova una volta sola.
*/

app.setName('Needo')

const appData = app.getPath('appData')
const oldDir = join(appData, 'Gmail Hub')
const newDir = join(appData, 'Needo')

if (existsSync(oldDir) && !existsSync(newDir)) {
  try {
    renameSync(oldDir, newDir)
  } catch {
    // se non riesce si riparte da zero: al peggio si rifanno gli accessi
  }
}
