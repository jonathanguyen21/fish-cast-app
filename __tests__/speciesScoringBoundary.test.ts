import { scoreSpecies } from '../features/species/speciesScoring'
import { westCoastSpecies } from '../data/species/westCoast'
import { northeastSpecies } from '../data/species/northeast'
import { freshwaterSpecies } from '../data/species/freshwater'

const halibut = westCoastSpecies.find(s => s.id === 'ca_halibut')!
const bluefish = northeastSpecies.find(s => s.id === 'bluefish')!
const bass = freshwaterSpecies.find(s => s.common_name.toLowerCase().includes('bass'))!

describe('scoreSpecies boundary months', () => {
  it('returns Inactive in month just before season starts', () => {
    // halibut present Mar–Oct (months 3–10), so February should be Inactive
    const febResult = scoreSpecies(halibut, {
      month: 2, waterTemp: 60, tidePhase: 'incoming', currentHour: 8,
    })
    expect(febResult.status).toBe('Inactive')
  })

  it('returns Present in first month of season', () => {
    // halibut present from March
    const marchResult = scoreSpecies(halibut, {
      month: 3, waterTemp: 60, tidePhase: 'incoming', currentHour: 8,
    })
    expect(['Present', 'Active', 'Peak Season']).toContain(marchResult.status)
  })

  it('returns Inactive in month just after season ends', () => {
    // bluefish present Apr–Nov
    const decResult = scoreSpecies(bluefish, {
      month: 12, waterTemp: 65, tidePhase: 'any', currentHour: 7,
    })
    expect(decResult.status).toBe('Inactive')
  })

  it('penalizes cold water outside species range', () => {
    const coldResult = scoreSpecies(halibut, {
      month: 7, waterTemp: 45, tidePhase: 'incoming', currentHour: 8,
    })
    const warmResult = scoreSpecies(halibut, {
      month: 7, waterTemp: 62, tidePhase: 'incoming', currentHour: 8,
    })
    expect(warmResult.score).toBeGreaterThan(coldResult.score)
  })

  it('penalizes hot water outside species range', () => {
    const hotResult = scoreSpecies(halibut, {
      month: 7, waterTemp: 82, tidePhase: 'incoming', currentHour: 8,
    })
    const idealResult = scoreSpecies(halibut, {
      month: 7, waterTemp: 62, tidePhase: 'incoming', currentHour: 8,
    })
    expect(idealResult.score).toBeGreaterThan(hotResult.score)
  })

  it('freshwater bass scores correctly in peak season', () => {
    if (!bass) return
    const result = scoreSpecies(bass, {
      month: bass.months_peak[0] ?? 6,
      waterTemp: bass.water_temp_f.peak_min + 2,
      tidePhase: 'slack',
      currentHour: 7,
    })
    expect(result.score).toBeGreaterThan(50)
  })

  it('score is always 0-100', () => {
    const months = [1, 3, 6, 9, 12]
    for (const month of months) {
      const result = scoreSpecies(halibut, { month, waterTemp: 55, tidePhase: 'incoming', currentHour: 12 })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })
})
