import { computeDayNote, compactTime } from '../app/(tabs)/week'
import type { DayForecast } from '../types/conditions'

describe('computeDayNote', () => {
  it('rain wins over high temp when rainChance >= 20', () => {
    const day = { rainChance: 45, highTemp: 61, scoreLabel: 'Decent — pick your window' } as DayForecast
    const note = computeDayNote(day, 'F')
    expect(note).toContain('rain')
    expect(note).toContain('45')
    expect(note).not.toContain('High')
  })

  it('falls back to high temp when rainChance is below the 20 threshold', () => {
    const day = { rainChance: 10, highTemp: 61, scoreLabel: 'Decent — pick your window' } as DayForecast
    const note = computeDayNote(day, 'F')
    expect(note).toContain('High')
    expect(note).not.toContain('rain')
  })

  it('falls back to scoreLabel when rainChance and highTemp are both absent', () => {
    const day = { rainChance: undefined, highTemp: undefined, scoreLabel: 'Great day to fish' } as DayForecast
    const note = computeDayNote(day, 'F')
    expect(note).toBe('Great day to fish')
  })
})

describe('compactTime', () => {
  it('collapses on-the-hour PM times to a compact lowercase form', () => {
    expect(compactTime('9:00 PM')).toBe('9pm')
    expect(compactTime('11:00 PM')).toBe('11pm')
    expect(compactTime('12:00 PM')).toBe('12pm')
  })

  it('collapses on-the-hour AM times to a compact lowercase form', () => {
    expect(compactTime('6:00 AM')).toBe('6am')
    expect(compactTime('12:00 AM')).toBe('12am')
  })

  it('keeps non-zero minutes for solunar-event times that land off the hour', () => {
    expect(compactTime('5:34 AM')).toBe('5:34am')
    expect(compactTime('10:07 PM')).toBe('10:07pm')
  })

  it('returns the input unchanged if it does not match a recognizable time format', () => {
    expect(compactTime('garbage')).toBe('garbage')
  })
})
