import { fetchLocalAbundance } from '../services/speciesOccurrenceService'
import type { Spot } from '../types/spot'
import type { Species } from '../types/species'

function makeSpecies(id: string, scientific_name: string): Species {
  return {
    id, common_name: id, scientific_name,
    region: 'west_coast', type: 'saltwater', tier: 'free',
    months_present: [1], months_peak: [1],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: ['dawn'],
    migration_notes: '', tips: '',
  }
}

const saltSpot: Spot = { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' }
const freshSpot: Spot = { id: 's2', name: 'Lake', lat: 45.0, lng: -93.5, type: 'freshwater', stationId: null, region: 'freshwater' }

beforeEach(() => {
  global.fetch = jest.fn()
})

describe('fetchLocalAbundance — saltwater (OBIS)', () => {
  it('buckets relative record counts into tiers, keyed by scientific_name', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: 3,
        results: [
          { scientificName: 'Oncorhynchus tshawytscha', records: 1000 },
          { scientificName: 'Paralichthys californicus', records: 150 },
          { scientificName: 'Ophiodon elongatus', records: 20 },
        ],
      }),
    })
    const candidates = [
      makeSpecies('chinook', 'Oncorhynchus tshawytscha'),
      makeSpecies('halibut', 'Paralichthys californicus'),
      makeSpecies('lingcod', 'Ophiodon elongatus'),
      makeSpecies('rockfish', 'Sebastes spp.'), // not in the checklist results
    ]
    const result = await fetchLocalAbundance(saltSpot, candidates)
    expect(result).toEqual({
      'Oncorhynchus tshawytscha': 'common',
      'Paralichthys californicus': 'occasional',
      'Ophiodon elongatus': 'rare',
      'Sebastes spp.': 'not-recorded',
    })
  })

  it('calls the OBIS checklist endpoint with a lng-lat WKT polygon', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ total: 0, results: [] }) })
    await fetchLocalAbundance(saltSpot, [makeSpecies('x', 'Genus species')])
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('api.obis.org/v3/checklist')
    expect(url).toContain('geometry=')
    expect(url).toMatch(/POLYGON/)
  })

  it('returns {} when the OBIS request fails, never throws', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    const result = await fetchLocalAbundance(saltSpot, [makeSpecies('x', 'Genus species')])
    expect(result).toEqual({})
  })

  it('returns {} when fetch rejects (network error), never throws', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'))
    const result = await fetchLocalAbundance(saltSpot, [makeSpecies('x', 'Genus species')])
    expect(result).toEqual({})
  })

  it('returns {} immediately for an empty candidate list without calling fetch', async () => {
    const result = await fetchLocalAbundance(saltSpot, [])
    expect(result).toEqual({})
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('fetchLocalAbundance — freshwater (GBIF)', () => {
  it('fires one occurrence-count request per candidate species and tiers the results', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 500 }) })  // bluegill
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 0 }) })    // largemouth bass
    const candidates = [
      makeSpecies('bluegill', 'Lepomis macrochirus'),
      makeSpecies('bass', 'Micropterus salmoides'),
    ]
    const result = await fetchLocalAbundance(freshSpot, candidates)
    expect(result).toEqual({
      'Lepomis macrochirus': 'common',
      'Micropterus salmoides': 'not-recorded',
    })
    expect(global.fetch).toHaveBeenCalledTimes(2)
    const urls = (global.fetch as jest.Mock).mock.calls.map(c => c[0] as string)
    expect(urls[0]).toContain('api.gbif.org/v1/occurrence/search')
    expect(urls[0]).toContain('scientificName=Lepomis')
    expect(urls[0]).toContain('decimalLatitude=')
    expect(urls[0]).toContain('decimalLongitude=')
  })

  it('treats one failed species request as not-recorded without failing the whole batch', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ count: 200 }) })
      .mockRejectedValueOnce(new Error('timeout'))
    const candidates = [
      makeSpecies('a', 'Species alpha'),
      makeSpecies('b', 'Species beta'),
    ]
    const result = await fetchLocalAbundance(freshSpot, candidates)
    expect(result).toEqual({
      'Species alpha': 'common',
      'Species beta': 'not-recorded',
    })
  })
})
