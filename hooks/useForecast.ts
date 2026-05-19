import { useQuery } from '@tanstack/react-query'
import { fetchForecast } from '../services/forecastService'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseForecastResult {
  data: DayForecast[] | undefined
  isLoading: boolean
  isError: boolean
}

export function useForecast(spot: Spot | null): UseForecastResult {
  const query = useQuery({
    queryKey: ['forecast', spot?.id],
    queryFn: () => fetchForecast(spot!),
    enabled: !!spot,
    staleTime: 2 * 60 * 60 * 1000,  // 2 hours
    gcTime: 6 * 60 * 60 * 1000,     // 6 hours
    retry: 2,
  })

  return { data: query.data, isLoading: query.isLoading, isError: query.isError }
}
