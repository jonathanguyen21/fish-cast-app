import { getMoonTimes, getMoonIllumination, getMoonPosition, getTimes } from 'suncalc'
import type { MoonData, SunData } from '../types/conditions'

export interface SolunarData {
  moon: MoonData
  sun: SunData
  inMajorPeriod: boolean
  inMinorPeriod: boolean
  withinHourOfPeriod: boolean
  isMajorMoonDay: boolean
}

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function moonPhaseLabel(phase: number): string {
  if (phase < 0.0625 || phase >= 0.9375) return 'New Moon'
  if (phase < 0.1875) return 'Waxing Crescent'
  if (phase < 0.3125) return 'First Quarter'
  if (phase < 0.4375) return 'Waxing Gibbous'
  if (phase < 0.5625) return 'Full Moon'
  if (phase < 0.6875) return 'Waning Gibbous'
  if (phase < 0.8125) return 'Last Quarter'
  return 'Waning Crescent'
}

function toPeriod(center: Date): { start: string; end: string } {
  const HALF = 30 * 60 * 1000
  return {
    start: formatTime(new Date(center.getTime() - HALF)),
    end: formatTime(new Date(center.getTime() + HALF)),
  }
}

function findMinorCenters(lat: number, lng: number, date: Date): Date[] {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  let maxAlt = -Infinity, minAlt = Infinity
  let maxTime = base, minTime = base
  for (let h = 0; h < 24; h++) {
    const t = new Date(base.getTime() + h * 3_600_000)
    const { altitude } = getMoonPosition(t, lat, lng)
    if (altitude > maxAlt) { maxAlt = altitude; maxTime = t }
    if (altitude < minAlt) { minAlt = altitude; minTime = t }
  }
  return [maxTime, minTime]
}

function isWithin(date: Date, center: Date, ms: number): boolean {
  return Math.abs(date.getTime() - center.getTime()) <= ms
}

export function calculateSolunar(lat: number, lng: number, date: Date): SolunarData {
  const moonTimes = getMoonTimes(date, lat, lng)
  const sunTimes = getTimes(date, lat, lng)
  const illum = getMoonIllumination(date)

  const HALF = 30 * 60 * 1000
  const ONE_HR = 60 * 60 * 1000

  const majorCenters: Date[] = []
  if (moonTimes.rise && !moonTimes.alwaysUp && !moonTimes.alwaysDown) majorCenters.push(moonTimes.rise)
  if (moonTimes.set && !moonTimes.alwaysUp && !moonTimes.alwaysDown) majorCenters.push(moonTimes.set)

  const minorCenters = findMinorCenters(lat, lng, date)

  const inMajorPeriod = majorCenters.some(c => isWithin(date, c, HALF))
  const inMinorPeriod = !inMajorPeriod && minorCenters.some(c => isWithin(date, c, HALF))
  const withinHourOfPeriod =
    !inMajorPeriod &&
    !inMinorPeriod &&
    (majorCenters.some(c => isWithin(date, c, ONE_HR)) ||
      minorCenters.some(c => isWithin(date, c, ONE_HR)))

  const isMajorMoonDay = majorCenters.some(c => isWithin(c, sunTimes.solarNoon, ONE_HR))

  return {
    moon: {
      phase: moonPhaseLabel(illum.phase),
      illumination: Math.round(illum.fraction * 100),
      majorPeriods: majorCenters.map(toPeriod),
      minorPeriods: minorCenters.map(toPeriod),
    },
    sun: {
      sunrise: formatTime(sunTimes.sunrise),
      sunset: formatTime(sunTimes.sunset),
    },
    inMajorPeriod,
    inMinorPeriod,
    withinHourOfPeriod,
    isMajorMoonDay,
  }
}
