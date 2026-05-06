import type { SwellData } from '../types/conditions'
import type { Spot } from '../types/spot'

export async function fetchMarineData(_spot: Spot): Promise<SwellData | null> {
  throw new Error('marineService not yet implemented — Phase B')
}
