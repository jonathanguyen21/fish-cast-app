export interface DefaultSpot {
  name: string
  lat: number
  lng: number
  type: 'saltwater' | 'freshwater'
}

export const DEFAULT_SPOTS: DefaultSpot[] = [
  { name: 'Berkeley Marina',       lat: 37.8659, lng: -122.3189, type: 'saltwater' },
  { name: 'Pinole Point',          lat: 37.9085, lng: -122.3648, type: 'saltwater' },
  { name: 'Horseshoe Cove',        lat: 37.8330, lng: -122.4785, type: 'saltwater' },
  { name: 'Coyote Point Marina',   lat: 37.5889, lng: -122.3182, type: 'saltwater' },
  { name: 'San Mateo Bridge West', lat: 37.5774, lng: -122.2477, type: 'saltwater' },
]
