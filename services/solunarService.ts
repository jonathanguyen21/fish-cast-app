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

export interface DailySolunar {
  rating: number
  illumination: number
  phase: number
  phaseLabel: string
  majorPeriods: { start: string; end: string }[]
  isMajorDay: boolean
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
      goldenHourMorning: sunTimes.goldenHourEnd instanceof Date ? formatTime(sunTimes.goldenHourEnd) : undefined,
      goldenHourEvening: sunTimes.goldenHour instanceof Date ? formatTime(sunTimes.goldenHour) : undefined,
    },
    inMajorPeriod,
    inMinorPeriod,
    withinHourOfPeriod,
    isMajorMoonDay,
  }
}

export function getDailySolunar(lat: number, lng: number, date: Date): DailySolunar {
  const noon = new Date(date)
  noon.setHours(12, 0, 0, 0)

  const moonTimes = getMoonTimes(noon, lat, lng)
  const sunTimes = getTimes(noon, lat, lng)
  const illum = getMoonIllumination(noon)

  const majorCenters: Date[] = []
  if (moonTimes.rise && !moonTimes.alwaysUp && !moonTimes.alwaysDown) majorCenters.push(moonTimes.rise)
  if (moonTimes.set && !moonTimes.alwaysUp && !moonTimes.alwaysDown) majorCenters.push(moonTimes.set)

  const isMajorDay = majorCenters.some(
    c => Math.abs(c.getTime() - sunTimes.solarNoon.getTime()) <= 60 * 60 * 1000
  )

  const TWO_HRS = 2 * 60 * 60 * 1000
  const ONE_HR = 60 * 60 * 1000
  const sunrise = sunTimes.sunrise instanceof Date ? sunTimes.sunrise.getTime() : 0
  const sunset = sunTimes.sunset instanceof Date ? sunTimes.sunset.getTime() : 0

  // 0–100 solunar rating
  let score = 10
  // Moon phase peaks at new (phase≈0) and full (phase≈0.5)
  score += Math.round(Math.abs(Math.cos(illum.phase * 2 * Math.PI)) * 25)
  if (isMajorDay) score += 15
  for (const c of majorCenters) {
    const t = c.getTime()
    if ((sunrise && Math.abs(t - sunrise) <= TWO_HRS) || (sunset && Math.abs(t - sunset) <= TWO_HRS)) {
      score += 18
    }
  }
  const minorCenters = findMinorCenters(lat, lng, noon)
  for (const c of minorCenters) {
    const t = c.getTime()
    if ((sunrise && Math.abs(t - sunrise) <= ONE_HR) || (sunset && Math.abs(t - sunset) <= ONE_HR)) {
      score += 8
    }
  }

  return {
    rating: Math.min(100, score),
    illumination: Math.round(illum.fraction * 100),
    phase: illum.phase,
    phaseLabel: moonPhaseLabel(illum.phase),
    majorPeriods: majorCenters.map(toPeriod),
    isMajorDay,
  }
}
