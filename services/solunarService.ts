import type { MoonData, SunData } from '../types/conditions'

export interface SolunarData {
  moon: MoonData
  sun: SunData
  inMajorPeriod: boolean
  inMinorPeriod: boolean
  withinHourOfPeriod: boolean
  isMajorMoonDay: boolean
}

export function calculateSolunar(_lat: number, _lng: number, _date: Date): SolunarData {
  throw new Error('solunarService not yet implemented — Phase B')
}
