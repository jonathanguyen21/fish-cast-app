import type { Species, SpeciesScore, TimeOfDay } from '../../types/species'
import type { TidePhase } from '../tide/tideUtils'

export interface ScoringContext {
  month: number         // 1–12
  waterTemp: number     // °F
  tidePhase: TidePhase
  currentHour: number   // 0–23
}

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

export function hourToTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour <= 7) return 'dawn'
  if (hour >= 8 && hour <= 11) return 'morning'
  if (hour >= 12 && hour <= 14) return 'midday'
  if (hour >= 15 && hour <= 17) return 'afternoon'
  if (hour >= 18 && hour <= 20) return 'dusk'
  return 'night'
}

function deriveStatus(score: number, isPeak: boolean, isPresent: boolean): SpeciesScore['status'] {
  if (!isPresent) return 'Inactive'
  if (isPeak && score >= 70) return 'Peak Season'
  if (score >= 55) return 'Active'
  return 'Present'
}

export function scoreSpecies(species: Species, ctx: ScoringContext): SpeciesScore {
  const isPresent = species.months_present.includes(ctx.month)
  const isPeak = species.months_peak.includes(ctx.month)

  if (!isPresent) {
    return {
      species,
      score: 0,
      status: 'Inactive',
      waterTempMatch: `Outside season`,
      tideMatch: `Outside season`,
      timeMatch: `Outside season`,
    }
  }

  const score = Math.min(100, monthPoints(species, ctx.month) +
    tempPoints(species, ctx.waterTemp) +
    tidePoints(species, ctx.tidePhase) +
    timePoints(species, ctx.currentHour))

  const { min, max, peak_min, peak_max } = species.water_temp_f
  const tempLabel = ctx.waterTemp >= peak_min && ctx.waterTemp <= peak_max
    ? `Peak range (${ctx.waterTemp}°F — optimal ${peak_min}–${peak_max}°F)`
    : ctx.waterTemp >= min && ctx.waterTemp <= max
      ? `In range (${ctx.waterTemp}°F — optimal ${peak_min}–${peak_max}°F)`
      : `Outside range (${ctx.waterTemp}°F — optimal ${peak_min}–${peak_max}°F)`

  const tideLabel = species.preferred_tide === 'any'
    ? `${ctx.tidePhase} — neutral`
    : ctx.tidePhase === species.preferred_tide
      ? `${ctx.tidePhase} — preferred`
      : `${ctx.tidePhase} — not preferred`

  const tod = hourToTimeOfDay(ctx.currentHour)
  const timeLabel = species.preferred_time_of_day.includes(tod)
    ? `${tod} — prime time`
    : `${tod} — secondary`

  return {
    species,
    score,
    status: deriveStatus(score, isPeak, isPresent),
    waterTempMatch: tempLabel,
    tideMatch: tideLabel,
    timeMatch: timeLabel,
  }
}
