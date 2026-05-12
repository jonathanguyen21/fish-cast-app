import { fetchNoaaData } from '../services/noaaService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const predictionsFixture = require('./fixtures/noaaPredictions.json')
const curveFixture = require('./fixtures/noaaHourlyCurve.json')
const tempFixture = require('./fixtures/noaaWaterTemp.json')
const windFixture = require('./fixtures/noaaWind.json')
const pressureFixture = require('./fixtures/noaaAirPressure.json')
const missingFixture = require('./fixtures/noaaMissingProduct.json')

function mockAllProducts() {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => predictionsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => curveFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => windFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
}

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

const FIXTURE_DATE = '2026-05-06'

describe('fetchNoaaData', () => {
  it('returns empty tideByDay/wind/pressure for spot with no stationId', async () => {
    const spotNoStation = { ...SPOT, stationId: null }
    const result = await fetchNoaaData(spotNoStation)
    expect(result.tideByDay).toEqual({})
    expect(result.wind).toBeNull()
    expect(result.pressure).toBeNull()
    expect(result.waterTemp).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('parses wind speed, direction, and gusts', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.wind?.speed).toBeCloseTo(8.4, 1)
    expect(result.wind?.gusts).toBeCloseTo(14.0, 1)
    expect(result.wind?.directionLabel).toBe('SW')
    expect(result.wind?.unit).toBe('mph')
  })

  it('parses water temperature', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.waterTemp).toBeCloseTo(57.2, 1)
  })

  it('parses pressure value', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.pressure?.value).toBeCloseTo(30.02, 2)
    expect(result.pressure?.unit).toBe('inHg')
  })

  it('detects falling pressure trend from fixture', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.pressure?.trend).toBe('falling')
  })

  it('parses tide events keyed by day', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    const day = result.tideByDay[FIXTURE_DATE]
    expect(day).not.toBeNull()
    expect(day!.events.length).toBeGreaterThan(0)
    expect(['high', 'low']).toContain(day!.events[0].type)
  })

  it('hourlyCurve for day has 24 entries', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.tideByDay[FIXTURE_DATE]?.hourlyCurve).toHaveLength(24)
  })

  it('returns null entry for day when both prediction products are missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => windFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(Object.keys(result.tideByDay)).toHaveLength(0)
  })

  it('returns null wind when wind product is missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => predictionsFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => curveFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(result.wind).toBeNull()
  })

  it('includes readings array on pressure (oldest to newest)', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(Array.isArray(result.pressure?.readings)).toBe(true)
    expect(result.pressure!.readings!.length).toBe(5)
    const readings = result.pressure!.readings!
    expect(readings[0]).toBeCloseTo(30.18, 2)
    expect(readings[readings.length - 1]).toBeCloseTo(30.02, 2)
  })
})
