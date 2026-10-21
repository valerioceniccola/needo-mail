import { describe, expect, it } from 'vitest'
import type { Account } from './types'
import { isPaused, nextScheduledPauseAt, scheduledPauseEndsAt } from './pause'
import { badgeCount } from './badge'

// 20 ottobre 2026 è un martedì
const at = (day: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return new Date(2026, 9, day, h, m)
}

const work: Account = {
  id: 'work',
  label: 'Lavoro',
  email: 'valerio@studio.it',
  color: '#F2994A',
  override: null,
  autoPause: {
    enabled: true,
    rules: [
      { days: [0, 1, 2, 3, 4], allDay: false, from: '19:00', to: '09:00' },
      { days: [5, 6], allDay: true, from: '', to: '' }
    ]
  }
}

describe('isPaused', () => {
  it('attivo in orario di lavoro', () => {
    expect(isPaused(work, at(20, '10:30'))).toBe(false)
  })

  it('in pausa la sera e la mattina presto (fascia che scavalca la mezzanotte)', () => {
    expect(isPaused(work, at(20, '19:00'))).toBe(true)
    expect(isPaused(work, at(21, '08:59'))).toBe(true)
    expect(isPaused(work, at(21, '09:00'))).toBe(false)
  })

  it('in pausa tutto il weekend', () => {
    expect(isPaused(work, at(24, '12:00'))).toBe(true) // sabato
    expect(isPaused(work, at(25, '23:00'))).toBe(true) // domenica
  })

  it('lunedì mattina presto è libero: la fascia serale della domenica non esiste', () => {
    expect(isPaused(work, at(26, '07:00'))).toBe(false)
  })

  it('la pausa manuale vince anche quando la programmazione direbbe attivo', () => {
    expect(isPaused({ ...work, override: { state: 'paused' } }, at(20, '10:30'))).toBe(true)
  })

  it('riattivato a mano resta attivo fino alla scadenza, poi torna la programmazione', () => {
    const a: Account = { ...work, override: { state: 'active', until: at(21, '09:00').toISOString() } }
    expect(isPaused(a, at(20, '21:00'))).toBe(false)
    expect(isPaused(a, at(24, '12:00'))).toBe(true)
  })

  it('programmazione spenta: sempre attivo', () => {
    const a: Account = { ...work, autoPause: { ...work.autoPause, enabled: false } }
    expect(isPaused(a, at(24, '12:00'))).toBe(false)
  })
})

describe('scheduledPauseEndsAt', () => {
  it('venerdì sera la pausa finisce lunedì a mezzanotte (la domenica non ha la fascia serale)', () => {
    expect(scheduledPauseEndsAt(work, at(23, '20:00'))).toEqual(at(26, '00:00'))
  })

  it('martedì sera la pausa finisce mercoledì alle 9', () => {
    expect(scheduledPauseEndsAt(work, at(20, '22:00'))).toEqual(at(21, '09:00'))
  })

  it('null se non è in pausa automatica', () => {
    expect(scheduledPauseEndsAt(work, at(20, '10:30'))).toBeNull()
  })
})

describe('nextScheduledPauseAt', () => {
  it('martedì mattina la prossima pausa è martedì alle 19', () => {
    expect(nextScheduledPauseAt(work, at(20, '10:30'))).toEqual(at(20, '19:00'))
  })

  it('null se è già in pausa o non ci sono fasce', () => {
    expect(nextScheduledPauseAt(work, at(20, '22:00'))).toBeNull()
    expect(nextScheduledPauseAt({ ...work, autoPause: { enabled: false, rules: [] } }, at(20, '10:30'))).toBeNull()
  })
})

describe('badgeCount', () => {
  it('somma solo gli account attivi', () => {
    const personal: Account = { ...work, id: 'personal', autoPause: { enabled: false, rules: [] } }
    const news: Account = { ...work, id: 'news', override: { state: 'paused' } }
    const unread = { personal: 3, work: 12, news: 48 }
    expect(badgeCount([personal, work, news], unread, at(20, '10:30'))).toBe(15)
    expect(badgeCount([personal, work, news], unread, at(24, '12:00'))).toBe(3)
  })

  it('salta gli account con il badge spento, anche se attivi', () => {
    const personal: Account = { ...work, id: 'personal', badge: false, autoPause: { enabled: false, rules: [] } }
    expect(badgeCount([personal, work], { personal: 3, work: 12 }, at(20, '10:30'))).toBe(12)
  })
})
