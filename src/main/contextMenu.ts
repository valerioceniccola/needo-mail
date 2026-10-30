import { clipboard, Menu, shell, type MenuItemConstructorOptions, type WebContents } from 'electron'

/*
  Menu del tasto destro dentro Gmail. Electron, a differenza di un browser, non ne ha uno suo:
  senza questo il tasto destro su testo, link e immagini non faceva nulla. Dove Gmail ha già il suo menu
  (elenco delle email) resta il suo: Gmail blocca l'evento e questo non parte.
*/
export function attachContextMenu(wc: WebContents) {
  wc.on('context-menu', (_event, params) => {
    const items: MenuItemConstructorOptions[] = []
    const add = (...entries: MenuItemConstructorOptions[]) => {
      if (items.length && entries.length) items.push({ type: 'separator' })
      items.push(...entries)
    }

    // correttore: suggerimenti per la parola sottolineata
    if (params.misspelledWord) {
      const suggestions = params.dictionarySuggestions.slice(0, 5)
      add(
        ...(suggestions.length
          ? suggestions.map((word) => ({ label: word, click: () => wc.replaceMisspelling(word) }))
          : [{ label: 'Nessun suggerimento', enabled: false }]),
        { label: 'Aggiungi al dizionario', click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord) }
      )
    }

    if (params.linkURL && !params.linkURL.startsWith('javascript:')) {
      const url = params.linkURL
      add(
        { label: 'Apri link nel browser', click: () => shell.openExternal(url) },
        { label: 'Copia link', click: () => clipboard.writeText(url) }
      )
    }

    if (params.mediaType === 'image' && params.srcURL) {
      add({ label: 'Copia immagine', click: () => wc.copyImageAt(params.x, params.y) })
    }

    const { editFlags } = params
    if (params.isEditable) {
      add(
        { label: 'Taglia', role: 'cut', enabled: editFlags.canCut },
        { label: 'Copia', role: 'copy', enabled: editFlags.canCopy },
        { label: 'Incolla', role: 'paste', enabled: editFlags.canPaste },
        { label: 'Seleziona tutto', role: 'selectAll' }
      )
    } else if (params.selectionText.trim()) {
      const text = params.selectionText.trim()
      add(
        { label: 'Copia', role: 'copy' },
        { label: `Cerca "${text.length > 24 ? text.slice(0, 24) + '…' : text}" con Google`, click: () => shell.openExternal(`https://www.google.com/search?q=${encodeURIComponent(text)}`) }
      )
    }

    if (items.length) Menu.buildFromTemplate(items).popup()
  })
}
