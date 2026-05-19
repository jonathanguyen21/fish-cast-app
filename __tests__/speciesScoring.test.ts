import { scoreSpecies, hourToTimeOfDay } from '../features/species/speciesScoring'
import { westCoastSpecies } from '../data/species/westCoast'

const halibut = westCoastSpecies.find(s => s.id === 'ca_halibut')!

describe('scoreSpecies', () => {
  it('returns high score in peak month with matching conditions', () => {
    const result = scoreSpecies(halibut, {
      month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 7,
    })
    expect(result.score).toBeGreaterThan(70)
    expect(result.status).toBe('Peak Season')
  })

  it('returns low score out of season', () => {
    const result = scoreSpecies(halibut, {
      month: 1, waterTemp: 62, tidePhase: 'incoming', currentHour: 7,
    })
    expect(result.score).toBeLessThan(40)
    expect(result.status).toBe('Inactive')
  })

  it('returns Present when present but not peak', () => {
    const result = scoreSpecies(halibut, {
      month: 3, waterTemp: 60, tidePhase: 'incoming', currentHour: 7,
    })
    expect(['Present', 'Active']).toContain(result.status)
  })
})

describe('hourToTimeOfDay', () => {
  it('maps pre-dawn hours to night', () => {
    expect(hourToTimeOfDay(0)).toBe('night')
    expect(hourToTimeOfDay(4)).toBe('night')
  })
  it('maps 5-7 to dawn', () => {
    expect(hourToTimeOfDay(5)).toBe('dawn')
    expect(hourToTimeOfDay(7)).toBe('dawn')
  })
  it('maps 8-11 to morning', () => {
    expect(hourToTimeOfDay(8)).toBe('morning')
    expect(hourToTimeOfDay(11)).toBe('morning')
  })
  it('maps 12-14 to midday', () => {
    expect(hourToTimeOfDay(12)).toBe('midday')
    expect(hourToTimeOfDay(14)).toBe('midday')
  })
  it('maps 15-17 to afternoon', () => {
    expect(hourToTimeOfDay(15)).toBe('afternoon')
    expect(hourToTimeOfDay(17)).toBe('afternoon')
  })
  it('maps 18-20 to dusk', () => {
    expect(hourToTimeOfDay(18)).toBe('dusk')
    expect(hourToTimeOfDay(20)).toBe('dusk')
  })
  it('maps 21-23 to night', () => {
    expect(hourToTimeOfDay(21)).toBe('night')
    expect(hourToTimeOfDay(23)).toBe('night')
  })
})
