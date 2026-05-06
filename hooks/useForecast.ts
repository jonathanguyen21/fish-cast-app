import { MOCK_FORECAST } from '../data/mockData'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseForecastResult {
  data: DayForecast[]
  isLoading: boolean
}

export function useForecast(_spot: Spot | null): UseForecastResult {
  return {
    data: _spot ? MOCK_FORECAST : [],
    isLoading: false,
  }
}
