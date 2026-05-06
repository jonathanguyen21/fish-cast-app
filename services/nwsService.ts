import type { AirData, SkyData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface NwsData {
  air: AirData
  sky: SkyData
  hourlyForecast: { hour: number; windSpeed: number; cloudCover: number; rainChance: number }[]
}

export async function fetchNwsData(_spot: Spot): Promise<NwsData> {
  throw new Error('nwsService not yet implemented — Phase B')
}
