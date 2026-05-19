import { act, renderHook } from '@testing-library/react-native'
import { useSpotsStore } from '../store/spotsStore'
import type { Spot } from '../types/spot'

const mockSpot: Spot = {
  id: 'spot_1',
  name: 'Bodega Bay',
  lat: 38.33,
  lng: -123.05,
  type: 'saltwater',
  stationId: '9415020',
  region: 'west_coast',
}

describe('spotsStore', () => {
  beforeEach(() => {
    useSpotsStore.getState().clear()
  })

  it('adds a spot', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    expect(result.current.spots).toHaveLength(1)
    expect(result.current.spots[0].name).toBe('Bodega Bay')
  })

  it('removes a spot', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.removeSpot('spot_1') })
    expect(result.current.spots).toHaveLength(0)
  })

  it('sets active spot', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.setActiveSpot('spot_1') })
    expect(result.current.activeSpotId).toBe('spot_1')
  })

  it('returns active spot object', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.setActiveSpot('spot_1') })
    expect(result.current.activeSpot).toEqual(mockSpot)
  })

  it('first added spot auto-activates', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    expect(result.current.activeSpotId).toBe('spot_1')
    expect(result.current.activeSpot).toEqual(mockSpot)
  })

  it('adding a second spot does not change active spot', () => {
    const spot2: Spot = { ...mockSpot, id: 'spot_2', name: 'Half Moon Bay' }
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.addSpot(spot2) })
    expect(result.current.activeSpotId).toBe('spot_1')
    expect(result.current.spots).toHaveLength(2)
  })

  it('removing active spot auto-switches to first remaining', () => {
    const spot2: Spot = { ...mockSpot, id: 'spot_2', name: 'Half Moon Bay' }
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.addSpot(spot2) })
    act(() => { result.current.removeSpot('spot_1') })
    expect(result.current.activeSpotId).toBe('spot_2')
    expect(result.current.activeSpot?.name).toBe('Half Moon Bay')
  })

  it('removing the last spot nulls activeSpot', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.removeSpot('spot_1') })
    expect(result.current.activeSpotId).toBeNull()
    expect(result.current.activeSpot).toBeNull()
  })
})
