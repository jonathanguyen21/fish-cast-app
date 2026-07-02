import { useQuery } from '@tanstack/react-query'
import { fetchForecast } from '../services/forecastService'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseForecastResult {
  data: DayForecast[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export function useForecast(spot: Spot | null): UseForecastResult {
  const query = useQuery({
    queryKey: ['forecast', spot?.id, todayKey()],
    queryFn: () => fetchForecast(spot!),
    enabled: !!spot,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => { query.refetch() },
  }
}
