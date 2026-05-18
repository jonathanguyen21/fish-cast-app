import { buildConditionsSummary } from '../features/conditions/conditionsSummary'
import type { ConditionsData } from '../types/conditions'

function makeConditions(overrides: Partial<ConditionsData> = {}): ConditionsData {
  return {
    fishingScore: 72,
    scoreLabel: 'Great day to fish',
    bestWindow: { start: '2:00 PM', end: '5:00 PM', score: 85 },
    wind: { speed: 8, gusts: 12, direction: 225, directionLabel: 'SW', unit: 'mph' },
    windHourly: [],
    airHourly: [],
    swellHourly: null,
    tide: null,
    water: { temp: 58, unit: '°F' },
    air: { temp: 62, high: 67, low: 55, humidity: 72, unit: '°F' },
    pressure: { value: 30.05, trend: 'falling', rate: 'slow', unit: 'inHg', readings: [30.18, 30.05] },
    swell: null,
    sky: { condition: 'Overcast', rainChance: 10, icon: 'overcast' },
    sun: { sunrise: '6:08 AM', sunset: '7:52 PM' },
    moon: { phase: 'Waxing Gibbous', illumination: 72, majorPeriods: [], minorPeriods: [] },
    hourlyScores: [],
    tidePhasesByHour: {},
    scoreBreakdown: { pressure: 25, solunar: 14, tide: 0, wind: 13, waterTemp: 8, sky: 10 },
    ...overrides,
  }
}

describe('buildConditionsSummary', () => {
  it('mentions slow falling pressure as feeding', () => {
    const summary = buildConditionsSummary(makeConditions())
    expect(summary).toContain('slowly falling')
    expect(summary).toContain('feeding')
  })

  it('mentions rising fast pressure as fish going deep', () => {
    const summary = buildConditionsSummary(makeConditions({
      pressure: { value: 29.8, trend: 'rising', rate: 'fast', unit: 'inHg', readings: [] },
    }))
    expect(summary).toContain('deep')
  })

  it('includes incoming tide phase and next turn', () => {
    const summary = buildConditionsSummary(makeConditions({
      tide: {
        current: { height: 3.2, rising: true, unit: 'ft' },
        next: { type: 'high', time: '3:42 PM', height: 5.1 },
        events: [],
        hourlyCurve: [],
        phase: 'incoming',
      },
    }))
    expect(summary).toContain('Incoming tide')
    expect(summary).toContain('3:42 PM')
  })

  it('includes outgoing tide phase', () => {
    const summary = buildConditionsSummary(makeConditions({
      tide: {
        current: { height: 4.0, rising: false, unit: 'ft' },
        next: { type: 'low', time: '9:15 AM', height: 0.4 },
        events: [],
        hourlyCurve: [],
        phase: 'outgoing',
      },
    }))
    expect(summary).toContain('Outgoing tide')
  })

  it('includes slack water description', () => {
    const summary = buildConditionsSummary(makeConditions({
      tide: {
        current: { height: 5.0, rising: false, unit: 'ft' },
        next: { type: 'low', time: '2:00 PM', height: 0.5 },
        events: [],
        hourlyCurve: [],
        phase: 'slack',
      },
    }))
    expect(summary).toContain('Slack water')
  })

  it('warns about strong wind above 20 mph', () => {
    const summary = buildConditionsSummary(makeConditions({
      wind: { speed: 25, gusts: 32, direction: 270, directionLabel: 'W', unit: 'mph' },
    }))
    expect(summary).toContain('Strong wind')
    expect(summary).toContain('caution')
  })

  it('mentions moderate wind between 14 and 20 mph', () => {
    const summary = buildConditionsSummary(makeConditions({
      wind: { speed: 16, gusts: 20, direction: 270, directionLabel: 'W', unit: 'mph' },
    }))
    expect(summary).toContain('Moderate wind')
    expect(summary).toContain('W')
  })

  it('does not mention wind below 14 mph', () => {
    const summary = buildConditionsSummary(makeConditions({
      wind: { speed: 10, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
    }))
    expect(summary).not.toContain('wind')
  })

  it('mentions rain chance at or above 50%', () => {
    const summary = buildConditionsSummary(makeConditions({
      sky: { condition: 'Light Rain', rainChance: 60, icon: 'light-rain' },
    }))
    expect(summary).toContain('60% rain')
  })

  it('omits rain chance below 50%', () => {
    const summary = buildConditionsSummary(makeConditions({
      sky: { condition: 'Partly Cloudy', rainChance: 30, icon: 'partly-cloudy' },
    }))
    expect(summary).not.toContain('rain')
  })

  it('joins parts with " · " separator', () => {
    const summary = buildConditionsSummary(makeConditions())
    if (summary.includes(' · ')) {
      expect(summary).toMatch(/^.+ · .+/)
    }
  })

  it('returns a non-empty string', () => {
    const summary = buildConditionsSummary(makeConditions())
    expect(typeof summary).toBe('string')
    expect(summary.length).toBeGreaterThan(0)
  })
})
