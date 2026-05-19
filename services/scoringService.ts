import { calculateScore, calculateScoreWithBreakdown, scoreLabel } from '../features/score/scoringEngine'
import { findBestThreeHourWindow } from '../features/score/bestWindow'
import { detectPhase, hoursFromLastTurn } from '../features/tide/tideUtils'
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
  const condMap: Record<SkyData['icon'], SkyData['condition']> = {
    clear: 'Clear', 'partly-cloudy': 'Partly Cloudy', overcast: 'Overcast',
    'light-rain': 'Light Rain', 'heavy-rain': 'Heavy Rain',
  }
  return { condition: condMap[icon], rainChance, icon }
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
  const waterTempValue = (isToday ? noaa?.waterTemp : null) ?? marine?.waterTemp ?? (spot.type === 'saltwater' ? 65 : 68)

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
  for (let h = 5; h <= 20; h++) {
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

  const windowResult = findBestThreeHourWindow(hourlyScores.map(h => h.score), 5)
  const bestWindow = windowResult
    ? {
        start: formatHourTime(windowResult.startHour),
        end: formatHourTime(windowResult.endHour),
        score: windowResult.avgScore,
      }
    : { start: formatHourTime(5), end: formatHourTime(7), score: 0 }

  // Produce hours from the first NWS period through hour 23.
  // NWS only has future forecast data so never backfill past hours.
  const todayHourly = nws?.hourlyForecast ?? []
  const hourMap = new Map(todayHourly.map(h => [h.hour, h]))
  const firstEntry = todayHourly[0]
  const extendedHourly = firstEntry
    ? Array.from({ length: 24 - firstEntry.hour }, (_, i) => {
        const hour = firstEntry.hour + i
        return hourMap.get(hour) ?? { ...firstEntry, hour }
      })
    : todayHourly

  return {
    fishingScore: currentScore,
    scoreLabel: scoreLabel(currentScore),
    bestWindow,
    wind,
    windHourly: extendedHourly.map(h => ({
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
    water: { temp: waterTempValue, unit: '°F' },
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
