import type { ScoreBreakdown } from '../../types/conditions'

export interface ScoreResult {
  score: number
  breakdown: ScoreBreakdown
}

export interface ScoringInputs {
  pressure: { value: number; trend: 'rising' | 'falling' | 'stable'; rate: 'slow' | 'fast' | 'normal' }
  solunar: { inMajorPeriod: boolean; inMinorPeriod: boolean; withinHourOfPeriod: boolean; isMajorMoonDay: boolean }
  tide: { phase: 'incoming' | 'outgoing' | 'slack'; hoursFromTurn: number } | null
  wind: { speed: number }
  waterTemp: { value: number; spotType: 'saltwater' | 'freshwater' }
  sky: { condition: 'overcast' | 'partly-cloudy' | 'clear' | 'light-rain' | 'heavy-rain' }
  spotType: 'saltwater' | 'freshwater'
}

function pressurePoints(p: ScoringInputs['pressure']): number {
  if (p.trend === 'falling' && p.rate === 'slow') return 25
  if (p.trend === 'falling' && p.rate === 'normal') return 18
  if (p.trend === 'stable' && p.value > 30.10) return 20
  if (p.trend === 'stable') return 15
  if (p.trend === 'rising' && p.rate === 'slow') return 10
  if (p.trend === 'rising' && p.rate === 'normal') return 7
  if (p.trend === 'falling' && p.rate === 'fast') return 8
  return 5  // rising+fast
}

function solunarPoints(s: ScoringInputs['solunar']): number {
  let pts = 5
  if (s.inMajorPeriod) pts = 20
  else if (s.inMinorPeriod) pts = 14
  else if (s.withinHourOfPeriod) pts = 10
  if (s.isMajorMoonDay) pts = Math.min(20, pts + 3)
  return pts
}

function tidePoints(tide: NonNullable<ScoringInputs['tide']>): number {
  if (tide.phase === 'slack') return 5
  if (tide.phase === 'incoming') {
    if (tide.hoursFromTurn <= 1) return 10
    if (tide.hoursFromTurn >= 4) return 20
    return 15
  }
  if (tide.hoursFromTurn <= 2) return 18
  return 12
}

function windPoints(speed: number): number {
  if (speed > 25) return 0
  if (speed > 18) return 5
  if (speed > 12) return 10
  if (speed >= 5) return 15
  return 8
}

function waterTempPoints(wt: ScoringInputs['waterTemp']): number {
  const [min, max] = wt.spotType === 'saltwater' ? [52, 72] : [58, 78]
  if (wt.value >= min && wt.value <= max) return 10
  if (wt.value >= min - 5 && wt.value <= max + 5) return 7
  if (wt.value >= min - 10 && wt.value <= max + 10) return 4
  return 2
}

function skyPoints(condition: ScoringInputs['sky']['condition']): number {
  switch (condition) {
    case 'overcast': return 10
    case 'partly-cloudy': return 8
    case 'light-rain': return 7
    case 'clear': return 5
    case 'heavy-rain': return 0
  }
}

export function calculateScore(inputs: ScoringInputs): number {
  const pressure = pressurePoints(inputs.pressure)
  const solunar = solunarPoints(inputs.solunar)
  const wind = windPoints(inputs.wind.speed)
  const waterTemp = waterTempPoints(inputs.waterTemp)
  const sky = skyPoints(inputs.sky.condition)

  const hasTide = inputs.tide !== null && inputs.spotType === 'saltwater'
  const tide = hasTide ? tidePoints(inputs.tide!) : 0
  const base = pressure + solunar + tide + wind + waterTemp + sky

  // Freshwater: no tide (20pts missing) — scale up to 100
  let score = hasTide ? base : Math.round(base * (100 / 80))

  // Apply severe-condition penalties: dangerous wind or heavy rain cap the score
  if (inputs.wind.speed > 25) score = Math.min(score, 35)
  if (inputs.sky.condition === 'heavy-rain') score = Math.min(score, 45)

  return Math.min(100, Math.max(0, score))
}

export function calculateScoreWithBreakdown(inputs: ScoringInputs): ScoreResult {
  const pressure = pressurePoints(inputs.pressure)
  const solunar = solunarPoints(inputs.solunar)
  const wind = windPoints(inputs.wind.speed)
  const waterTemp = waterTempPoints(inputs.waterTemp)
  const sky = skyPoints(inputs.sky.condition)
  const hasTide = inputs.tide !== null && inputs.spotType === 'saltwater'
  const tide = hasTide ? tidePoints(inputs.tide!) : 0
  const base = pressure + solunar + tide + wind + waterTemp + sky
  let score = hasTide ? base : Math.round(base * (100 / 80))
  if (inputs.wind.speed > 25) score = Math.min(score, 35)
  if (inputs.sky.condition === 'heavy-rain') score = Math.min(score, 45)
  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: { pressure, solunar, tide, wind, waterTemp, sky },
  }
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Drop everything and go'
  if (score >= 70) return 'Great day to fish'
  if (score >= 55) return 'Decent — pick your window'
  if (score >= 40) return 'Tough but possible'
  return 'Stay home'
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}
