import { scoreSpecies } from '../features/species/speciesScoring'
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
