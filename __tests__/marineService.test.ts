import { fetchMarineData } from '../services/marineService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const marineFixture = require('./fixtures/openMeteoMarine.json')

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

describe('fetchMarineData', () => {
  it('returns SwellData with height, period, direction', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => marineFixture,
    })
    const result = await fetchMarineData(SPOT)
    expect(result).not.toBeNull()
    expect(result!.height).toBeGreaterThan(0)
    expect(result!.period).toBeGreaterThan(0)
    expect(result!.direction).toBeGreaterThanOrEqual(0)
    expect(result!.unit).toBe('ft')
  })

  it('returns null when all wave heights are 0', async () => {
    const zeroFixture = {
      hourly: {
        time: marineFixture.hourly.time,
        wave_height: new Array(24).fill(0),
        wave_period: new Array(24).fill(0),
        wave_direction: new Array(24).fill(0),
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => zeroFixture,
    })
    const result = await fetchMarineData(SPOT)
    expect(result).toBeNull()
  })

  it('returns null on fetch error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 })
    const result = await fetchMarineData(SPOT)
    expect(result).toBeNull()
  })

  it('returns directionLabel string', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => marineFixture,
    })
    const result = await fetchMarineData(SPOT)
    expect(typeof result!.directionLabel).toBe('string')
    expect(result!.directionLabel.length).toBeGreaterThan(0)
  })
})
