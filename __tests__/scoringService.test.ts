import { buildConditionsData } from '../services/scoringService'
import type { NoaaData } from '../services/noaaService'
import type { NwsData } from '../services/nwsService'
import type { SolunarData } from '../services/solunarService'
import type { MarineDay } from '../services/marineService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const DATE = '2026-05-06'
const NOW = new Date('2026-05-06T14:00:00')

const NOAA: NoaaData = {
  tideByDay: {
    '2026-05-06': {
      current: { height: 3.2, rising: true, unit: 'ft' },
      next: { type: 'high', time: '3:42 PM', height: 5.1 },
      events: [
        { type: 'low', time: '9:18 AM', height: 0.3 },
        { type: 'high', time: '3:42 PM', height: 5.1 },
      ],
      hourlyCurve: [0.8,0.5,0.3,0.5,1.1,1.9,2.8,3.6,4.3,4.8,5.0,5.1,
                    4.9,4.5,3.8,3.0,2.2,1.5,1.0,0.8,0.9,1.3,1.9,2.7],
      phase: 'incoming',
    },
  },
  wind: { speed: 8, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
  waterTemp: 57,
  pressure: { value: 30.02, trend: 'falling', rate: 'slow', unit: 'inHg', readings: [30.18, 30.05, 30.02] },
  airTemp: null,
}

const NWS: NwsData = {
  air: { temp: 62, high: 67, low: 55, humidity: 75, unit: '°F' },
  sky: { condition: 'Overcast', rainChance: 10, icon: 'overcast' },
  wind: { speed: 10, gusts: 16, direction: 225, directionLabel: 'SW', unit: 'mph' },
  hourlyForecast: Array.from({ length: 16 }, (_, i) => ({
    hour: 5 + i,
    windSpeed: 8 + i,
    windGust: 12 + i,
    cloudCover: 80,
    rainChance: 10,
    windDirection: 'SW',
    directionDeg: 225,
    temp: 60 + i,
  })),
}

const NWS_BY_DAY: Record<string, NwsData> = { '2026-05-06': NWS }

const MARINE: Record<string, MarineDay> = {
  '2026-05-06': {
    swell: { height: 1.4, period: 12, direction: 290, directionLabel: 'WNW', unit: 'ft' },
    waterTemp: 57.2,
    pressure: { value: 29.98, trend: 'stable', rate: 'slow', unit: 'inHg', readings: [] },
    swellHourly: [
      { hour: 8, height: 1.2, period: 11, directionLabel: 'WNW' },
      { hour: 12, height: 1.4, period: 12, directionLabel: 'WNW' },
      { hour: 16, height: 1.6, period: 13, directionLabel: 'W' },
    ],
  },
}

const SOLUNAR: SolunarData = {
  isMajorMoonDay: false,
  moon: {
    phase: 'waxing_gibbous',
    illumination: 0.72,
    rise: '4:30 PM',
    set: '3:15 AM',
    majorPeriods: [{ start: '4:00 PM', end: '5:00 PM' }],
    minorPeriods: [{ start: '10:15 AM', end: '11:15 AM' }],
  },
  sun: {
    sunrise: '6:08 AM',
    sunset: '7:52 PM',
    goldenHourMorning: '6:08 AM',
    goldenHourEvening: '7:20 PM',
  },
  inMajorPeriod: false,
  inMinorPeriod: false,
  withinHourOfPeriod: false,
} as unknown as SolunarData

describe('buildConditionsData', () => {
  it('returns fishingScore between 0 and 100', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.fishingScore).toBeGreaterThanOrEqual(0)
    expect(result.fishingScore).toBeLessThanOrEqual(100)
  })

  it('returns a scoreLabel string', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(typeof result.scoreLabel).toBe('string')
    expect(result.scoreLabel.length).toBeGreaterThan(0)
  })

  it('slices correct tide from tideByDay', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.tide).not.toBeNull()
    expect(result.tide!.phase).toBe('incoming')
  })

  it('uses NOAA pressure for today (priority over marine)', () => {
    // Mock new Date() to return the test date
    const originalDate = global.Date
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) return new originalDate('2026-05-06T14:00:00')
        return new originalDate(...args)
      }
    } as any

    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.pressure.value).toBeCloseTo(30.02, 2)

    global.Date = originalDate
  })

  it('uses marine pressure for non-today dates', () => {
    const futureDate = '2026-05-07'
    const futureNoaa: NoaaData = { ...NOAA, tideByDay: {} }
    const futureMarine: Record<string, MarineDay> = {
      '2026-05-07': { ...MARINE['2026-05-06'], pressure: { value: 29.85, trend: 'falling', rate: 'slow', unit: 'inHg', readings: [] } },
    }
    const futureNwsDay: Record<string, NwsData> = { '2026-05-07': NWS }
    const result = buildConditionsData(futureDate, futureNoaa, futureNwsDay, futureMarine, SOLUNAR, SPOT, NOW)
    expect(result.pressure.value).toBeCloseTo(29.85, 2)
  })

  it('returns 16 hourly scores (5AM to 8PM)', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.hourlyScores).toHaveLength(16)
  })

  it('includes bestWindow with start, end, score', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.bestWindow.start).toBeTruthy()
    expect(result.bestWindow.end).toBeTruthy()
    expect(result.bestWindow.score).toBeGreaterThanOrEqual(0)
  })

  it('falls back to NEUTRAL_PRESSURE when both noaa and marine pressure are null', () => {
    const noNoaa: NoaaData = { ...NOAA, pressure: null }
    const noMarine: Record<string, MarineDay> = {
      '2026-05-06': { ...MARINE['2026-05-06'], pressure: null },
    }
    const result = buildConditionsData(DATE, noNoaa, NWS_BY_DAY, noMarine, SOLUNAR, SPOT, NOW)
    expect(result.pressure.value).toBeCloseTo(29.92, 2)
  })

  it('includes airHourly with temp, rainChance, cloudCover', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.airHourly.length).toBeGreaterThan(0)
    expect(result.airHourly[0]).toHaveProperty('temp')
    expect(result.airHourly[0]).toHaveProperty('rainChance')
    expect(result.airHourly[0]).toHaveProperty('cloudCover')
  })

  it('includes windHourly with gusts and direction', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.windHourly.length).toBeGreaterThan(0)
    expect(result.windHourly[0]).toHaveProperty('gusts')
    expect(result.windHourly[0]).toHaveProperty('direction')
  })

  it('passes swellHourly from marine data to result', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.swellHourly).not.toBeNull()
    expect(result.swellHourly!.length).toBe(3)
    expect(result.swellHourly![0]).toHaveProperty('period')
  })
})
