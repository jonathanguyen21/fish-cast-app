import { scoreSpecies, hourToTimeOfDay } from '../features/species/speciesScoring'
import { westCoastSpecies } from '../data/species/westCoast'
import { northeastSpecies } from '../data/species/northeast'
import { freshwaterSpecies } from '../data/species/freshwater'

const halibut = westCoastSpecies.find(s => s.id === 'ca_halibut')!       // present 3-10, peak 5-8
const bluefish = northeastSpecies.find(s => s.id === 'bluefish')!
const rockfish = westCoastSpecies.find(s => s.id === 'rockfish')!          // year-round
const bass = freshwaterSpecies.find(s => s.common_name.toLowerCase().includes('bass'))!
const stripedBass = northeastSpecies.find(s => s.id === 'striped_bass')!

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
      month: 12, waterTemp: 65, tidePhase: 'slack', currentHour: 7,
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

describe('scoreSpecies peak month vs shoulder month', () => {
  it('peak month scores higher than shoulder month for halibut', () => {
    // halibut peak=5-8, shoulder=3,4,9,10
    const peak = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 7 })
    const shoulder = scoreSpecies(halibut, { month: 3, waterTemp: 62, tidePhase: 'incoming', currentHour: 7 })
    expect(peak.score).toBeGreaterThan(shoulder.score)
    // Difference should be exactly 20 pts (peak=40 vs present=20)
    expect(peak.score - shoulder.score).toBe(20)
  })

  it('peak month status is Peak Season with good conditions', () => {
    const result = scoreSpecies(halibut, { month: 7, waterTemp: 62, tidePhase: 'incoming', currentHour: 7 })
    expect(result.status).toBe('Peak Season')
  })

  it('rockfish year-round species always has non-zero score', () => {
    for (let m = 1; m <= 12; m++) {
      const result = scoreSpecies(rockfish, { month: m, waterTemp: 56, tidePhase: 'any' as any, currentHour: 10 })
      expect(result.score).toBeGreaterThan(0)
    }
  })
})

describe('scoreSpecies temperature edge cases', () => {
  // halibut water_temp_f: { min: 55, max: 68, peak_min: 58, peak_max: 65 }
  it('exact peak_min boundary gives peak temp score', () => {
    const atMin = scoreSpecies(halibut, { month: 6, waterTemp: 58, tidePhase: 'incoming', currentHour: 7 })
    expect(atMin.waterTempMatch).toContain('Peak range')
  })

  it('exact peak_max boundary gives peak temp score', () => {
    const atMax = scoreSpecies(halibut, { month: 6, waterTemp: 65, tidePhase: 'incoming', currentHour: 7 })
    expect(atMax.waterTempMatch).toContain('Peak range')
  })

  it('1 degree outside peak range gives "In range" score', () => {
    // halibut peak_min=58; 57°F is outside peak but within min=55
    const justBelow = scoreSpecies(halibut, { month: 6, waterTemp: 57, tidePhase: 'incoming', currentHour: 7 })
    expect(justBelow.waterTempMatch).toContain('In range')
  })

  it('within 5F of min gives partial credit', () => {
    // halibut min=55; temp=51 is 4F below min → partial (10 pts)
    const nearMin = scoreSpecies(halibut, { month: 6, waterTemp: 51, tidePhase: 'incoming', currentHour: 7 })
    const inRange = scoreSpecies(halibut, { month: 6, waterTemp: 55, tidePhase: 'incoming', currentHour: 7 })
    expect(inRange.score).toBeGreaterThan(nearMin.score)
  })

  it('extreme temp (20F outside range) gives 0 temp points', () => {
    // halibut max=68; temp=90 is well beyond +5 tolerance
    const extreme = scoreSpecies(halibut, { month: 6, waterTemp: 90, tidePhase: 'incoming', currentHour: 7 })
    const ideal = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 7 })
    // 30 temp points difference (ideal has peak temp; extreme has 0)
    expect(ideal.score - extreme.score).toBe(30)
  })
})

describe('scoreSpecies tide preference edge cases', () => {
  it('non-preferred tide gives 5 pts (not 0)', () => {
    // halibut prefers incoming; outgoing gives 5 pts
    const preferred = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 7 })
    const nonPreferred = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'outgoing', currentHour: 7 })
    // Difference should be 10 (15 preferred - 5 non-preferred)
    expect(preferred.score - nonPreferred.score).toBe(10)
  })

  it('slack tide gives 8 pts (between preferred 15 and non-preferred 5)', () => {
    const preferred = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 7 })
    const slack = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'slack', currentHour: 7 })
    const nonPreferred = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'outgoing', currentHour: 7 })
    // preferred(15) > slack(8) > non-preferred(5)
    expect(preferred.score).toBeGreaterThan(slack.score)
    expect(slack.score).toBeGreaterThan(nonPreferred.score)
  })
})

describe('scoreSpecies time of day edge cases', () => {
  it('hour 0 (midnight) maps to night', () => {
    expect(hourToTimeOfDay(0)).toBe('night')
  })

  it('hour 7 (last dawn hour) maps to dawn', () => {
    expect(hourToTimeOfDay(7)).toBe('dawn')
  })

  it('hour 8 (first morning hour) maps to morning', () => {
    expect(hourToTimeOfDay(8)).toBe('morning')
  })

  it('preferred time gives 15 pts; non-preferred gives 5', () => {
    // halibut prefers dawn/morning/dusk; midday (12-14) is non-preferred
    const preferred = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 6 })   // dawn
    const nonPreferred = scoreSpecies(halibut, { month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 13 }) // midday
    expect(preferred.score - nonPreferred.score).toBe(10) // 15 - 5 = 10
  })
})

describe('northeast species boundary tests', () => {
  it('striped bass returns Inactive in off-season month', () => {
    const offMonths = [1, 2, 3].filter(m => !stripedBass.months_present.includes(m))
    if (offMonths.length === 0) return
    const result = scoreSpecies(stripedBass, { month: offMonths[0], waterTemp: 65, tidePhase: 'incoming', currentHour: 7 })
    expect(result.status).toBe('Inactive')
  })

  it('striped bass scores higher in peak vs shoulder', () => {
    const peakM = stripedBass.months_peak[0]
    const shoulderM = stripedBass.months_present.find(m => !stripedBass.months_peak.includes(m))
    if (!shoulderM) return
    const peak = scoreSpecies(stripedBass, { month: peakM, waterTemp: 68, tidePhase: 'incoming', currentHour: 7 })
    const shoulder = scoreSpecies(stripedBass, { month: shoulderM, waterTemp: 68, tidePhase: 'incoming', currentHour: 7 })
    expect(peak.score).toBeGreaterThan(shoulder.score)
  })
})

describe('all species score cap invariant', () => {
  const allSpecies = [...westCoastSpecies, ...northeastSpecies, ...freshwaterSpecies]

  it.each(allSpecies.map(s => [s.common_name, s] as [string, typeof s]))(
    '%s never exceeds 100 at ideal conditions',
    (_name, species) => {
      const peakMonth = species.months_peak[0] ?? species.months_present[0] ?? 6
      const idealTemp = (species.water_temp_f.peak_min + species.water_temp_f.peak_max) / 2
      const preferredTide = species.preferred_tide === 'any' ? 'incoming' : species.preferred_tide as 'incoming' | 'outgoing' | 'slack'
      const result = scoreSpecies(species, { month: peakMonth, waterTemp: idealTemp, tidePhase: preferredTide, currentHour: 7 })
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.score).toBeGreaterThanOrEqual(0)
    }
  )
})
