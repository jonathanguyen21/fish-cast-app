import { getDailySolunar } from '../services/solunarService'

// Berkeley Marina coordinates
const LAT = 37.87
const LNG = -122.33

describe('getDailySolunar', () => {
  it('returns a rating between 0 and 100', () => {
    const date = new Date('2026-05-20T12:00:00')
    const result = getDailySolunar(LAT, LNG, date)
    expect(result.rating).toBeGreaterThanOrEqual(0)
    expect(result.rating).toBeLessThanOrEqual(100)
  })

  it('returns illumination between 0 and 100', () => {
    const date = new Date('2026-05-20T12:00:00')
    const { illumination } = getDailySolunar(LAT, LNG, date)
    expect(illumination).toBeGreaterThanOrEqual(0)
    expect(illumination).toBeLessThanOrEqual(100)
  })

  it('returns phase between 0 and 1', () => {
    const date = new Date('2026-05-20T12:00:00')
    const { phase } = getDailySolunar(LAT, LNG, date)
    expect(phase).toBeGreaterThanOrEqual(0)
    expect(phase).toBeLessThanOrEqual(1)
  })

  it('returns a phaseLabel string', () => {
    const date = new Date('2026-05-20T12:00:00')
    const { phaseLabel } = getDailySolunar(LAT, LNG, date)
    expect(typeof phaseLabel).toBe('string')
    expect(phaseLabel.length).toBeGreaterThan(0)
  })

  it('returns majorPeriods as an array', () => {
    const date = new Date('2026-05-20T12:00:00')
    const { majorPeriods } = getDailySolunar(LAT, LNG, date)
    expect(Array.isArray(majorPeriods)).toBe(true)
  })

  it('produces different ratings for different days', () => {
    const d1 = new Date('2026-05-01T12:00:00')
    const d2 = new Date('2026-05-15T12:00:00')
    const r1 = getDailySolunar(LAT, LNG, d1).rating
    const r2 = getDailySolunar(LAT, LNG, d2).rating
    // New moon vs ~full moon should differ significantly
    expect(r1).not.toBe(r2)
  })

  it('always returns a base score of at least 10', () => {
    // Even on worst days, base score of 10 ensures minimum is 10
    const date = new Date('2026-05-20T12:00:00')
    const { rating } = getDailySolunar(LAT, LNG, date)
    expect(rating).toBeGreaterThanOrEqual(10)
  })

  it('isMajorDay is a boolean', () => {
    const date = new Date('2026-05-20T12:00:00')
    const { isMajorDay } = getDailySolunar(LAT, LNG, date)
    expect(typeof isMajorDay).toBe('boolean')
  })
})
