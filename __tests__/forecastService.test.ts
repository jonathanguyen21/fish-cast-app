import { fetchForecast } from '../services/forecastService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const FRESHWATER_SPOT: Spot = {
  id: 'spot_fw', name: 'Lake Tahoe', lat: 39.10, lng: -120.04,
  type: 'freshwater', stationId: null, region: 'west_coast',
}

const pointsFixture = require('./fixtures/nwsPoints.json')
const dailyFixture = require('./fixtures/nwsDailyForecast.json')

function mockFetch() {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => pointsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => dailyFixture })
}

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

describe('fetchForecast', () => {
  it('returns 7 DayForecast entries for 7 daytime periods', async () => {
    mockFetch()
    const result = await fetchForecast(SPOT)
    expect(result).toHaveLength(7)
  })

  it('each entry has required fields', async () => {
    mockFetch()
    const result = await fetchForecast(SPOT)
    for (const day of result) {
      expect(typeof day.date).toBe('string')
      expect(typeof day.dayLabel).toBe('string')
      expect(day.peakScore).toBeGreaterThanOrEqual(0)
      expect(day.peakScore).toBeLessThanOrEqual(100)
      expect(typeof day.scoreLabel).toBe('string')
      expect(day.peakWindow.start).toBeTruthy()
      expect(day.peakWindow.end).toBeTruthy()
    }
  })

  it('skyIcon is one of the valid values', async () => {
    mockFetch()
    const result = await fetchForecast(SPOT)
    const valid = ['clear', 'partly-cloudy', 'overcast', 'light-rain', 'heavy-rain']
    for (const day of result) {
      expect(valid).toContain(day.skyIcon)
    }
  })

  it('includes rainChance from forecast data', async () => {
    mockFetch()
    const result = await fetchForecast(SPOT)
    const rainyDay = result.find(d => (d.rainChance ?? 0) > 0)
    expect(rainyDay).toBeDefined()
  })

  it('heavy rain day (85% precipitation) maps to heavy-rain icon', async () => {
    mockFetch()
    const result = await fetchForecast(SPOT)
    const saturdayIdx = result.findIndex(d => d.date === '2026-05-09')
    if (saturdayIdx >= 0) {
      expect(result[saturdayIdx].skyIcon).toBe('heavy-rain')
    }
  })

  it('returns empty array on HTTP error', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    const result = await fetchForecast(SPOT)
    expect(result).toEqual([])
  })

  it('returns empty array on network failure', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'))
    const result = await fetchForecast(SPOT)
    expect(result).toEqual([])
  })

  it('works for freshwater spots (no tide factor)', async () => {
    mockFetch()
    const result = await fetchForecast(FRESHWATER_SPOT)
    expect(result.length).toBeGreaterThan(0)
    for (const day of result) {
      expect(day.peakScore).toBeGreaterThanOrEqual(0)
      expect(day.peakScore).toBeLessThanOrEqual(100)
    }
  })
})
