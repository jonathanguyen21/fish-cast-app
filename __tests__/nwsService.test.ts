import { fetchNwsData } from '../services/nwsService'
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
})
