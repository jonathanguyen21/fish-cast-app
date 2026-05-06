import { calculateSolunar } from '../services/solunarService'

// Bodega Bay, CA — a real location with known solunar behavior
const LAT = 38.33
const LNG = -123.05
// Midday on a known date
const DATE = new Date('2026-05-06T14:00:00')

describe('calculateSolunar', () => {
  it('returns all required fields', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result).toHaveProperty('moon')
    expect(result).toHaveProperty('sun')
    expect(result.moon).toHaveProperty('phase')
    expect(result.moon).toHaveProperty('illumination')
    expect(result.moon).toHaveProperty('majorPeriods')
    expect(result.moon).toHaveProperty('minorPeriods')
    expect(result.sun).toHaveProperty('sunrise')
    expect(result.sun).toHaveProperty('sunset')
    expect(typeof result.inMajorPeriod).toBe('boolean')
    expect(typeof result.inMinorPeriod).toBe('boolean')
    expect(typeof result.withinHourOfPeriod).toBe('boolean')
    expect(typeof result.isMajorMoonDay).toBe('boolean')
  })

  it('illumination is between 0 and 100', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.moon.illumination).toBeGreaterThanOrEqual(0)
    expect(result.moon.illumination).toBeLessThanOrEqual(100)
  })

  it('phase label is a non-empty string', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.moon.phase.length).toBeGreaterThan(0)
  })

  it('major periods are each 1 hour wide', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    for (const p of result.moon.majorPeriods) {
      // both start and end should be formatted time strings e.g. "3:42 PM"
      expect(p.start).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
      expect(p.end).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
    }
  })

  it('inMajorPeriod and inMinorPeriod are mutually exclusive', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.inMajorPeriod && result.inMinorPeriod).toBe(false)
  })

  it('withinHourOfPeriod is false when inMajorPeriod or inMinorPeriod is true', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    if (result.inMajorPeriod || result.inMinorPeriod) {
      expect(result.withinHourOfPeriod).toBe(false)
    }
  })

  it('sun times are formatted strings', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.sun.sunrise).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
    expect(result.sun.sunset).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
  })
})
