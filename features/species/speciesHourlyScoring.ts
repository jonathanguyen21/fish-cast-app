import type { Species } from '../../types/species'
import type { TidePhase } from '../tide/tideUtils'
import { hourToTimeOfDay } from './speciesScoring'
import { findBestThreeHourWindow } from '../score/bestWindow'

export interface SpeciesHourlyScore {
  hour: number   // 5..20 (hour-of-day, 24h)
  score: number  // 0..100
}

export interface SpeciesHourlyContext {
  month: number        // 1..12
  waterTemp: number    // °F
  tidePhasesByHour: Record<number, TidePhase>  // keys 5..20
}

export interface SpeciesBestWindow {
  start: number      // hour-of-day
  end: number        // hour-of-day (start + 2)
  avgScore: number
  peakHour: number
  peakScore: number
}

export type WindowHint =
  | { kind: 'peaking-now' }
  | { kind: 'opens-at'; atHour: number }
  | { kind: 'window'; start: number; end: number }

const HOURS = Array.from({ length: 16 }, (_, i) => 5 + i)  // [5..20]

function monthPoints(species: Species, month: number): number {
  if (!species.months_present.includes(month)) return 0
  if (species.months_peak.includes(month)) return 40
  return 20
}

function tempPoints(species: Species, waterTemp: number): number {
  const { min, max, peak_min, peak_max } = species.water_temp_f
  if (waterTemp >= peak_min && waterTemp <= peak_max) return 30
  if (waterTemp >= min && waterTemp <= max) return 20
  if (waterTemp >= min - 5 && waterTemp <= max + 5) return 10
  return 0
}

function tidePoints(species: Species, tidePhase: TidePhase): number {
  if (species.preferred_tide === 'any') return 15
  if (species.preferred_tide === tidePhase) return 15
  if (tidePhase === 'slack') return 8
  return 5
}

function timePoints(species: Species, hour: number): number {
  const tod = hourToTimeOfDay(hour)
  if (species.preferred_time_of_day.includes(tod)) return 15
  return 5
}

export function scoreSpeciesHourly(
  species: Species,
  ctx: SpeciesHourlyContext
): SpeciesHourlyScore[] {
  if (!species.months_present.includes(ctx.month)) {
    return HOURS.map(h => ({ hour: h, score: 0 }))
  }

  const monthPts = monthPoints(species, ctx.month)
  const tempPts = tempPoints(species, ctx.waterTemp)

  return HOURS.map(h => {
    const phase = ctx.tidePhasesByHour[h] ?? 'slack'
    const score = Math.min(100, monthPts + tempPts + tidePoints(species, phase) + timePoints(species, h))
    return { hour: h, score }
  })
}

export function bestWindowSummary(
  hourly: SpeciesHourlyScore[]
): SpeciesBestWindow | null {
  if (hourly.length === 0) return null
  if (hourly.every(e => e.score === 0)) return null
  const startHour = hourly[0].hour
  const window = findBestThreeHourWindow(hourly.map(e => e.score), startHour)
  if (!window) return null

  let peakHour = window.startHour
  let peakScore = -1
  for (const e of hourly) {
    if (e.hour >= window.startHour && e.hour <= window.endHour && e.score > peakScore) {
      peakScore = e.score
      peakHour = e.hour
    }
  }

  return {
    start: window.startHour,
    end: window.endHour,
    avgScore: window.avgScore,
    peakHour,
    peakScore,
  }
}

export function describeBestWindow(
  hourly: SpeciesHourlyScore[],
  currentHour: number
): WindowHint | null {
  if (hourly.length === 0) return null
  if (hourly.every(e => e.score === 0)) return null

  const maxScore = Math.max(...hourly.map(e => e.score))
  const maxEntry = hourly.find(e => e.score === maxScore)!
  const currentEntry = hourly.find(e => e.hour === currentHour)

  if (currentEntry && currentEntry.score >= maxScore - 5) {
    return { kind: 'peaking-now' }
  }
  if (maxEntry.hour > currentHour) {
    return { kind: 'opens-at', atHour: maxEntry.hour }
  }
  const window = bestWindowSummary(hourly)
  if (!window) return null
  return { kind: 'window', start: window.start, end: window.end }
}
