import { useQuery } from '@tanstack/react-query'
import { fetchLocalAbundance, type AbundanceTier } from '../services/speciesOccurrenceService'
import type { Spot } from '../types/spot'
import type { Species } from '../types/species'

export interface UseSpeciesAbundanceResult {
  data: Record<string, AbundanceTier> | undefined
  isLoading: boolean
  isError: boolean
}

export function useSpeciesAbundance(spot: Spot | null, candidates: Species[]): UseSpeciesAbundanceResult {
  const query = useQuery({
    queryKey: ['abundance', spot?.id, candidates.map(c => c.id).sort().join(',')],
    queryFn: () => fetchLocalAbundance(spot!, candidates),
    enabled: !!spot && candidates.length > 0,
    staleTime: 7 * 24 * 60 * 60 * 1000,  // 7 days — occurrence data changes slowly
    gcTime: 24 * 24 * 60 * 60 * 1000,    // 24 days — 30 days would overflow the 32-bit setTimeout limit (2^31-1 ms ≈ 24.8 days) that @tanstack/query-core's gc scheduler doesn't clamp, silently firing near-instantly instead
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
