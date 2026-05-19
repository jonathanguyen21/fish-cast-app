import { act, renderHook } from '@testing-library/react-native'
import { useCatchLogStore } from '../store/catchLogStore'
import type { CatchEntry } from '../store/catchLogStore'

const BASE: Omit<CatchEntry, 'id'> = {
  date: '2026-05-06',
  time: '14:30',
  spotId: 'spot_1',
  spotName: 'Bodega Bay',
  species: 'Halibut',
  weight: 4.5,
  length: 22,
  fishingScore: 78,
}

describe('catchLogStore', () => {
  beforeEach(() => {
    useCatchLogStore.setState({ entries: [] })
  })

  it('starts with empty entries', () => {
    expect(useCatchLogStore.getState().entries).toHaveLength(0)
  })

  it('addEntry prepends a new catch with a generated id', () => {
    const { result } = renderHook(() => useCatchLogStore())
    act(() => { result.current.addEntry(BASE) })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toMatch(/^catch_/)
    expect(result.current.entries[0].species).toBe('Halibut')
  })

  it('addEntry prepends (newest first)', () => {
    const { result } = renderHook(() => useCatchLogStore())
    act(() => { result.current.addEntry({ ...BASE, species: 'Rockfish' }) })
    act(() => { result.current.addEntry({ ...BASE, species: 'Halibut' }) })
    expect(result.current.entries[0].species).toBe('Halibut')
    expect(result.current.entries[1].species).toBe('Rockfish')
  })

  it('updateEntry patches a field without losing others', () => {
    const { result } = renderHook(() => useCatchLogStore())
    act(() => { result.current.addEntry(BASE) })
    const id = result.current.entries[0].id
    act(() => { result.current.updateEntry(id, { weight: 6.0 }) })
    expect(result.current.entries[0].weight).toBe(6.0)
    expect(result.current.entries[0].species).toBe('Halibut')
  })

  it('updateEntry does not affect other entries', () => {
    const { result } = renderHook(() => useCatchLogStore())
    act(() => { result.current.addEntry({ ...BASE, species: 'Rockfish' }) })
    act(() => { result.current.addEntry({ ...BASE, species: 'Halibut' }) })
    const id = result.current.entries[0].id
    act(() => { result.current.updateEntry(id, { note: 'big one' }) })
    expect(result.current.entries[1].note).toBeUndefined()
  })

  it('deleteEntry removes the entry by id', () => {
    const { result } = renderHook(() => useCatchLogStore())
    act(() => { result.current.addEntry(BASE) })
    const id = result.current.entries[0].id
    act(() => { result.current.deleteEntry(id) })
    expect(result.current.entries).toHaveLength(0)
  })

  it('deleteEntry does not affect entries with different ids', () => {
    const { result } = renderHook(() => useCatchLogStore())
    act(() => { result.current.addEntry({ ...BASE, species: 'Rockfish' }) })
    act(() => { result.current.addEntry({ ...BASE, species: 'Halibut' }) })
    const idToDelete = result.current.entries[1].id
    act(() => { result.current.deleteEntry(idToDelete) })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].species).toBe('Halibut')
  })
})
