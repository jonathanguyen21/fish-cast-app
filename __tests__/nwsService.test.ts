import { fetchNwsData } from '../services/nwsService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const pointsFixture = require('./fixtures/nwsPoints.json')
const hourlyFixture = require('./fixtures/nwsHourlyForecast.json')

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

function mockNws() {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => pointsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => hourlyFixture })
}

describe('fetchNwsData', () => {
  it('returns air temp from current period', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.air.temp).toBeGreaterThan(0)
  })

  it('returns wind data', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.wind.speed).toBeGreaterThanOrEqual(0)
    expect(result.wind.unit).toBe('mph')
  })

  it('returns sky data with valid icon', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(['clear', 'partly-cloudy', 'overcast', 'light-rain', 'heavy-rain']).toContain(result.sky.icon)
  })

  it('maps Partly Cloudy shortForecast to partly-cloudy icon', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    // First period in fixture is "Partly Cloudy"
    expect(result.sky.icon).toBe('partly-cloudy')
  })

  it('returns hourlyForecast array', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(Array.isArray(result.hourlyForecast)).toBe(true)
    expect(result.hourlyForecast.length).toBeGreaterThan(0)
  })

  it('throws when points endpoint returns 404', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(fetchNwsData(SPOT)).rejects.toThrow()
  })

  it('includes windDirection in each hourlyForecast item', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.hourlyForecast[0]).toHaveProperty('windDirection')
    expect(result.hourlyForecast[0].windDirection).toBe('SW')
  })
})
