import { buildConditionsData } from '../services/scoringService'
import type { NoaaData } from '../services/noaaService'
import type { NwsData } from '../services/nwsService'
import type { SolunarData } from '../services/solunarService'
import type { SwellData } from '../types/conditions'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const NOW = new Date('2026-05-06T14:00:00')

const NOAA: NoaaData = {
  tide: {
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
  wind: { speed: 8, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
  waterTemp: 57,
  pressure: { value: 30.02, trend: 'falling', rate: 'slow', unit: 'inHg' },
  airTemp: null,
}

const NWS: NwsData = {
  air: { temp: 62, high: 67, low: 52, humidity: 78, unit: '°F' },
  sky: { condition: 'Partly Cloudy', rainChance: 15, icon: 'partly-cloudy' },
  wind: { speed: 10, gusts: 15, direction: 225, directionLabel: 'SW', unit: 'mph' },
  hourlyForecast: [
    { hour: 5, windSpeed: 5, cloudCover: 30, rainChance: 10 },
    { hour: 14, windSpeed: 10, cloudCover: 50, rainChance: 15 },
  ],
}

const SOLUNAR: SolunarData = {
  moon: {
    phase: 'Waxing Gibbous', illumination: 78,
    majorPeriods: [{ start: '2:15 PM', end: '3:15 PM' }],
    minorPeriods: [{ start: '8:30 AM', end: '9:30 AM' }],
  },
  sun: { sunrise: '6:12 AM', sunset: '7:58 PM' },
  inMajorPeriod: true, inMinorPeriod: false, withinHourOfPeriod: false, isMajorMoonDay: false,
}

const SWELL: SwellData = {
  height: 4.5, period: 12, direction: 290, directionLabel: 'WNW', unit: 'ft',
}

describe('buildConditionsData', () => {
  it('returns a valid ConditionsData shape', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result).toHaveProperty('fishingScore')
    expect(result).toHaveProperty('scoreLabel')
    expect(result).toHaveProperty('bestWindow')
    expect(result).toHaveProperty('hourlyScores')
    expect(result).toHaveProperty('tide')
    expect(result).toHaveProperty('wind')
    expect(result).toHaveProperty('pressure')
    expect(result).toHaveProperty('moon')
    expect(result).toHaveProperty('sun')
  })

  it('fishing score is between 0 and 100', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.fishingScore).toBeGreaterThanOrEqual(0)
    expect(result.fishingScore).toBeLessThanOrEqual(100)
  })

  it('returns null tide when NOAA tide is null', () => {
    const noaaNullTide = { ...NOAA, tide: null }
    const result = buildConditionsData(noaaNullTide, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.tide).toBeNull()
  })

  it('uses NWS wind when NOAA wind is null', () => {
    const noaaNullWind = { ...NOAA, wind: null }
    const result = buildConditionsData(noaaNullWind, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.wind.speed).toBe(NWS.wind.speed)
  })

  it('uses neutral fallback when both NOAA and NWS are null', () => {
    const result = buildConditionsData(null, null, null, SOLUNAR, SPOT, NOW)
    expect(result.fishingScore).toBeGreaterThanOrEqual(0)
    expect(result.fishingScore).toBeLessThanOrEqual(100)
  })

  it('hourlyScores covers hours 5 through 20', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.hourlyScores).toHaveLength(16)
    expect(result.hourlyScores[0].hour).toBe('5AM')
    expect(result.hourlyScores[15].hour).toBe('8PM')
  })

  it('bestWindow score is the highest 3-hour average', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.bestWindow.score).toBeGreaterThanOrEqual(0)
    expect(result.bestWindow.start).toBeTruthy()
    expect(result.bestWindow.end).toBeTruthy()
  })

  it('passes moon and sun from solunar', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.moon.phase).toBe('Waxing Gibbous')
    expect(result.sun.sunrise).toBe('6:12 AM')
  })
})
