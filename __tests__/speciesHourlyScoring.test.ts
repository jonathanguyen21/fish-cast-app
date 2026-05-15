import {
  scoreSpeciesHourly,
  bestWindowSummary,
  describeBestWindow,
} from '../features/species/speciesHourlyScoring'
import { westCoastSpecies } from '../data/species/westCoast'
import type { TidePhase } from '../features/tide/tideUtils'

const halibut = westCoastSpecies.find(s => s.id === 'ca_halibut')!

function constantPhases(phase: TidePhase): Record<number, TidePhase> {
  const out: Record<number, TidePhase> = {}
  for (let h = 5; h <= 20; h++) out[h] = phase
  return out
}

describe('scoreSpeciesHourly', () => {
  it('returns 16 entries for hours 5..20', () => {
    const result = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    expect(result).toHaveLength(16)
    expect(result[0].hour).toBe(5)
    expect(result[15].hour).toBe(20)
  })

  it('returns all zeros for out-of-season species', () => {
    const result = scoreSpeciesHourly(halibut, {
      month: 1,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    expect(result.every(e => e.score === 0)).toBe(true)
  })

  it('scores higher during preferred time-of-day', () => {
    const result = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    // halibut prefers dawn/morning — confirm dawn hour 7 beats midday hour 13
    const dawnEntry = result.find(e => e.hour === 7)!
    const middayEntry = result.find(e => e.hour === 13)!
    expect(dawnEntry.score).toBeGreaterThan(middayEntry.score)
  })

  it('tide phase varies score per hour', () => {
    const mixedPhases: Record<number, TidePhase> = {}
    for (let h = 5; h <= 20; h++) {
      mixedPhases[h] = h < 12 ? 'incoming' : 'outgoing'
    }
    const incomingResult = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: mixedPhases,
    })
    const allIncoming = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    // halibut prefers incoming — afternoon hours should be lower when outgoing
    const mixedAfternoon = incomingResult.find(e => e.hour === 14)!.score
    const allIncomingAfternoon = allIncoming.find(e => e.hour === 14)!.score
    expect(mixedAfternoon).toBeLessThanOrEqual(allIncomingAfternoon)
  })

  it('cold-water mismatch lowers all hours', () => {
    const cold = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 40,
      tidePhasesByHour: constantPhases('incoming'),
    })
    const warm = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    for (let i = 0; i < cold.length; i++) {
      expect(cold[i].score).toBeLessThanOrEqual(warm[i].score)
    }
    expect(cold.some((e, i) => e.score < warm[i].score)).toBe(true)
  })
})

describe('bestWindowSummary', () => {
  it('finds peak window in a mid-day curve', () => {
    const hourly = [
      { hour: 5, score: 40 }, { hour: 6, score: 50 }, { hour: 7, score: 60 },
      { hour: 8, score: 70 }, { hour: 9, score: 80 }, { hour: 10, score: 75 },
      { hour: 11, score: 65 }, { hour: 12, score: 55 }, { hour: 13, score: 50 },
      { hour: 14, score: 45 }, { hour: 15, score: 40 }, { hour: 16, score: 40 },
      { hour: 17, score: 40 }, { hour: 18, score: 40 }, { hour: 19, score: 40 },
      { hour: 20, score: 40 },
    ]
    const result = bestWindowSummary(hourly)
    expect(result).not.toBeNull()
    expect(result!.start).toBe(8)
    expect(result!.end).toBe(10)
    expect(result!.avgScore).toBe(75)
    expect(result!.peakHour).toBe(9)
    expect(result!.peakScore).toBe(80)
  })

  it('returns null for all-zero input', () => {
    const hourly = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    expect(bestWindowSummary(hourly)).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(bestWindowSummary([])).toBeNull()
  })
})

describe('describeBestWindow', () => {
  const lateAfternoonPeak = [
    { hour: 5, score: 40 }, { hour: 6, score: 45 }, { hour: 7, score: 50 },
    { hour: 8, score: 50 }, { hour: 9, score: 55 }, { hour: 10, score: 55 },
    { hour: 11, score: 55 }, { hour: 12, score: 60 }, { hour: 13, score: 60 },
    { hour: 14, score: 65 }, { hour: 15, score: 70 }, { hour: 16, score: 75 },
    { hour: 17, score: 80 }, { hour: 18, score: 78 }, { hour: 19, score: 60 },
    { hour: 20, score: 50 },
  ]

  it('returns "peaking-now" when current is within 5 of max', () => {
    const result = describeBestWindow(lateAfternoonPeak, 17)
    expect(result).toEqual({ kind: 'peaking-now' })
  })

  it('returns "opens-at" when peak is later', () => {
    const result = describeBestWindow(lateAfternoonPeak, 10)
    expect(result).toEqual({ kind: 'opens-at', atHour: 17 })
  })

  it('returns "window" when peak is earlier than current', () => {
    const earlierPeak = [
      { hour: 5, score: 40 }, { hour: 6, score: 60 }, { hour: 7, score: 80 },
      { hour: 8, score: 75 }, { hour: 9, score: 70 }, { hour: 10, score: 60 },
      { hour: 11, score: 50 }, { hour: 12, score: 45 }, { hour: 13, score: 45 },
      { hour: 14, score: 40 }, { hour: 15, score: 40 }, { hour: 16, score: 40 },
      { hour: 17, score: 40 }, { hour: 18, score: 40 }, { hour: 19, score: 40 },
      { hour: 20, score: 40 },
    ]
    const result = describeBestWindow(earlierPeak, 14)
    expect(result?.kind).toBe('window')
    if (result?.kind === 'window') {
      expect(result.start).toBe(7)
      expect(result.end).toBe(9)
    }
  })

  it('returns null for all-zero input', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    expect(describeBestWindow(zeros, 12)).toBeNull()
  })
})
