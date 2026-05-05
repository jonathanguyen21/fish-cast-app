export type SpotType = 'saltwater' | 'freshwater'
export type Region = 'west_coast' | 'northeast' | 'southeast' | 'freshwater'

export interface Spot {
  id: string
  name: string
  lat: number
  lng: number
  type: SpotType
  stationId: string | null
  region: Region
}
