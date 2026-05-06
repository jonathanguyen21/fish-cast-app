import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchNoaaData } from '../services/noaaService'
import { fetchNwsData } from '../services/nwsService'
import { fetchMarineData } from '../services/marineService'
import { calculateSolunar } from '../services/solunarService'
import { buildConditionsData } from '../services/scoringService'
import type { ConditionsData } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseConditionsResult {
  data: ConditionsData | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export function useConditions(spot: Spot | null): UseConditionsResult {
  const enabled = !!spot

  const noaaQuery = useQuery({
    queryKey: ['noaa', spot?.id],
    queryFn: () => fetchNoaaData(spot!),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  })

  const nwsQuery = useQuery({
    queryKey: ['nws', spot?.id],
    queryFn: () => fetchNwsData(spot!),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
  })

  const marineQuery = useQuery({
    queryKey: ['marine', spot?.id],
    queryFn: () => fetchMarineData(spot!),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
  })

  const solunarQuery = useQuery({
    queryKey: ['solunar', spot?.id, todayKey()],
    queryFn: () => calculateSolunar(spot!.lat, spot!.lng, new Date()),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  })

  const isLoading =
    noaaQuery.isLoading || nwsQuery.isLoading || marineQuery.isLoading || solunarQuery.isLoading

  // Only total failure if both primary weather sources fail
  const isError = (noaaQuery.isError && nwsQuery.isError) || solunarQuery.isError

  const data = useMemo(() => {
    if (!spot || !solunarQuery.data) return null
    return buildConditionsData(
      noaaQuery.data ?? null,
      nwsQuery.data ?? null,
      marineQuery.data ?? null,
      solunarQuery.data,
      spot,
      new Date()
    )
  }, [spot, noaaQuery.data, nwsQuery.data, marineQuery.data, solunarQuery.data])

  function refetch() {
    noaaQuery.refetch()
    nwsQuery.refetch()
    marineQuery.refetch()
  }

  return { data, isLoading, isError, refetch }
}
