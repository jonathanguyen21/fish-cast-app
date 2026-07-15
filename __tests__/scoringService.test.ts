import { buildConditionsData } from '../services/scoringService'
import type { NoaaData } from '../services/noaaService'
import type { NwsData } from '../services/nwsService'
import type { SolunarData } from '../services/solunarService'
import type { MarineDay } from '../services/marineService'
import type { Spot } from '../types/spot'
import type { TidePhase } from '../features/tide/tideUtils'

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
    windHourly: [],
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
        super()
        if (args.length === 0) return new originalDate('2026-05-06T14:00:00')
        return new originalDate(...(args as []))
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

  it('returns 24 hourly scores with hourIndex (12AM to 11PM)', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.hourlyScores).toHaveLength(24)
    expect(result.hourlyScores[0].hour).toBe('12AM')
    expect(result.hourlyScores[0].hourIndex).toBe(0)
    expect(result.hourlyScores[23].hour).toBe('11PM')
    expect(result.hourlyScores[23].hourIndex).toBe(23)
  })

  it('includes bestWindow with start, end, score', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.bestWindow.start).toBeTruthy()
    expect(result.bestWindow.end).toBeTruthy()
    expect(result.bestWindow.score).toBeGreaterThanOrEqual(0)
  })

  it('scans the whole day for bestWindow on non-today dates (no passed flag)', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.bestWindow.passed).toBeUndefined()
  })

  describe('future-aware best window when viewing today', () => {
    const d = new Date()
    const TODAY = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const noaaToday: NoaaData = { ...NOAA, tideByDay: { [TODAY]: NOAA.tideByDay!['2026-05-06'] } }
    const nwsToday: Record<string, NwsData> = { [TODAY]: NWS }
    const marineToday: Record<string, MarineDay> = { [TODAY]: MARINE['2026-05-06'] }

    const parseStart = (start: string): number => {
      const m = start.match(/(\d+):00 (AM|PM)/)!
      let h = parseInt(m[1], 10)
      if (m[2] === 'PM' && h !== 12) h += 12
      if (m[2] === 'AM' && h === 12) h = 0
      return h
    }

    it('bestWindow starts at or after the current hour', () => {
      const at2pm = new Date()
      at2pm.setHours(14, 0, 0, 0)
      const result = buildConditionsData(TODAY, noaaToday, nwsToday, marineToday, SOLUNAR, SPOT, at2pm)
      expect(result.bestWindow.passed).toBeUndefined()
      expect(parseStart(result.bestWindow.start)).toBeGreaterThanOrEqual(14)
    })

    it('flags bestWindow as passed late at night and reports the day peak', () => {
      const at11pm = new Date()
      at11pm.setHours(23, 0, 0, 0)
      const result = buildConditionsData(TODAY, noaaToday, nwsToday, marineToday, SOLUNAR, SPOT, at11pm)
      expect(result.bestWindow.passed).toBe(true)
      expect(result.bestWindow.score).toBeGreaterThan(0)
    })
  })

  it('marks water temp as estimated when neither NOAA nor marine provide it', () => {
    const noNoaa: NoaaData = { ...NOAA, waterTemp: null }
    const noMarine: Record<string, MarineDay> = {
      '2026-05-06': { ...MARINE['2026-05-06'], waterTemp: null },
    }
    const result = buildConditionsData(DATE, noNoaa, NWS_BY_DAY, noMarine, SOLUNAR, SPOT, NOW)
    expect(result.water.estimated).toBe(true)
    expect(result.water.temp).toBe(65) // saltwater fallback
  })

  it('marks water temp as real when a live source provides it', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.water.estimated).toBe(false)
    expect(result.water.temp).toBeCloseTo(57.2, 1)
  })

  it('uses the freshwater fallback and marks it estimated for freshwater spots with no data', () => {
    const freshwaterSpot: Spot = {
      id: 'spot_fw', name: 'Lake Tahoe', lat: 39.10, lng: -120.04,
      type: 'freshwater', stationId: null, region: 'west_coast',
    }
    const result = buildConditionsData(DATE, null, NWS_BY_DAY, null, SOLUNAR, freshwaterSpot, NOW)
    expect(result.water.estimated).toBe(true)
    expect(result.water.temp).toBe(68)
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

  it('covers all 24 hours in airHourly, backfilling hours before NWS’ first period', () => {
    // NWS's own fixture only reports hours 5-20 (hourlyForecast starts at
    // hour 5). Hours before that have no real NWS reading, but bite-curve
    // scrubbing spans the whole day, so airHourly must still have an entry
    // for e.g. hour 0 - cloned from the first real period - rather than
    // being missing entirely (which silently broke the weather-scrub
    // preview for any hour before "now").
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.airHourly).toHaveLength(24)
    const hours = result.airHourly.map(h => h.hour)
    expect(hours).toEqual(Array.from({ length: 24 }, (_, i) => i))
    const hourZero = result.airHourly.find(h => h.hour === 0)
    expect(hourZero).toEqual({ hour: 0, temp: 60, rainChance: 10, cloudCover: 80 })
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

  it('populates tidePhasesByHour with all 24 hours for saltwater', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    const keys = Object.keys(result.tidePhasesByHour).map(Number).sort((a, b) => a - b)
    expect(keys).toEqual(Array.from({ length: 24 }, (_, i) => i))
    for (const phase of Object.values(result.tidePhasesByHour)) {
      expect(['incoming', 'outgoing', 'slack']).toContain(phase)
    }
  })

  it('populates tidePhasesByHour with all slack for freshwater', () => {
    const freshwaterSpot: Spot = {
      id: 'spot_fw', name: 'Lake Tahoe', lat: 39.10, lng: -120.04,
      type: 'freshwater', stationId: null, region: 'west_coast',
    }
    const result = buildConditionsData(DATE, null, NWS_BY_DAY, null, SOLUNAR, freshwaterSpot, NOW)
    for (const phase of Object.values(result.tidePhasesByHour)) {
      expect(phase).toBe('slack')
    }
  })

  it('includes scoreBreakdown with all 6 factors', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    expect(result.scoreBreakdown).toHaveProperty('pressure')
    expect(result.scoreBreakdown).toHaveProperty('solunar')
    expect(result.scoreBreakdown).toHaveProperty('tide')
    expect(result.scoreBreakdown).toHaveProperty('wind')
    expect(result.scoreBreakdown).toHaveProperty('waterTemp')
    expect(result.scoreBreakdown).toHaveProperty('sky')
  })

  it('scoreBreakdown tide is 0 for freshwater spot', () => {
    const freshwaterSpot: Spot = {
      id: 'spot_fw', name: 'Lake Tahoe', lat: 39.10, lng: -120.04,
      type: 'freshwater', stationId: null, region: 'west_coast',
    }
    const result = buildConditionsData(DATE, null, NWS_BY_DAY, null, SOLUNAR, freshwaterSpot, NOW)
    expect(result.scoreBreakdown.tide).toBe(0)
  })

  it('scoreBreakdown values sum to a plausible range', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    const { pressure, solunar, tide, wind, waterTemp, sky } = result.scoreBreakdown
    const sum = pressure + solunar + tide + wind + waterTemp + sky
    expect(sum).toBeGreaterThan(0)
    expect(sum).toBeLessThanOrEqual(100)
  })
})
