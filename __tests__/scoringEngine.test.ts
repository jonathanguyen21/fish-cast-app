import { calculateScore, calculateScoreWithBreakdown, scoreLabel, scoreColor } from '../features/score/scoringEngine'
import type { ScoringInputs } from '../features/score/scoringEngine'
import { Colors } from '../theme/colors'

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
    expect(score).toBe(100)
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

  it('scores falling normal pressure higher than falling fast', () => {
    const fallingNormal = calculateScore({ ...ideal, pressure: { value: 30.05, trend: 'falling', rate: 'normal' } })
    const fallingFast = calculateScore({ ...ideal, pressure: { value: 30.05, trend: 'falling', rate: 'fast' } })
    expect(fallingNormal).toBeGreaterThan(fallingFast)
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
  it('returns green for high scores', () => expect(scoreColor(80)).toBe(Colors.success))
  it('returns amber for mid scores', () => expect(scoreColor(55)).toBe(Colors.warning))
  it('returns red for low scores', () => expect(scoreColor(30)).toBe(Colors.danger))
})

describe('calculateScoreWithBreakdown', () => {
  it('returns score matching calculateScore', () => {
    const { score } = calculateScoreWithBreakdown(ideal)
    expect(score).toBe(calculateScore(ideal))
  })

  it('breakdown has all 6 factor keys', () => {
    const { breakdown } = calculateScoreWithBreakdown(ideal)
    expect(breakdown).toHaveProperty('pressure')
    expect(breakdown).toHaveProperty('solunar')
    expect(breakdown).toHaveProperty('tide')
    expect(breakdown).toHaveProperty('wind')
    expect(breakdown).toHaveProperty('waterTemp')
    expect(breakdown).toHaveProperty('sky')
  })

  it('all breakdown values are non-negative', () => {
    const { breakdown } = calculateScoreWithBreakdown(ideal)
    for (const val of Object.values(breakdown)) {
      expect(val).toBeGreaterThanOrEqual(0)
    }
  })

  it('pressure 25 for slow falling', () => {
    const { breakdown } = calculateScoreWithBreakdown(ideal)
    expect(breakdown.pressure).toBe(25)
  })

  it('solunar 20 during major period', () => {
    const { breakdown } = calculateScoreWithBreakdown(ideal)
    expect(breakdown.solunar).toBe(20)
  })

  it('tide 0 for freshwater spot', () => {
    const fw: ScoringInputs = {
      ...ideal,
      tide: null,
      spotType: 'freshwater',
      waterTemp: { value: 68, spotType: 'freshwater' },
    }
    const { breakdown } = calculateScoreWithBreakdown(fw)
    expect(breakdown.tide).toBe(0)
  })

  it('breakdown components respect caps (wind > 25 caps score at 35)', () => {
    const highWind: ScoringInputs = { ...ideal, wind: { speed: 30 } }
    const { score, breakdown } = calculateScoreWithBreakdown(highWind)
    expect(score).toBeLessThanOrEqual(35)
    expect(breakdown.wind).toBe(0)
  })

  it('heavy-rain sky caps score at 45', () => {
    const rainy: ScoringInputs = { ...ideal, sky: { condition: 'heavy-rain' } }
    const { score, breakdown } = calculateScoreWithBreakdown(rainy)
    expect(score).toBeLessThanOrEqual(45)
    expect(breakdown.sky).toBe(0)
  })
})
