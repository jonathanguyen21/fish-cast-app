import { detectRegion, getSpeciesForRegion } from '../data/species'
import { freshwaterSpecies } from '../data/species/freshwater'
import { westCoastSpecies } from '../data/species/westCoast'

describe('detectRegion', () => {
  it('classifies the Pacific coast as west_coast', () => {
    expect(detectRegion(37.8, -122.4)).toBe('west_coast')  // San Francisco
    expect(detectRegion(47.6, -122.3)).toBe('west_coast')  // Seattle
  })
  it('classifies the Gulf coast as southeast', () => {
    expect(detectRegion(29.3, -94.8)).toBe('southeast')    // Galveston TX
    expect(detectRegion(30.0, -90.1)).toBe('southeast')    // New Orleans
    expect(detectRegion(27.8, -82.6)).toBe('southeast')    // Tampa
  })
  it('classifies the Atlantic coast north of 35 as northeast', () => {
    expect(detectRegion(42.4, -71.0)).toBe('northeast')    // Boston
    expect(detectRegion(40.6, -74.0)).toBe('northeast')    // NY Harbor
  })
  it('classifies inland areas as freshwater', () => {
    expect(detectRegion(39.7, -105.0)).toBe('freshwater')  // Denver
    expect(detectRegion(36.1, -115.1)).toBe('freshwater')  // Las Vegas (NOT west_coast)
  })
})

describe('getSpeciesForRegion', () => {
  it('freshwater spot type always returns freshwater species regardless of location', () => {
    expect(getSpeciesForRegion(37.8, -122.4, 'freshwater')).toBe(freshwaterSpecies)
  })
  it('saltwater spot on the Pacific returns west coast species', () => {
    expect(getSpeciesForRegion(37.8, -122.4, 'saltwater')).toBe(westCoastSpecies)
  })
  it('saltwater spot in an uncovered area returns an empty list', () => {
    expect(getSpeciesForRegion(39.7, -105.0, 'saltwater')).toEqual([])
  })
})
