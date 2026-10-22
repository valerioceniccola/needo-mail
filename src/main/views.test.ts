import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ session: {}, shell: {}, WebContentsView: class {} }))

import { unwrapGoogleRedirect } from './views'

describe('unwrapGoogleRedirect', () => {
  it("toglie il passaggio da google.com/url dei link nelle email", () => {
    expect(unwrapGoogleRedirect('https://www.google.com/url?q=https://example.com/a?b%3D1&sa=D')).toBe('https://example.com/a?b=1')
  })
  it('lascia stare gli altri indirizzi', () => {
    expect(unwrapGoogleRedirect('https://example.com/url?q=x')).toBe('https://example.com/url?q=x')
    expect(unwrapGoogleRedirect('https://mail.google.com/mail/u/0/')).toBe('https://mail.google.com/mail/u/0/')
  })
})
