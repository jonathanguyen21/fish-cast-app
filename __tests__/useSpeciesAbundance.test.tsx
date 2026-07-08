import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSpeciesAbundance } from '../hooks/useSpeciesAbundance'
import * as service from '../services/speciesOccurrenceService'
import type { Spot } from '../types/spot'
import type { Species } from '../types/species'

jest.mock('../services/speciesOccurrenceService')

const spot: Spot = { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' }
const candidates: Species[] = [{
  id: 'x', common_name: 'X', scientific_name: 'Genus species',
  region: 'west_coast', type: 'saltwater', tier: 'free',
  months_present: [1], months_peak: [1],
  water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
  preferred_tide: 'any', preferred_time_of_day: ['dawn'],
  migration_notes: '', tips: '',
}]

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => { jest.resetAllMocks() })

describe('useSpeciesAbundance', () => {
  it('resolves to the service result', async () => {
    jest.spyOn(service, 'fetchLocalAbundance').mockResolvedValue({ 'Genus species': 'common' })
    const { result } = renderHook(() => useSpeciesAbundance(spot, candidates), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual({ 'Genus species': 'common' })
    expect(result.current.isError).toBe(false)
  })

  it('is disabled (no fetch, no loading) when spot is null', () => {
    const spy = jest.spyOn(service, 'fetchLocalAbundance')
    const { result } = renderHook(() => useSpeciesAbundance(null, candidates), { wrapper })
    expect(result.current.isLoading).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })

  it('is disabled when candidates is empty', () => {
    const spy = jest.spyOn(service, 'fetchLocalAbundance')
    const { result } = renderHook(() => useSpeciesAbundance(spot, []), { wrapper })
    expect(result.current.isLoading).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })
})
