import { buildForecastDays, fetchForecast } from '../services/forecastService'
import { fetchNwsData } from '../services/nwsService'
import { fetchTideWeek } from '../services/noaaService'
import type { NwsData } from '../services/nwsService'
import type { TideWeek } from '../services/noaaService'
import type { Spot } from '../types/spot'

jest.mock('../services/nwsService')
jest.mock('../services/noaaService')

const mockFetchNwsData = fetchNwsData as jest.MockedFunction<typeof fetchNwsData>
const mockFetchTideWeek = fetchTideWeek as jest.MockedFunction<typeof fetchTideWeek>

const SALT_SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}
const FRESH_SPOT: Spot = { ...SALT_SPOT, id: 'spot_2', type: 'freshwater', stationId: null }

const NOW = new Date('2026-07-01T08:00:00')

function hourEpoch(dayOffset: number, hour: number): number {
  const d = new Date(NOW)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}

// 48 hours of NWS coverage (days 0–1 only, like a short NWS response)
const NWS: NwsData = {
  air: { temp: 62, high: 67, low: 52, humidity: 78, unit: '°F' },
  sky: { condition: 'Partly Cloudy', rainChance: 15, icon: 'partly-cloudy' },
  wind: { speed: 10, gusts: 15, direction: 225, directionLabel: 'SW', unit: 'mph' },
  hourlyForecast: Array.from({ length: 48 }, (_, i) => ({
    hour: i % 24,
    epochMs: hourEpoch(Math.floor(i / 24), i % 24),
    windSpeed: 8,
    cloudCover: 50,
    rainChance: 10,
    windDirection: 'SW',
  })),
}

function dateKey(dayOffset: number): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() + dayOffset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TIDE_WEEK: TideWeek = {
  curvesByDate: Object.fromEntries(
    Array.from({ length: 7 }, (_, d) => [
      dateKey(d),
      Array.from({ length: 24 }, (_, h) => 2 + 2 * Math.sin((h / 24) * Math.PI * 4)),
    ])
  ),
  eventsByDate: {
    [dateKey(0)]: [{ type: 'high', time: '4:12 AM', height: 5.1 }],
  },
}

describe('buildForecastDays', () => {
  it('returns 7 days, first labeled Today', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days).toHaveLength(7)
    expect(days[0].dayLabel).toBe('Today')
    expect(days[0].date).toBe(dateKey(0))
    expect(days[1].dayLabel).not.toBe('Today')
  })

  it('every day has 24 hourly scores in 0–100', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    for (const day of days) {
      expect(day.hourlyScores).toHaveLength(24)
      for (const h of day.hourlyScores) {
        expect(h.score).toBeGreaterThanOrEqual(0)
        expect(h.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('days beyond NWS coverage still produce scores (neutral weather fill)', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days[6].peakScore).toBeGreaterThan(0)
    expect(days[6].peakWindow.start).toBeTruthy()
  })

  it('freshwater spots work without tide data', () => {
    const days = buildForecastDays(NWS, null, FRESH_SPOT, NOW)
    expect(days).toHaveLength(7)
    expect(days[0].tideEvents).toEqual([])
    expect(days[0].peakScore).toBeGreaterThan(0)
  })

  it('passes tide events through for matching dates', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days[0].tideEvents).toHaveLength(1)
    expect(days[0].tideEvents[0].type).toBe('high')
    expect(days[1].tideEvents).toEqual([])
  })

  it('includes sunrise/sunset per day', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days[0].sun.sunrise).toMatch(/\d+:\d{2} (AM|PM)/)
    expect(days[3].sun.sunset).toMatch(/\d+:\d{2} (AM|PM)/)
  })

  it('includes solunar major/minor period data per day', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days[0].moon.phase).toBeTruthy()
    expect(typeof days[0].moon.illumination).toBe('number')
    expect(Array.isArray(days[0].moon.majorPeriods)).toBe(true)
    expect(Array.isArray(days[0].moon.minorPeriods)).toBe(true)
    expect(days[3].moon.phase).toBeTruthy()
  })
})

describe('fetchForecast', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('rejects when both NWS and NOAA sources fail', async () => {
    mockFetchNwsData.mockRejectedValue(new Error('network down'))
    mockFetchTideWeek.mockRejectedValue(new Error('network down'))
    await expect(fetchForecast(SALT_SPOT)).rejects.toThrow()
  })

  it('does not reject when only one source fails (partial data)', async () => {
    mockFetchNwsData.mockRejectedValue(new Error('network down'))
    mockFetchTideWeek.mockResolvedValue(TIDE_WEEK)
    const days = await fetchForecast(SALT_SPOT)
    expect(days).toHaveLength(7)
  })

  it('does not reject for a freshwater spot when NWS succeeds (no tide fetch attempted)', async () => {
    mockFetchNwsData.mockResolvedValue(NWS)
    const days = await fetchForecast(FRESH_SPOT)
    expect(days).toHaveLength(7)
    expect(mockFetchTideWeek).not.toHaveBeenCalled()
  })

  it('rejects for a freshwater spot when NWS also fails', async () => {
    mockFetchNwsData.mockRejectedValue(new Error('network down'))
    await expect(fetchForecast(FRESH_SPOT)).rejects.toThrow()
  })
})
