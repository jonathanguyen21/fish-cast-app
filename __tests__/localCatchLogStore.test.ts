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
})
