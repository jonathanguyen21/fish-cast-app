import { fetchNwsData, shortForecastToCloudCover } from '../services/nwsService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const pointsFixture = require('./fixtures/nwsPoints.json')
const hourlyFixture = require('./fixtures/nwsHourly.json')

function mockNws() {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => pointsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => hourlyFixture })
}

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

describe('fetchNwsData', () => {
  it('returns today sky condition', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(['Clear','Partly Cloudy','Overcast','Light Rain','Heavy Rain']).toContain(result.today.sky.condition)
  })

  it('returns today wind with speed and unit', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.today.wind.speed).toBeGreaterThanOrEqual(0)
    expect(result.today.wind.unit).toBe('mph')
  })

  it('returns today air temps with high > low', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.today.air.high).toBeGreaterThanOrEqual(result.today.air.low)
  })

  it('returns hourlyForecast array on today', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(Array.isArray(result.today.hourlyForecast)).toBe(true)
    expect(result.today.hourlyForecast.length).toBeGreaterThan(0)
  })

  it('returns byDay map with at least one date entry', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(typeof result.byDay).toBe('object')
    expect(Object.keys(result.byDay).length).toBeGreaterThan(0)
  })

  it('throws on non-ok HTTP response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(fetchNwsData(SPOT)).rejects.toThrow('NWS points failed')
  })

  it('uses windGust field when present instead of windSpeed + 5', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    // Period 2 in the fixture has windSpeed "12 mph" and windGust "15 mph"
    const periodWithGust = result.today.hourlyForecast.find(h => h.windSpeed === 12)
    expect(periodWithGust).toBeDefined()
    expect(periodWithGust!.windGust).toBe(15)
  })
})

describe('shortForecastToCloudCover', () => {
  it('returns 90 for Overcast', () => expect(shortForecastToCloudCover('Overcast')).toBe(90))
  it('returns 75 for Mostly Cloudy', () => expect(shortForecastToCloudCover('Mostly Cloudy')).toBe(75))
  it('returns 40 for Partly Cloudy', () => expect(shortForecastToCloudCover('Partly Cloudy')).toBe(40))
  it('returns 20 for Mostly Clear', () => expect(shortForecastToCloudCover('Mostly Clear')).toBe(20))
  it('returns 60 for Cloudy', () => expect(shortForecastToCloudCover('Cloudy')).toBe(60))
  it('returns 10 for Clear', () => expect(shortForecastToCloudCover('Clear')).toBe(10))
})
