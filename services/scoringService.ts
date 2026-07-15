import { calculateScore, calculateScoreWithBreakdown, scoreLabel } from '../features/score/scoringEngine'
import { findBestThreeHourWindow } from '../features/score/bestWindow'
import { detectPhase, hoursFromLastTurn } from '../features/tide/tideUtils'
import { skyConditionLabel } from '../theme/weatherIcon'
import type { ConditionsData, SkyData, WindData, PressureData, HourlyScore, ScoreBreakdown } from '../types/conditions'
import type { Spot } from '../types/spot'
import type { NoaaData } from './noaaService'
import type { NwsData } from './nwsService'
import type { MarineDay } from './marineService'
import type { SolunarData } from './solunarService'
import type { ScoringInputs } from '../features/score/scoringEngine'
import type { TidePhase } from '../features/tide/tideUtils'

const NEUTRAL_PRESSURE: PressureData = { value: 29.92, trend: 'stable', rate: 'normal', unit: 'inHg', readings: [] }
const NEUTRAL_WIND: WindData = { speed: 8, gusts: 12, direction: 0, directionLabel: 'N', unit: 'mph' }
const NEUTRAL_SKY: SkyData = { condition: 'Partly Cloudy', rainChance: 20, icon: 'partly-cloudy' }

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseHourFromTimeString(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h
}

function formatHourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

function formatHourTime(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:00 ${period}`
}

function isHourInWindow(hour: number, periods: { start: string; end: string }[]): boolean {
  for (const p of periods) {
    const s = parseHourFromTimeString(p.start)
    const e = parseHourFromTimeString(p.end)
    if (s >= 0 && e >= 0 && hour >= s && hour <= e) return true
  }
  return false
}

function getHourlySolunar(solunar: SolunarData, hour: number): ScoringInputs['solunar'] {
  const inMajor = isHourInWindow(hour, solunar.moon.majorPeriods)
  const inMinor = !inMajor && isHourInWindow(hour, solunar.moon.minorPeriods)
  const nearMajor = !inMajor && !inMinor &&
    solunar.moon.majorPeriods.some(p => {
      const center = (parseHourFromTimeString(p.start) + parseHourFromTimeString(p.end)) / 2
      return Math.abs(hour - center) <= 1
    })
  return {
    inMajorPeriod: inMajor,
    inMinorPeriod: inMinor,
    withinHourOfPeriod: nearMajor,
    isMajorMoonDay: solunar.isMajorMoonDay,
  }
}

function getHourlyWind(nws: NwsData | null, hour: number): WindData {
  if (!nws) return NEUTRAL_WIND
  const period = nws.hourlyForecast.find(h => h.hour === hour) ?? nws.hourlyForecast[0]
  if (!period) return NEUTRAL_WIND
  return { ...nws.wind, speed: period.windSpeed, gusts: period.windSpeed + 5 }
}

function getHourlySky(nws: NwsData | null, hour: number): SkyData {
  if (!nws) return NEUTRAL_SKY
  const period = nws.hourlyForecast.find(h => h.hour === hour) ?? nws.hourlyForecast[0]
  if (!period) return nws.sky
  const rainChance = period.rainChance
  let icon: SkyData['icon'] = period.cloudCover > 70 ? 'overcast' :
    period.cloudCover > 30 ? 'partly-cloudy' : 'clear'
  if (rainChance >= 60) icon = 'heavy-rain'
  else if (rainChance >= 30) icon = 'light-rain'
  return { condition: skyConditionLabel(icon), rainChance, icon }
}

export function buildConditionsData(
  date: string,
  noaa: NoaaData | null,
  nwsByDay: Record<string, NwsData> | null,
  marineByDay: Record<string, MarineDay> | null,
  solunar: SolunarData,
  spot: Spot,
  refDate: Date
): ConditionsData {
  const nws = nwsByDay?.[date] ?? null
  const marine = marineByDay?.[date] ?? null
  const tide = noaa?.tideByDay?.[date] ?? null

  const todayKey = localDateKey(new Date())
  const isToday = date === todayKey

  const pressure = (isToday ? noaa?.pressure : null) ?? marine?.pressure ?? NEUTRAL_PRESSURE
  const wind = (isToday ? noaa?.wind : null) ?? nws?.wind ?? NEUTRAL_WIND
  const sky = nws?.sky ?? NEUTRAL_SKY
  const liveWaterTemp = (isToday ? noaa?.waterTemp : null) ?? marine?.waterTemp ?? null
  const waterTempValue = liveWaterTemp ?? (spot.type === 'saltwater' ? 65 : 68)
  const waterTempEstimated = liveWaterTemp == null

  const currentHour = refDate.getHours()
  const hourlyCurve = tide?.hourlyCurve ?? []
  const tideForScore = tide
    ? {
        phase: detectPhase(hourlyCurve, currentHour),
        hoursFromTurn: hoursFromLastTurn(hourlyCurve, currentHour),
      }
    : null

  const baseInputs: Omit<ScoringInputs, 'solunar' | 'sky' | 'wind'> = {
    pressure: { value: pressure.value, trend: pressure.trend, rate: pressure.rate },
    tide: tideForScore,
    waterTemp: { value: waterTempValue, spotType: spot.type },
    spotType: spot.type,
  }

  const { score: currentScore, breakdown: scoreBreakdown } = calculateScoreWithBreakdown({
    ...baseInputs,
    solunar: solunar,
    wind: { speed: wind.speed },
    sky: { condition: sky.icon },
  })

  const hourlyScores: HourlyScore[] = []
  const tidePhasesByHour: Record<number, TidePhase> = {}
  for (let h = 0; h < 24; h++) {
    const phase = hourlyCurve.length > 0 ? detectPhase(hourlyCurve, h) : 'slack'
    tidePhasesByHour[h] = phase
    const hourTide = hourlyCurve.length > 0
      ? { phase, hoursFromTurn: hoursFromLastTurn(hourlyCurve, h) }
      : null
    const hourSky = getHourlySky(nws, h)
    const hourWind = getHourlyWind(nws, h)
    const hourSolunar = getHourlySolunar(solunar, h)
    hourlyScores.push({
      hour: formatHourLabel(h),
      hourIndex: h,
      score: calculateScore({
        pressure: { value: pressure.value, trend: pressure.trend, rate: pressure.rate },
        tide: hourTide,
        waterTemp: { value: waterTempValue, spotType: spot.type },
        spotType: spot.type,
        solunar: hourSolunar,
        wind: { speed: hourWind.speed },
        sky: { condition: hourSky.icon },
      }),
    })
  }

  // For today, only recommend windows that haven't started yet; past 10 PM
  // every window has begun, so report the day's peak flagged as passed.
  const allScores = hourlyScores.map(h => h.score)
  const wholeDay = findBestThreeHourWindow(allScores, 0)
  let bestWindow: ConditionsData['bestWindow']
  if (!wholeDay) {
    bestWindow = { start: formatHourTime(5), end: formatHourTime(7), score: 0 }
  } else if (isToday && currentHour > 21) {
    bestWindow = {
      start: formatHourTime(wholeDay.startHour),
      end: formatHourTime(wholeDay.endHour),
      score: wholeDay.avgScore,
      passed: true,
    }
  } else if (isToday && currentHour > 0) {
    const future = findBestThreeHourWindow(allScores.slice(currentHour), currentHour)!
    bestWindow = {
      start: formatHourTime(future.startHour),
      end: formatHourTime(future.endHour),
      score: future.avgScore,
    }
  } else {
    bestWindow = {
      start: formatHourTime(wholeDay.startHour),
      end: formatHourTime(wholeDay.endHour),
      score: wholeDay.avgScore,
    }
  }

  // NWS only has future forecast data, so hours before the first period
  // (this morning, if it's currently afternoon) have no real reading —
  // clone the first entry's conditions for those too, same as the in-range
  // gap-fill below. This keeps windHourly's fallback and airHourly covering
  // the full 0-23 day so bite-curve scrubbing (which spans the whole day,
  // not just from now onward) always finds an hour to show instead of
  // silently reverting to "now" for any hour before the current one.
  const todayHourly = nws?.hourlyForecast ?? []
  const hourMap = new Map(todayHourly.map(h => [h.hour, h]))
  const firstEntry = todayHourly[0]
  const extendedHourly = firstEntry
    ? Array.from({ length: 24 }, (_, hour) => hourMap.get(hour) ?? { ...firstEntry, hour })
    : todayHourly

  return {
    fishingScore: currentScore,
    scoreLabel: scoreLabel(currentScore),
    bestWindow,
    wind,
    windHourly: marine?.windHourly?.length
      ? marine.windHourly
      : extendedHourly.map(h => ({
          hour: h.hour,
          speed: h.windSpeed,
          gusts: h.windGust,
          direction: h.directionDeg,
          directionLabel: h.windDirection,
        })),
    airHourly: extendedHourly.map(h => ({
      hour: h.hour,
      temp: h.temp,
      rainChance: h.rainChance,
      cloudCover: h.cloudCover,
    })),
    swellHourly: marine?.swellHourly ?? null,
    tide,
    water: { temp: waterTempValue, unit: '°F', estimated: waterTempEstimated },
    air: nws?.air ?? { temp: 65, high: 70, low: 58, humidity: 70, unit: '°F' },
    pressure,
    swell: marine?.swell ?? null,
    sky,
    sun: solunar.sun,
    moon: solunar.moon,
    hourlyScores,
    tidePhasesByHour,
    scoreBreakdown,
  }
}
