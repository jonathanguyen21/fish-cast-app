export interface DefaultSpot {
  name: string
  lat: number
  lng: number
  type: 'saltwater' | 'freshwater'
}

// Auto-seeded on first launch (small set to avoid too many parallel NOAA calls).
// NOAA station names don't match marina names — we define our own.
export const SEED_SPOTS: DefaultSpot[] = [
  { name: 'Berkeley Marina',       lat: 37.8659, lng: -122.3189, type: 'saltwater' },
  { name: 'Bodega Bay Harbor',     lat: 38.3288, lng: -123.0481, type: 'saltwater' },
  { name: 'Coyote Point Marina',   lat: 37.5889, lng: -122.3182, type: 'saltwater' },
]

// Full browsable catalog for "Popular Spots" picker in Add Spot screen.
export const POPULAR_SPOTS: Record<string, DefaultSpot[]> = {
  'SF Bay Area': [
    { name: 'Berkeley Marina',           lat: 37.8659, lng: -122.3189, type: 'saltwater' },
    { name: 'Emeryville Marina',         lat: 37.8404, lng: -122.3157, type: 'saltwater' },
    { name: 'Richmond Marina',           lat: 37.9085, lng: -122.3648, type: 'saltwater' },
    { name: 'Alameda Marina',            lat: 37.7799, lng: -122.2913, type: 'saltwater' },
    { name: 'Horseshoe Cove',            lat: 37.8330, lng: -122.4785, type: 'saltwater' },
    { name: 'Coyote Point Marina',       lat: 37.5889, lng: -122.3182, type: 'saltwater' },
    { name: 'San Mateo Bridge West',     lat: 37.5774, lng: -122.2477, type: 'saltwater' },
    { name: 'Dumbarton Bridge East',     lat: 37.5069, lng: -122.1154, type: 'saltwater' },
    { name: 'Fort Baker Pier',           lat: 37.8337, lng: -122.4783, type: 'saltwater' },
  ],
  'North CA Coast': [
    { name: 'Bodega Bay Harbor',         lat: 38.3288, lng: -123.0481, type: 'saltwater' },
    { name: 'Tomales Bay',               lat: 38.1760, lng: -122.9000, type: 'saltwater' },
    { name: 'Muir Beach',                lat: 37.8558, lng: -122.5773, type: 'saltwater' },
    { name: 'Pillar Point Harbor',       lat: 37.4984, lng: -122.4817, type: 'saltwater' },
    { name: 'Santa Cruz Wharf',          lat: 36.9533, lng: -122.0176, type: 'saltwater' },
    { name: 'Monterey Bay',              lat: 36.8000, lng: -121.9500, type: 'saltwater' },
  ],
  'Southern CA': [
    { name: 'Morro Bay Harbor',          lat: 35.3659, lng: -120.8579, type: 'saltwater' },
    { name: 'Santa Barbara Harbor',      lat: 34.4087, lng: -119.6914, type: 'saltwater' },
    { name: 'King Harbor Marina',        lat: 33.8480, lng: -118.3970, type: 'saltwater' },
    { name: 'Newport Beach Pier',        lat: 33.6034, lng: -117.9325, type: 'saltwater' },
    { name: 'Mission Bay San Diego',     lat: 32.7720, lng: -117.2283, type: 'saltwater' },
    { name: 'Shelter Island Marina',     lat: 32.7147, lng: -117.2216, type: 'saltwater' },
  ],
  'Pacific Northwest': [
    { name: 'Westport Marina',           lat: 46.9041, lng: -124.1047, type: 'saltwater' },
    { name: 'Ilwaco Marina',             lat: 46.3123, lng: -124.0415, type: 'saltwater' },
    { name: 'Astoria Pier',              lat: 46.1876, lng: -123.8260, type: 'saltwater' },
    { name: 'Depoe Bay',                 lat: 44.8106, lng: -124.0637, type: 'saltwater' },
  ],
  'Northeast': [
    { name: 'Montauk Harbor',            lat: 41.0694, lng: -71.9538, type: 'saltwater' },
    { name: 'Cape Cod Bay',              lat: 41.7886, lng: -70.3558, type: 'saltwater' },
    { name: 'Block Island Sound',        lat: 41.2062, lng: -71.5782, type: 'saltwater' },
    { name: 'Chesapeake Bay Bridge',     lat: 38.9928, lng: -76.3990, type: 'saltwater' },
  ],
  'Gulf Coast': [
    { name: 'Galveston Bay',             lat: 29.5200, lng: -94.8800, type: 'saltwater' },
    { name: 'Port Aransas Marina',       lat: 27.8326, lng: -97.0524, type: 'saltwater' },
    { name: 'Tampa Bay Skyway',          lat: 27.6219, lng: -82.6550, type: 'saltwater' },
    { name: 'Florida Bay Flamingo',      lat: 25.1349, lng: -80.9128, type: 'saltwater' },
  ],
  'Freshwater': [
    { name: 'Lake Tahoe South',          lat: 38.9501, lng: -119.9774, type: 'freshwater' },
    { name: 'Lake Shasta',               lat: 40.7199, lng: -122.3808, type: 'freshwater' },
    { name: 'Pyramid Lake NV',           lat: 40.0166, lng: -119.5836, type: 'freshwater' },
    { name: 'Lake Mead Nevada',          lat: 36.1400, lng: -114.4200, type: 'freshwater' },
    { name: 'Columbia River Gorge',      lat: 45.6938, lng: -121.5306, type: 'freshwater' },
  ],
}

// Flat list for backward compat (used by _layout.tsx seeding).
export const DEFAULT_SPOTS: DefaultSpot[] = SEED_SPOTS
