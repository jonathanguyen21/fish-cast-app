import type { TideData, WindData, PressureData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface NoaaData {
  tide: TideData | null
  wind: WindData
  waterTemp: number
  pressure: PressureData
  airTemp: number
}

export async function fetchNoaaData(_spot: Spot): Promise<NoaaData> {
  throw new Error('noaaService not yet implemented — Phase B')
}
