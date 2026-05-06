import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

export async function fetchForecast(_spot: Spot): Promise<DayForecast[]> {
  throw new Error('forecastService not yet implemented — Phase B')
}
