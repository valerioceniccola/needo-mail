import { BrowserWindow } from 'electron'
import { partitionOf } from './views'

/*
  Azioni su un'email senza API di Gmail: apriamo la conversazione in una finestra nascosta
  con la sessione dell'account e premiamo il pulsante di Gmail, come faresti tu.
  La vista dell'account a schermo non viene toccata.
*/

// cerca il pulsante "Elimina" della conversazione aperta (act="10" è l'azione elimina di Gmail;
// il testo è il ripiego in italiano e in inglese) e lo preme con la sequenza di mouse che Gmail ascolta
const CLICK_DELETE = `new Promise((resolve) => {
  const started = Date.now();
  const find = () =>
    [...document.querySelectorAll('[act="10"], [role="button"][aria-label], [role="button"][data-tooltip]')].find((el) => {
      const label = el.getAttribute('aria-label') || el.getAttribute('data-tooltip') || '';
      return el.offsetParent !== null && (el.getAttribute('act') === '10' || /^(Elimina|Delete)$/i.test(label.trim()));
    });
  const tick = () => {
    const button = find();
    if (button) {
      for (const type of ['mousedown', 'mouseup', 'click']) button.dispatchEvent(new MouseEvent(type, { bubbles: true, view: window }));
      resolve(true);
    } else if (Date.now() - started > 20000) {
      resolve(false);
    } else {
      setTimeout(tick, 300);
    }
  };
  tick();
})`

/** Sposta nel Cestino la conversazione dell'email (come "Elimina" in Gmail). Vero se è riuscito. */
export async function deleteMail(accountId: string, link: string): Promise<boolean> {
  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: { session: partitionOf(accountId), sandbox: true, backgroundThrottling: false }
  })
  try {
    await win.loadURL(link.replace(/^http:/, 'https:'))
    const done: boolean = await win.webContents.executeJavaScript(CLICK_DELETE)
    // lasciamo a Gmail il tempo di mandare la richiesta prima di chiudere
    if (done) await new Promise((r) => setTimeout(r, 2500))
    return done
  } catch {
    return false
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}
