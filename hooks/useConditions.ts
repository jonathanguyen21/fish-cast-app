import { MOCK_CONDITIONS } from '../data/mockData'
import type { ConditionsData } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseConditionsResult {
  data: ConditionsData | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

// Phase A: returns mock data immediately.
// Phase B: replace body with TanStack Query calls to real services.
export function useConditions(_spot: Spot | null): UseConditionsResult {
  return {
    data: _spot ? MOCK_CONDITIONS : null,
    isLoading: false,
    isError: false,
    refetch: () => {},
  }
}
