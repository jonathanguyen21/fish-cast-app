import { computeDayNote } from '../app/(tabs)/week'
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
