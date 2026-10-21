import { nativeImage } from 'electron'
import { partitionOf, viewContents } from './views'

/*
  Foto del profilo Google: è l'immagine dell'account in alto a destra nella pagina di Gmail.
  La leggiamo dalla pagina, la scarichiamo con i cookie dell'account e la salviamo come data URL,
  così l'interfaccia la mostra anche offline e senza aprire la sua sicurezza a domini esterni.
*/

// la foto la trova il preload della vista (gmail.ts) dentro il pulsante dell'account e la lascia in
// data-needo-avatar; in mancanza, la vecchia ricerca dell'immagine su googleusercontent nella barra in alto.
// Gli account Workspace hanno la foto su lh3.google.com, non su googleusercontent.
const FIND_AVATAR = `(() => {
  const found = document.documentElement.dataset.needoAvatar;
  if (found) return found;
  const img = document.querySelector('header img[src*="googleusercontent.com"], #gb img[src*="googleusercontent.com"]');
  return img ? img.src : null;
})()`

export async function readAvatar(id: string): Promise<string | null> {
  const contents = viewContents(id)
  if (!contents || contents.isDestroyed()) return null
  try {
    const src: string | null = await contents.executeJavaScript(FIND_AVATAR)
    if (!src) return null
    // gli URL di Google indicano la dimensione (=s32-c): la chiediamo più grande per gli schermi Retina
    const url = src.replace(/=s\d+(-[a-z]+)?/, '=s128-c')
    const res = await partitionOf(id).fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? 'image/jpeg'
    if (!type.startsWith('image/')) return null
    const data = Buffer.from(await res.arrayBuffer()).toString('base64')
    return `data:${type};base64,${data}`
  } catch {
    return null
  }
}

/** Immagine scelta dal Mac: ritagliata al centro in un quadrato e ridotta a 256 px. */
export function avatarFromFile(path: string): string | null {
  const image = nativeImage.createFromPath(path)
  if (image.isEmpty()) return null
  const { width, height } = image.getSize()
  const side = Math.min(width, height)
  const square = image.crop({ x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), width: side, height: side })
  return square.resize({ width: 256, height: 256, quality: 'best' }).toDataURL()
}
