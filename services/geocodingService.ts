import * as Location from 'expo-location'

export async function resolveCityName(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
    const place = results[0]
    return place?.city || place?.subregion || place?.region || null
  } catch {
    return null
  }
}
