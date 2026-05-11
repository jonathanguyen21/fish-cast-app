const STATION_LIST_URL =
  'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels'
const MAX_DISTANCE_KM = 200

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function resolveNearestStation(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(STATION_LIST_URL)
    if (!res.ok) return null
    const { stations } = await res.json()
    if (!stations?.length) return null

    let bestId: string | null = null
    let bestDist = Infinity

    for (const s of stations) {
      const sLat = parseFloat(s.lat)
      const sLng = parseFloat(s.lng)
      if (isNaN(sLat) || isNaN(sLng)) continue
      if (!s.id) continue
      const dist = haversineKm(lat, lng, sLat, sLng)
      if (dist < bestDist) {
        bestDist = dist
        bestId = s.id
      }
    }

    return bestDist <= MAX_DISTANCE_KM ? bestId : null
  } catch {
    return null
  }
}

export interface NearbyStation {
  id: string
  name: string
  lat: number
  lng: number
}

export async function getNearbyStations(
  lat: number,
  lng: number,
  radiusKm = 150
): Promise<NearbyStation[]> {
  try {
    const res = await fetch(STATION_LIST_URL)
    if (!res.ok) return []
    const { stations } = await res.json()
    if (!stations?.length) return []

    const nearby: Array<NearbyStation & { dist: number }> = []

    for (const s of stations) {
      const sLat = parseFloat(s.lat)
      const sLng = parseFloat(s.lng)
      if (isNaN(sLat) || isNaN(sLng) || !s.id || !s.name) continue
      const dist = haversineKm(lat, lng, sLat, sLng)
      if (dist <= radiusKm) {
        nearby.push({ id: s.id, name: s.name, lat: sLat, lng: sLng, dist })
      }
    }

    return nearby
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20)
      .map(({ dist: _dist, ...station }) => station)
  } catch {
    return []
  }
}
