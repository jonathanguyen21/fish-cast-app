import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseForecastResult {
  data: DayForecast[]
  isLoading: boolean
}

// Phase 2 replaces this with a real TanStack query over forecastService.
// Until then: no data is better than fake data.
export function useForecast(_spot: Spot | null): UseForecastResult {
  return { data: [], isLoading: false }
}
