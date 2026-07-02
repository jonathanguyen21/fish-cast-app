import type { ScoreBreakdown, ScoreFactor } from '../../types/conditions'

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

function pressureNote(p: ScoringInputs['pressure']): string {
  if (p.trend === 'falling' && p.rate === 'slow') return 'Falling slowly — prime feeding trigger'
  if (p.trend === 'falling' && p.rate === 'fast') return 'Falling fast — storm close, short bite window'
  if (p.trend === 'falling') return 'Falling — fish feed ahead of weather'
  if (p.trend === 'stable' && p.value > 30.10) return 'High and steady — settled conditions'
  if (p.trend === 'stable') return 'Steady — neutral effect'
  if (p.rate === 'slow') return 'Rising slowly — post-front recovery'
  if (p.rate === 'fast') return 'Rising fast — toughest pressure pattern'
  return 'Rising — fish adjusting, slower bite'
}

function solunarNote(s: ScoringInputs['solunar']): string {
  if (s.inMajorPeriod) return 'Major solunar period — peak moon-driven activity'
  if (s.inMinorPeriod) return 'Minor solunar period — elevated activity'
  if (s.withinHourOfPeriod) return 'Within an hour of a solunar period'
  return 'No solunar period near this hour'
}

function tideNote(t: NonNullable<ScoringInputs['tide']>): string {
  if (t.phase === 'slack') return 'Slack tide — little water movement'
  if (t.phase === 'incoming') {
    if (t.hoursFromTurn <= 1) return 'Tide just turned in — current building'
    if (t.hoursFromTurn >= 4) return 'Late incoming — strong water movement'
    return 'Mid-incoming — good water movement'
  }
  if (t.hoursFromTurn <= 2) return 'Early outgoing — bait flushing out'
  return 'Late outgoing — current slowing'
}

function windNote(speed: number): string {
  if (speed > 25) return 'Dangerous wind — stay off the water'
  if (speed > 18) return 'Strong wind — tough conditions'
  if (speed > 12) return 'Breezy — manageable'
  if (speed >= 5) return 'Light chop — ideal'
  return 'Flat calm — fish get spooky'
}

function waterTempNote(wt: ScoringInputs['waterTemp']): string {
  const [min, max] = wt.spotType === 'saltwater' ? [52, 72] : [58, 78]
  if (wt.value >= min && wt.value <= max) return 'In the productive temperature range'
  if (wt.value >= min - 5 && wt.value <= max + 5) return 'Slightly outside the ideal temperature range'
  return 'Well outside the ideal temperature range'
}

function skyNote(c: ScoringInputs['sky']['condition']): string {
  switch (c) {
    case 'overcast': return 'Overcast — low light keeps fish shallow'
    case 'partly-cloudy': return 'Partly cloudy — decent light conditions'
    case 'light-rain': return 'Light rain — often improves the bite'
    case 'clear': return 'Bright sun — fish hold deeper'
    case 'heavy-rain': return 'Heavy rain — hard on visibility and safety'
  }
}

export function calculateScoreBreakdown(inputs: ScoringInputs): ScoreBreakdown {
  const hasTide = inputs.tide !== null && inputs.spotType === 'saltwater'

  const factors: ScoreFactor[] = [
    { key: 'pressure', label: 'Pressure', points: pressurePoints(inputs.pressure), max: 25, note: pressureNote(inputs.pressure) },
    { key: 'solunar', label: 'Solunar', points: solunarPoints(inputs.solunar), max: 20, note: solunarNote(inputs.solunar) },
    ...(hasTide
      ? [{ key: 'tide' as const, label: 'Tide', points: tidePoints(inputs.tide!), max: 20, note: tideNote(inputs.tide!) }]
      : []),
    { key: 'wind', label: 'Wind', points: windPoints(inputs.wind.speed), max: 15, note: windNote(inputs.wind.speed) },
    { key: 'waterTemp', label: 'Water Temp', points: waterTempPoints(inputs.waterTemp), max: 10, note: waterTempNote(inputs.waterTemp) },
    { key: 'sky', label: 'Sky', points: skyPoints(inputs.sky.condition), max: 10, note: skyNote(inputs.sky.condition) },
  ]

  const base = factors.reduce((sum, f) => sum + f.points, 0)

  // Freshwater: no tide (20pts missing) — scale up to 100
  let total = hasTide ? base : Math.round(base * (100 / 80))

  // Apply severe-condition penalties: dangerous wind or heavy rain cap the score
  let capNote: string | null = null
  if (inputs.wind.speed > 25 && total > 35) {
    total = 35
    capNote = 'Dangerous wind caps the score at 35'
  }
  if (inputs.sky.condition === 'heavy-rain' && total > 45) {
    total = 45
    capNote = capNote ?? 'Heavy rain caps the score at 45'
  }
  total = Math.min(100, Math.max(0, total))

  return { total, factors, scaled: !hasTide, capNote }
}

export function calculateScore(inputs: ScoringInputs): number {
  return calculateScoreBreakdown(inputs).total
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
