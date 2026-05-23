import { useLocalCatchLogStore } from '../store/localCatchLogStore'

const BASE_ENTRY = {
  date: '2026-05-20',
  time: '14:30',
  spotId: 'spot-1',
  spotName: 'Bodega Bay',
  species: 'Striped Bass',
}

beforeEach(() => {
  useLocalCatchLogStore.setState({ entries: [] })
})

describe('localCatchLogStore', () => {
  it('starts with empty entries', () => {
    expect(useLocalCatchLogStore.getState().entries).toHaveLength(0)
  })

  it('adds an entry with generated id', () => {
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    const { entries } = useLocalCatchLogStore.getState()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toMatch(/^local-/)
    expect(entries[0].species).toBe('Striped Bass')
    expect(entries[0].spotName).toBe('Bodega Bay')
  })

  it('prepends new entries (most recent first)', () => {
    useLocalCatchLogStore.getState().addEntry({ ...BASE_ENTRY, species: 'First' })
    useLocalCatchLogStore.getState().addEntry({ ...BASE_ENTRY, species: 'Second' })
    const { entries } = useLocalCatchLogStore.getState()
    expect(entries[0].species).toBe('Second')
    expect(entries[1].species).toBe('First')
  })

  it('generates unique ids for each entry', () => {
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    const { entries } = useLocalCatchLogStore.getState()
    expect(entries[0].id).not.toBe(entries[1].id)
  })

  it('deletes an entry by id', () => {
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    const id = useLocalCatchLogStore.getState().entries[0].id
    useLocalCatchLogStore.getState().deleteEntry(id)
    expect(useLocalCatchLogStore.getState().entries).toHaveLength(0)
  })

  it('ignores delete for unknown id', () => {
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    useLocalCatchLogStore.getState().deleteEntry('nonexistent-id')
    expect(useLocalCatchLogStore.getState().entries).toHaveLength(1)
  })

  it('clears all entries', () => {
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    useLocalCatchLogStore.getState().addEntry({ ...BASE_ENTRY, species: 'Bluegill' })
    useLocalCatchLogStore.getState().clearAll()
    expect(useLocalCatchLogStore.getState().entries).toHaveLength(0)
  })

  it('stores optional fields correctly', () => {
    useLocalCatchLogStore.getState().addEntry({
      ...BASE_ENTRY,
      weight: 4.25,
      length: 22.5,
      note: 'On a jig near the rocks',
      fishingScore: 73,
    })
    const entry = useLocalCatchLogStore.getState().entries[0]
    expect(entry.weight).toBe(4.25)
    expect(entry.length).toBe(22.5)
    expect(entry.note).toBe('On a jig near the rocks')
    expect(entry.fishingScore).toBe(73)
  })

  it('updates an existing entry by id', () => {
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    const id = useLocalCatchLogStore.getState().entries[0].id
    useLocalCatchLogStore.getState().updateEntry(id, { species: 'Rockfish', weight: 3.5 })
    const entry = useLocalCatchLogStore.getState().entries[0]
    expect(entry.species).toBe('Rockfish')
    expect(entry.weight).toBe(3.5)
    expect(entry.id).toBe(id)
    expect(entry.spotName).toBe('Bodega Bay') // unchanged fields preserved
  })

  it('updateEntry ignores unknown id', () => {
    useLocalCatchLogStore.getState().addEntry(BASE_ENTRY)
    useLocalCatchLogStore.getState().updateEntry('nonexistent', { species: 'Ghost Fish' })
    expect(useLocalCatchLogStore.getState().entries[0].species).toBe('Striped Bass')
  })

  it('updateEntry does not change other entries', () => {
    useLocalCatchLogStore.getState().addEntry({ ...BASE_ENTRY, species: 'First' })
    useLocalCatchLogStore.getState().addEntry({ ...BASE_ENTRY, species: 'Second' })
    const entries = useLocalCatchLogStore.getState().entries
    const firstId = entries[1].id // entries are prepended, so index 1 is "First"
    useLocalCatchLogStore.getState().updateEntry(firstId, { species: 'Updated' })
    const updated = useLocalCatchLogStore.getState().entries
    expect(updated.find(e => e.id === firstId)?.species).toBe('Updated')
    expect(updated[0].species).toBe('Second') // unchanged
  })

  it('updateEntry can clear optional fields by setting undefined', () => {
    useLocalCatchLogStore.getState().addEntry({ ...BASE_ENTRY, note: 'Old note' })
    const id = useLocalCatchLogStore.getState().entries[0].id
    useLocalCatchLogStore.getState().updateEntry(id, { note: undefined })
    expect(useLocalCatchLogStore.getState().entries[0].note).toBeUndefined()
  })
})
