import { resolveCityName } from '../services/geocodingService'
import * as Location from 'expo-location'

jest.mock('expo-location')

describe('resolveCityName', () => {
  afterEach(() => jest.resetAllMocks())

  it('returns the city when reverse geocoding succeeds', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { city: 'Pacifica', subregion: 'San Mateo County', region: 'California' },
    ])
    const result = await resolveCityName(37.6355, -122.4939)
    expect(result).toBe('Pacifica')
  })

  it('falls back to subregion when city is missing', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { city: null, subregion: 'Marin County', region: 'California' },
    ])
    const result = await resolveCityName(38.0, -122.7)
    expect(result).toBe('Marin County')
  })

  it('falls back to region when city and subregion are both missing', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { city: null, subregion: null, region: 'California' },
    ])
    const result = await resolveCityName(38.0, -122.7)
    expect(result).toBe('California')
  })

  it('returns null when reverse geocoding returns an empty array', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([])
    const result = await resolveCityName(0, 0)
    expect(result).toBeNull()
  })

  it('returns null (never throws) when reverse geocoding rejects', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(new Error('no network'))
    const result = await resolveCityName(37.6, -122.5)
    expect(result).toBeNull()
  })
})
