import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'
import { savedBounds, trackWindowState, wasMaximized } from './windowState'

// nome mostrato nel menu dell'app e nel Dock anche in sviluppo
app.setName('Gmail Hub')

/** Crea la finestra principale: barra del titolo nascosta, semafori dentro la barra laterale. */
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    ...savedBounds(),
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Gmail Hub',
    backgroundColor: '#0E0E10',
    titleBarStyle: 'hiddenInset',
    // allineati alla riga alta 44px della barra laterale
    trafficLightPosition: { x: 18, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/app.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  // si mostra solo a contenuto pronto, così non si vede il flash bianco
  win.once('ready-to-show', () => {
    if (wasMaximized()) win.maximize()
    win.show()
  })
  trackWindowState(win)

  // i link esterni dell'interfaccia vanno nel browser predefinito
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  // in sviluppo il Dock mostrerebbe l'icona di Electron; nell'app impacchettata usa build/icon.icns
  if (!app.isPackaged) app.dock?.setIcon(join(__dirname, '../../build/icon.png'))

  createWindow()

  // su macOS cliccando l'icona nel Dock si riapre la finestra se era chiusa
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// su macOS l'app resta attiva anche a finestra chiusa (serve per notifiche e badge)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
