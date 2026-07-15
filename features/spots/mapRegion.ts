export interface MapRegion {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

const DEFAULT_REGION: MapRegion = { latitude: 38.33, longitude: -123.05, latitudeDelta: 0.5, longitudeDelta: 0.5 }
// Bounding box multiplier so pins land with breathing room instead of flush
// against the map's edges, and a floor so a single spot (zero-width box)
// still gets a sensible, not maximally-zoomed-in, initial region.
const PAD = 1.4
const MIN_DELTA = 0.08

export function regionForSpots(spots: { lat: number; lng: number }[]): MapRegion {
  if (spots.length === 0) return DEFAULT_REGION

  const lats = spots.map(s => s.lat)
  const lngs = spots.map(s => s.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PAD, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * PAD, MIN_DELTA),
  }
}

// Beyond this latitudeDelta (roughly: a viewport spanning more than ~35
// miles north-south), pins are close enough together on a real map that
// full score badges overlap and become unreadable — shrink them to plain
// dots until the user zooms back in.
const ZOOMED_OUT_THRESHOLD = 0.5

export function isZoomedOut(latitudeDelta: number): boolean {
  return latitudeDelta > ZOOMED_OUT_THRESHOLD
}
