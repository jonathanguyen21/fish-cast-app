import { westCoastSpecies } from '../data/species/westCoast'
import { northeastSpecies } from '../data/species/northeast'
import { southeastSpecies } from '../data/species/southeast'
import { freshwaterSpecies } from '../data/species/freshwater'
import type { Species } from '../types/species'

const FILES: Array<[string, Species[]]> = [
  ['westCoast', westCoastSpecies],
  ['northeast', northeastSpecies],
  ['southeast', southeastSpecies],
  ['freshwater', freshwaterSpecies],
]

describe.each(FILES)('species data: %s', (_name, list) => {
  it('has unique ids', () => {
    const ids = list.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('months are valid and peak months are a subset of present months', () => {
    for (const s of list) {
      expect(s.months_present.length).toBeGreaterThan(0)
      for (const m of [...s.months_present, ...s.months_peak]) {
        expect(m).toBeGreaterThanOrEqual(1)
        expect(m).toBeLessThanOrEqual(12)
      }
      for (const m of s.months_peak) {
        expect(s.months_present).toContain(m)
      }
    }
  })

  it('temperature ranges are ordered min <= peak_min <= peak_max <= max', () => {
    for (const s of list) {
      const t = s.water_temp_f
      expect(t.min).toBeLessThanOrEqual(t.peak_min)
      expect(t.peak_min).toBeLessThanOrEqual(t.peak_max)
      expect(t.peak_max).toBeLessThanOrEqual(t.max)
    }
  })

  it('has non-empty notes, tips, and time-of-day preferences', () => {
    for (const s of list) {
      expect(s.migration_notes.length).toBeGreaterThan(20)
      expect(s.tips.length).toBeGreaterThan(20)
      expect(s.preferred_time_of_day.length).toBeGreaterThan(0)
    }
  })
})

it('all species ids are globally unique', () => {
  const all = FILES.flatMap(([, list]) => list.map(s => s.id))
  expect(new Set(all).size).toBe(all.length)
})
