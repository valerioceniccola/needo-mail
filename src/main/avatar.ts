import { partitionOf, viewContents } from './views'

/*
  Foto del profilo Google: è l'immagine dell'account in alto a destra nella pagina di Gmail.
  La leggiamo dalla pagina, la scarichiamo con i cookie dell'account e la salviamo come data URL,
  così l'interfaccia la mostra anche offline e senza aprire la sua sicurezza a domini esterni.
*/

// cerca nella barra in alto di Gmail l'immagine ospitata su googleusercontent (la foto profilo)
const FIND_AVATAR = `(() => {
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
    const res = await partitionOf(id).fetch(url)
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? 'image/jpeg'
    const data = Buffer.from(await res.arrayBuffer()).toString('base64')
    return `data:${type};base64,${data}`
  } catch {
    return null
  }
}
