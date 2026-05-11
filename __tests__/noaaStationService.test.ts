import { resolveNearestStation, haversineKm, getNearbyStations } from '../services/noaaStationService'

const stationsFixture = require('./fixtures/noaaStations.json')

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm(37.99, -122.97, 37.99, -122.97)).toBeCloseTo(0, 1)
  })

  it('returns ~591km between SF and LA tide gauge coords', () => {
    expect(haversineKm(37.8063, -122.4659, 33.72, -118.272)).toBeCloseTo(591, -1)
  })
})

describe('resolveNearestStation', () => {
  it('returns nearest station id for Bodega Bay coords', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => stationsFixture,
    })
    // Bodega Bay is closest to Point Reyes (9415020) in the fixture
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBe('9415020')
  })

  it('returns null for empty station list', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => ({ stations: [] }),
    })
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBeNull()
  })

  it('returns null when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBeNull()
  })

  it('returns null when nearest station is over 200km away', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stations: [{ id: 'far', name: 'Far Away', lat: '48.0', lng: '-105.0' }],
      }),
    })
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBeNull()
  })
})

describe('getNearbyStations', () => {
  it('returns stations sorted by distance within radius', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => stationsFixture,
    })
    const results = await getNearbyStations(37.8, -122.4, 150)
    expect(Array.isArray(results)).toBe(true)
    results.forEach(s => {
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('name')
      expect(s).toHaveProperty('lat')
      expect(s).toHaveProperty('lng')
    })
    if (results.length >= 2) {
      const d0 = haversineKm(37.8, -122.4, results[0].lat, results[0].lng)
      const d1 = haversineKm(37.8, -122.4, results[1].lat, results[1].lng)
      expect(d0).toBeLessThanOrEqual(d1)
    }
  })

  it('caps results at 20 stations', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => stationsFixture,
    })
    const results = await getNearbyStations(37.8, -122.4, 10000)
    expect(results.length).toBeLessThanOrEqual(20)
  })

  it('returns empty array on fetch failure', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getNearbyStations(37.8, -122.4)
    expect(results).toEqual([])
  })
})
