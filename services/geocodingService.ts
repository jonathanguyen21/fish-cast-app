import * as Location from 'expo-location'

// A dropped pin's exact coordinates rarely line up with a city center, so a
// bare city name ("San Francisco") reads as vague. Prefer the reverse-geocode
// result's most specific placemark (a named POI, or a street address) paired
// with the city, e.g. "Ocean Beach, San Francisco".
export async function resolveLocationName(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
    const place = results[0]
    if (!place) return null

    const city = place.city || place.subregion || place.region || null
    const specific = place.name
      || (place.streetNumber && place.street ? `${place.streetNumber} ${place.street}` : place.street)
      || null

    if (specific && city && specific !== city) return `${specific}, ${city}`
    return specific || city
  } catch {
    return null
  }
}
