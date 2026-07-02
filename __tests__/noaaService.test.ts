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

describe('fetchNoaaData', () => {
  it('returns null tide/wind/pressure for spot with no stationId', async () => {
    const spotNoStation = { ...SPOT, stationId: null }
    const result = await fetchNoaaData(spotNoStation)
    expect(result.tide).toBeNull()
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
    // fixture goes from 30.18 → 30.02 over several hours = falling
    expect(result.pressure?.trend).toBe('falling')
  })

  it('parses tide events with correct types', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.tide?.events.length).toBeGreaterThan(0)
    expect(['high', 'low']).toContain(result.tide?.events[0].type)
  })

  it('hourlyCurve has 24 entries', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.tide?.hourlyCurve).toHaveLength(24)
  })

  it('returns null tide when both prediction products are missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture }) // hi/lo missing
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture }) // curve missing
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => windFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(result.tide).toBeNull()
  })

  it('returns null wind when wind product is missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => predictionsFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => curveFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture }) // wind missing
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(result.wind).toBeNull()
  })

  it('requests products with lst_ldt time zone and MLLW datum on predictions', async () => {
    mockAllProducts()
    await fetchNoaaData(SPOT)
    const urls = (global.fetch as jest.Mock).mock.calls.map(c => c[0] as string)
    expect(urls).toHaveLength(5)
    for (const url of urls) {
      expect(url).toContain('time_zone=lst_ldt')
      expect(url).not.toContain('LST/LDT')
    }
    // predictions (hilo, then hourly) need datum and date=today
    expect(urls[0]).toContain('product=predictions')
    expect(urls[0]).toContain('interval=hilo')
    expect(urls[0]).toContain('datum=MLLW')
    expect(urls[0]).toContain('date=today')
    expect(urls[1]).toContain('interval=h')
    expect(urls[1]).toContain('datum=MLLW')
    // observational products use trailing ranges, never date=today
    expect(urls[2]).toContain('product=water_temperature')
    expect(urls[2]).toContain('range=2')
    expect(urls[2]).not.toContain('date=today')
    expect(urls[3]).toContain('product=wind')
    expect(urls[3]).toContain('range=2')
    expect(urls[3]).not.toContain('date=today')
    expect(urls[4]).toContain('product=air_pressure')
    expect(urls[4]).toContain('range=7')
    expect(urls[4]).not.toContain('date=today')
  })

  it('includes readings array on pressure (oldest to newest)', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(Array.isArray(result.pressure?.readings)).toBe(true)
    expect(result.pressure!.readings!.length).toBe(5)
    // oldest first: 30.18 comes before 30.02 in the fixture
    const readings = result.pressure!.readings!
    expect(readings[0]).toBeCloseTo(30.18, 2)
    expect(readings[readings.length - 1]).toBeCloseTo(30.02, 2)
  })
})
