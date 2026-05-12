import { fetchMarineData } from '../services/marineService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const marineFixture = require('./fixtures/openMeteoMarine.json')

const weatherFixture = {
  hourly: {
    time: marineFixture.hourly.time,
    surface_pressure: new Array(24).fill(1013.0),
  },
}

function mockBothFetches(marineJson = marineFixture, weatherJson = weatherFixture) {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => marineJson })
    .mockResolvedValueOnce({ ok: true, json: async () => weatherJson })
}

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

const FIXTURE_DATE = '2026-05-06'

describe('fetchMarineData', () => {
  it('returns a day map with swell data', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    expect(result).not.toBeNull()
    const day = result![FIXTURE_DATE]
    expect(day.swell).not.toBeNull()
    expect(day.swell!.height).toBeGreaterThan(0)
    expect(day.swell!.period).toBeGreaterThan(0)
    expect(day.swell!.unit).toBe('ft')
  })

  it('returns waterTemp in °F (converted from °C)', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    const day = result![FIXTURE_DATE]
    // fixture has ~14°C at noon → ~57°F
    expect(day.waterTemp).not.toBeNull()
    expect(day.waterTemp!).toBeGreaterThan(50)
    expect(day.waterTemp!).toBeLessThan(70)
  })

  it('returns pressure derived from surface_pressure', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    const day = result![FIXTURE_DATE]
    expect(day.pressure).not.toBeNull()
    expect(day.pressure!.unit).toBe('inHg')
    expect(day.pressure!.value).toBeGreaterThan(29)
    expect(day.pressure!.value).toBeLessThan(31)
  })

  it('returns null when marine fetch fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: true, json: async () => weatherFixture })
    const result = await fetchMarineData(SPOT)
    expect(result).toBeNull()
  })

  it('returns directionLabel string', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    const day = result![FIXTURE_DATE]
    expect(typeof day.swell!.directionLabel).toBe('string')
    expect(day.swell!.directionLabel.length).toBeGreaterThan(0)
  })
})
