import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: {}, dialog: {} }))
vi.mock('electron-updater', () => ({ default: { autoUpdater: {} } }))

import { releaseNotesText } from './updater'

describe('releaseNotesText', () => {
  it("trasforma l'HTML di GitHub in un elenco puntato", () => {
    const html = '<ul>\n<li>Notifiche col suono di Mail</li>\n<li>Fascia &quot;gialla&quot; &amp; avvisi</li>\n</ul>'
    expect(releaseNotesText(html)).toBe('• Notifiche col suono di Mail\n• Fascia "gialla" & avvisi')
  })

  it('accetta anche il markdown del CHANGELOG e il vuoto', () => {
    expect(releaseNotesText('- Uno\n- Due')).toBe('• Uno\n• Due')
    expect(releaseNotesText(null)).toBe('')
  })

  it('più versioni: ognuna col suo numero', () => {
    const notes = [
      { version: '0.1.9', note: '<ul><li>Tre</li></ul>' },
      { version: '0.1.8', note: '<ul><li>Due</li></ul>' }
    ]
    expect(releaseNotesText(notes)).toBe('0.1.9\n• Tre\n\n0.1.8\n• Due')
  })
})
