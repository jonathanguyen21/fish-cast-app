import { calculateScore, scoreLabel, scoreColor } from '../features/score/scoringEngine'
import type { ScoringInputs } from '../features/score/scoringEngine'

const ideal: ScoringInputs = {
  pressure: { value: 30.05, trend: 'falling', rate: 'slow' },
  solunar: { inMajorPeriod: true, inMinorPeriod: false, withinHourOfPeriod: false, isMajorMoonDay: false },
  tide: { phase: 'incoming', hoursFromTurn: 5 },
  wind: { speed: 8 },
  waterTemp: { value: 62, spotType: 'saltwater' },
  sky: { condition: 'overcast' },
  spotType: 'saltwater',
}

describe('calculateScore', () => {
  it('returns 100 for near-ideal saltwater conditions', () => {
    expect(calculateScore(ideal)).toBe(100)
  })

  it('returns low score for dangerous wind', () => {
    const score = calculateScore({ ...ideal, wind: { speed: 30 } })
    expect(score).toBeLessThan(40)
  })

  it('returns low score for heavy rain', () => {
    const score = calculateScore({ ...ideal, sky: { condition: 'heavy-rain' } })
    expect(score).toBeLessThan(50)
  })

  it('handles freshwater spot (no tide)', () => {
    const score = calculateScore({ ...ideal, tide: null, spotType: 'freshwater',
      waterTemp: { value: 68, spotType: 'freshwater' } })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('clamps score to 0–100', () => {
    const score = calculateScore(ideal)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('gives rising pressure worst score', () => {
    const rising = calculateScore({ ...ideal, pressure: { value: 29.8, trend: 'rising', rate: 'fast' } })
    const falling = calculateScore(ideal)
    expect(rising).toBeLessThan(falling)
  })
})

describe('scoreLabel', () => {
  it('returns correct labels', () => {
    expect(scoreLabel(90)).toBe('Drop everything and go')
    expect(scoreLabel(75)).toBe('Great day to fish')
    expect(scoreLabel(60)).toBe('Decent — pick your window')
    expect(scoreLabel(45)).toBe('Tough but possible')
    expect(scoreLabel(20)).toBe('Stay home')
  })
})

describe('scoreColor', () => {
  it('returns green for high scores', () => expect(scoreColor(80)).toBe('#10B981'))
  it('returns amber for mid scores', () => expect(scoreColor(55)).toBe('#F59E0B'))
  it('returns red for low scores', () => expect(scoreColor(30)).toBe('#EF4444'))
})
