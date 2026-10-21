import { screen, type BrowserWindow, type Rectangle } from 'electron'
import { createStore } from './store'

type WindowState = {
  bounds: Partial<Rectangle>
  maximized: boolean
}

const store = createStore<WindowState>('window', { bounds: { width: 1280, height: 800 }, maximized: false })

/** Posizione e dimensioni salvate, solo se la finestra cade ancora su uno schermo collegato. */
export function savedBounds(): Partial<Rectangle> {
  const { bounds } = store.read()
  const { x, y, width, height } = bounds
  if (x === undefined || y === undefined || !width || !height) return { width: width ?? 1280, height: height ?? 800 }

  // se lo schermo esterno è stato scollegato la finestra finirebbe fuori vista: in quel caso solo le dimensioni
  const visible = screen.getAllDisplays().some(({ workArea: a }) => x < a.x + a.width && x + width > a.x && y < a.y + a.height && y + height > a.y)
  return visible ? bounds : { width, height }
}

export function wasMaximized(): boolean {
  return store.read().maximized
}

/** Salva posizione e dimensioni quando la finestra si sposta, si ridimensiona o si chiude. */
export function trackWindowState(win: BrowserWindow) {
  let timer: NodeJS.Timeout | undefined

  const save = () => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return
    const maximized = win.isMaximized()
    // da massimizzata si tengono le dimensioni "normali", così de-massimizzando torna com'era
    store.write({ bounds: maximized ? win.getNormalBounds() : win.getBounds(), maximized })
  }

  // durante il trascinamento gli eventi arrivano a raffica: si salva mezzo secondo dopo l'ultimo
  const saveSoon = () => {
    clearTimeout(timer)
    timer = setTimeout(save, 500)
  }

  win.on('resize', saveSoon)
  win.on('move', saveSoon)
  win.on('close', () => {
    clearTimeout(timer)
    save()
  })
}
