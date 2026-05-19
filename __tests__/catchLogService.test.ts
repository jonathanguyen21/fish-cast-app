import { fetchCatches, addCatch, deleteCatch } from '../services/catchLogService'

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockDelete = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  },
}))

const MOCK_ROW = {
  id: 'abc-123',
  date: '2026-05-18',
  time: '08:00',
  spot_id: 'spot_1',
  spot_name: 'Bodega Bay',
  species: 'Halibut',
  weight: 4.5,
  length: 22,
  note: 'morning bite',
  fishing_score: 78,
}

describe('catchLogService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetchCatches maps rows to CatchEntry', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [MOCK_ROW], error: null }),
        }),
      }),
    })
    const entries = await fetchCatches('user-1')
    expect(entries).toHaveLength(1)
    expect(entries[0].spotId).toBe('spot_1')
    expect(entries[0].fishingScore).toBe(78)
  })

  it('fetchCatches throws on error', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
        }),
      }),
    })
    await expect(fetchCatches('user-1')).rejects.toThrow('db error')
  })

  it('addCatch returns mapped entry', async () => {
    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: MOCK_ROW, error: null }),
      }),
    })
    const entry = await addCatch('user-1', {
      date: '2026-05-18', time: '08:00',
      spotId: 'spot_1', spotName: 'Bodega Bay',
      species: 'Halibut', weight: 4.5, length: 22,
      note: 'morning bite', fishingScore: 78,
    })
    expect(entry.id).toBe('abc-123')
    expect(entry.species).toBe('Halibut')
  })

  it('deleteCatch throws on error', async () => {
    mockDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: new Error('delete failed') }),
    })
    await expect(deleteCatch('abc-123')).rejects.toThrow('delete failed')
  })
})
