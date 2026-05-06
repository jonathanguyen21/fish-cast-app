import type { ConditionsData } from '../types/conditions'
import type { Spot } from '../types/spot'

export async function fetchConditions(_spot: Spot): Promise<ConditionsData> {
  throw new Error('scoringService not yet implemented — Phase B')
}
