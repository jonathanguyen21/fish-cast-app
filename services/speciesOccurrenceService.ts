import type { Spot } from '../types/spot'
import type { Species } from '../types/species'

export type AbundanceTier = 'common' | 'occasional' | 'rare' | 'not-recorded'

const RADIUS_KM = 40
const KM_PER_DEGREE_LAT = 111

function bbox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT
  const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180))
  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lngMin: lng - lngDelta,
    lngMax: lng + lngDelta,
  }
}

async function fetchObisChecklist(lat: number, lng: number): Promise<Map<string, number>> {
  const { latMin, latMax, lngMin, lngMax } = bbox(lat, lng, RADIUS_KM)
  const polygon =
    `POLYGON((${lngMin} ${latMin},${lngMax} ${latMin},${lngMax} ${latMax},${lngMin} ${latMax},${lngMin} ${latMin}))`
  const url = `https://api.obis.org/v3/checklist?geometry=${encodeURIComponent(polygon)}&size=1000`
  // Note: intentionally no internal try/catch here — an OBIS failure (non-OK
  // response or network error) must propagate to fetchLocalAbundance's outer
  // catch so the whole call resolves to {} (a full-checklist outage shouldn't
  // masquerade as "we checked and none of these species are recorded").
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OBIS checklist request failed: ${res.status}`)
  const json = await res.json()
  const results: { scientificName?: string; records?: number }[] = json?.results ?? []
  const map = new Map<string, number>()
  for (const r of results) {
    if (r.scientificName && typeof r.records === 'number') {
      map.set(r.scientificName, r.records)
    }
  }
  return map
}

async function fetchGbifCount(lat: number, lng: number, scientificName: string): Promise<number> {
  const { latMin, latMax, lngMin, lngMax } = bbox(lat, lng, RADIUS_KM)
  const url =
    `https://api.gbif.org/v1/occurrence/search?decimalLatitude=${latMin},${latMax}` +
    `&decimalLongitude=${lngMin},${lngMax}&scientificName=${encodeURIComponent(scientificName)}&limit=0`
  try {
    const res = await fetch(url)
    if (!res.ok) return 0
    const json = await res.json()
    return typeof json?.count === 'number' ? json.count : 0
  } catch {
    return 0
  }
}

async function fetchGbifCounts(lat: number, lng: number, names: string[]): Promise<Map<string, number>> {
  const results = await Promise.allSettled(names.map(name => fetchGbifCount(lat, lng, name)))
  const map = new Map<string, number>()
  results.forEach((r, i) => {
    map.set(names[i], r.status === 'fulfilled' ? r.value : 0)
  })
  return map
}

function tierFromCounts(counts: Record<string, number>): Record<string, AbundanceTier> {
  const positive = Object.values(counts).filter(v => v > 0)
  const max = positive.length > 0 ? Math.max(...positive) : 0
  const tiers: Record<string, AbundanceTier> = {}
  for (const [name, count] of Object.entries(counts)) {
    if (max === 0 || count <= 0) tiers[name] = 'not-recorded'
    else if (count >= max * 0.4) tiers[name] = 'common'
    else if (count >= max * 0.1) tiers[name] = 'occasional'
    else tiers[name] = 'rare'
  }
  return tiers
}

export async function fetchLocalAbundance(spot: Spot, candidates: Species[]): Promise<Record<string, AbundanceTier>> {
  if (candidates.length === 0) return {}
  try {
    const names = candidates.map(c => c.scientific_name)
    const countsMap = spot.type === 'saltwater'
      ? await fetchObisChecklist(spot.lat, spot.lng)
      : await fetchGbifCounts(spot.lat, spot.lng, names)
    const counts: Record<string, number> = {}
    for (const name of names) counts[name] = countsMap.get(name) ?? 0
    return tierFromCounts(counts)
  } catch {
    return {}
  }
}
