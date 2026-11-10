import { describe, expect, it } from 'vitest'
import type { Account } from './types'
import { isPaused, manualPauseEndsAt, migrateAccount, nextScheduledPauseAt, pauseRulesToActiveHours, scheduledPauseEndsAt } from './pause'
import { badgeCount } from './badge'

// 20 ottobre 2026 è un martedì
const at = (day: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return new Date(2026, 9, day, h, m)
}

// lavoro: attivo lun–ven 9–19, in pausa la sera e nel weekend
const work: Account = {
  id: 'work',
  label: 'Lavoro',
  email: 'valerio@studio.it',
  color: '#F2994A',
  override: null,
  activeHours: { enabled: true, rules: [{ days: [0, 1, 2, 3, 4], allDay: false, from: '09:00', to: '19:00' }] }
}

describe('isPaused con gli orari di attività', () => {
  it('attivo in orario di lavoro', () => {
    expect(isPaused(work, at(20, '10:30'))).toBe(false)
    expect(isPaused(work, at(21, '09:00'))).toBe(false)
  })

  it('in pausa fuori orario', () => {
    expect(isPaused(work, at(20, '19:00'))).toBe(true)
    expect(isPaused(work, at(21, '08:59'))).toBe(true)
    expect(isPaused(work, at(24, '12:00'))).toBe(true) // sabato
    expect(isPaused(work, at(25, '23:00'))).toBe(true) // domenica
  })

  it('orari spenti: sempre attivo', () => {
    const a: Account = { ...work, activeHours: { ...work.activeHours, enabled: false } }
    expect(isPaused(a, at(24, '12:00'))).toBe(false)
  })

  it('fascia attiva fino a mezzanotte ("00:00" come fine)', () => {
    const late: Account = { ...work, activeHours: { enabled: true, rules: [{ days: [5], allDay: false, from: '09:00', to: '00:00' }] } }
    expect(isPaused(late, at(24, '23:59'))).toBe(false) // sabato sera
    expect(isPaused(late, at(25, '00:30'))).toBe(true) // domenica notte
  })
})

describe('pausa manuale', () => {
  it('a tempo: finisce da sola', () => {
    const until = at(20, '11:30').toISOString()
    const a: Account = { ...work, override: { state: 'paused', until } }
    expect(isPaused(a, at(20, '11:00'))).toBe(true)
    expect(manualPauseEndsAt(a, at(20, '11:00'))?.toISOString()).toBe(until)
    expect(isPaused(a, at(20, '11:30'))).toBe(false)
    expect(manualPauseEndsAt(a, at(20, '11:30'))).toBeNull()
  })

  it('senza scadenza: finché non la riattivi', () => {
    const a: Account = { ...work, override: { state: 'paused' } }
    expect(isPaused(a, at(20, '10:30'))).toBe(true)
    expect(isPaused(a, at(30, '10:30'))).toBe(true)
  })

  it('riattivato fuori orario: attivo fino al prossimo cambio', () => {
    const a: Account = { ...work, override: { state: 'active', until: at(21, '09:00').toISOString() } }
    expect(isPaused(a, at(20, '22:00'))).toBe(false)
  })
})

describe('inizio e fine della pausa automatica', () => {
  it('fine: quando si rientra negli orari', () => {
    expect(scheduledPauseEndsAt(work, at(20, '22:00'))).toEqual(at(21, '09:00'))
    expect(scheduledPauseEndsAt(work, at(24, '12:00'))).toEqual(at(26, '09:00')) // sabato → lunedì
  })

  it('inizio: quando si esce dagli orari', () => {
    expect(nextScheduledPauseAt(work, at(20, '10:30'))).toEqual(at(20, '19:00'))
    expect(nextScheduledPauseAt({ ...work, activeHours: { enabled: false, rules: [] } }, at(20, '10:30'))).toBeNull()
  })
})

describe('conversione delle vecchie fasce di pausa', () => {
  it('pausa la sera dei feriali e tutto il weekend → attivo lun–ven 9–19', () => {
    const rules = pauseRulesToActiveHours([
      { days: [0, 1, 2, 3, 4], allDay: false, from: '19:00', to: '09:00' },
      { days: [5, 6], allDay: true, from: '', to: '' }
    ])
    // lunedì mattina era attivo (la pausa di domenica non c'era), poi 9–19 gli altri giorni
    expect(rules).toEqual([
      { days: [0], allDay: false, from: '00:00', to: '19:00' },
      { days: [1, 2, 3, 4], allDay: false, from: '09:00', to: '19:00' }
    ])
  })

  it('ogni minuto resta com era: attivo dove prima non era in pausa', () => {
    const old: Account = { ...work, activeHours: undefined as never, autoPause: { enabled: true, rules: [{ days: [0, 1, 2, 3, 4], allDay: false, from: '19:00', to: '09:00' }] } }
    const migrated = migrateAccount(old)
    expect(migrated.autoPause).toBeUndefined()
    expect(migrated.activeHours.enabled).toBe(true)
    for (const [day, time, paused] of [
      [20, '10:00', false],
      [20, '20:00', true],
      [21, '08:00', true],
      [24, '12:00', false], // sabato: in pausa solo 00–09 (la fascia di venerdì sera), poi attivo
      [24, '08:00', true],
      [25, '12:00', false]
    ] as const) {
      expect(isPaused(migrated, at(day, time))).toBe(paused)
    }
  })

  it('pausa automatica spenta → orari spenti', () => {
    const old = { ...work, activeHours: undefined as never, autoPause: { enabled: false, rules: [] } }
    expect(migrateAccount(old).activeHours).toEqual({ enabled: false, rules: [] })
  })
})

describe('badgeCount', () => {
  it('conta solo gli account attivi', () => {
    const personal: Account = { ...work, id: 'personal', activeHours: { enabled: false, rules: [] } }
    const unread = { work: 5, personal: 3 }
    expect(badgeCount([work, personal], unread, at(20, '10:30'))).toBe(8)
    expect(badgeCount([work, personal], unread, at(20, '22:00'))).toBe(3)
  })

  it('salta gli account esclusi dal badge', () => {
    const personal: Account = { ...work, id: 'personal', badge: false, activeHours: { enabled: false, rules: [] } }
    expect(badgeCount([work, personal], { work: 5, personal: 3 }, at(20, '10:30'))).toBe(5)
  })
})
