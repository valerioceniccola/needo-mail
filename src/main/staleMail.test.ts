import { describe, expect, it, vi } from 'vitest'

vi.mock('./views', () => ({ partitionOf: () => ({}) }))

import { staleMailIds } from './staleMail'
import type { MailEntry } from './unread'

const mail = (id: string, time: number): MailEntry => ({ id, time, subject: '', author: '', summary: '', link: '' })

describe('staleMailIds', () => {
  it('feed completo: le email che mancano non sono più da leggere', () => {
    const notified = new Map([['a', 100], ['b', 200]])
    expect(staleMailIds(notified, { count: 1, entries: [mail('b', 200)] })).toEqual(['a'])
  })

  it('feed troncato: chiude solo le email più recenti della più vecchia del feed', () => {
    const notified = new Map([['vecchia', 50], ['recente', 300]])
    const inbox = { count: 300, entries: [mail('x', 400), mail('y', 100)] }
    expect(staleMailIds(notified, inbox)).toEqual(['recente'])
  })

  it('email ancora non lette: niente da chiudere', () => {
    const notified = new Map([['a', 100]])
    expect(staleMailIds(notified, { count: 5, entries: [mail('a', 100)] })).toEqual([])
  })
})
