import { resolveLocationName } from '../services/geocodingService'
import * as Location from 'expo-location'

jest.mock('expo-location')

describe('resolveLocationName', () => {
  afterEach(() => jest.resetAllMocks())

  it('combines a placemark name with the city when both are available and distinct', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: 'Ocean Beach', city: 'San Francisco', subregion: null, region: 'California', street: null, streetNumber: null },
    ])
    const result = await resolveLocationName(37.76, -122.51)
    expect(result).toBe('Ocean Beach, San Francisco')
  })

  it('combines a street number + street with the city when no placemark name is available', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: null, city: 'Pacifica', subregion: null, region: 'California', street: 'Highway 1', streetNumber: '100' },
    ])
    const result = await resolveLocationName(37.6355, -122.4939)
    expect(result).toBe('100 Highway 1, Pacifica')
  })

  it('falls back to street alone with the city when no street number is available', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: null, city: 'Pacifica', subregion: null, region: 'California', street: 'Highway 1', streetNumber: null },
    ])
    const result = await resolveLocationName(37.6355, -122.4939)
    expect(result).toBe('Highway 1, Pacifica')
  })

  it('does not duplicate the city when the placemark name equals the city', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: 'Pacifica', city: 'Pacifica', subregion: null, region: 'California', street: null, streetNumber: null },
    ])
    const result = await resolveLocationName(37.6355, -122.4939)
    expect(result).toBe('Pacifica')
  })

  it('falls back to just the city when no specific placemark or street is available', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: null, city: 'Pacifica', subregion: 'San Mateo County', region: 'California', street: null, streetNumber: null },
    ])
    const result = await resolveLocationName(37.6355, -122.4939)
    expect(result).toBe('Pacifica')
  })

  it('falls back to subregion when city is missing', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: null, city: null, subregion: 'Marin County', region: 'California', street: null, streetNumber: null },
    ])
    const result = await resolveLocationName(38.0, -122.7)
    expect(result).toBe('Marin County')
  })

  it('falls back to region when city and subregion are both missing', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: null, city: null, subregion: null, region: 'California', street: null, streetNumber: null },
    ])
    const result = await resolveLocationName(38.0, -122.7)
    expect(result).toBe('California')
  })

  it('returns just the specific placemark name when no city-level info exists at all', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([
      { name: 'Remote Lighthouse', city: null, subregion: null, region: null, street: null, streetNumber: null },
    ])
    const result = await resolveLocationName(38.0, -122.7)
    expect(result).toBe('Remote Lighthouse')
  })

  it('returns null when reverse geocoding returns an empty array', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([])
    const result = await resolveLocationName(0, 0)
    expect(result).toBeNull()
  })

  it('returns null (never throws) when reverse geocoding rejects', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockRejectedValue(new Error('no network'))
    const result = await resolveLocationName(37.6, -122.5)
    expect(result).toBeNull()
  })
})
