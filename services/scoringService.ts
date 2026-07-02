import { calculateScore, scoreLabel } from '../features/score/scoringEngine'
import { detectPhase, hoursFromLastTurn } from '../features/tide/tideUtils'
import type { ConditionsData, SkyData, WindData, PressureData, HourlyScore } from '../types/conditions'
import type { Spot } from '../types/spot'
import type { NoaaData } from './noaaService'
import type { NwsData } from './nwsService'
import type { SolunarData } from './solunarService'
import type { SwellData } from '../types/conditions'
import type { ScoringInputs } from '../features/score/scoringEngine'

const NEUTRAL_PRESSURE: PressureData = { value: 29.92, trend: 'stable', rate: 'normal', unit: 'inHg', readings: [] }
const NEUTRAL_WIND: WindData = { speed: 8, gusts: 12, direction: 0, directionLabel: 'N', unit: 'mph' }
const NEUTRAL_SKY: SkyData = { condition: 'Partly Cloudy', rainChance: 20, icon: 'partly-cloudy' }

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
  noaa: NoaaData | null,
  nws: NwsData | null,
  marine: SwellData | null,
  solunar: SolunarData,
  spot: Spot,
  now: Date
): ConditionsData {
  const pressure = noaa?.pressure ?? NEUTRAL_PRESSURE
  const wind = noaa?.wind ?? nws?.wind ?? NEUTRAL_WIND
  const sky = nws?.sky ?? NEUTRAL_SKY
  const waterTempValue = noaa?.waterTemp ?? (spot.type === 'saltwater' ? 65 : 68)
  const tide = noaa?.tide ?? null

  const currentHour = now.getHours()
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

  const currentScore = calculateScore({
    ...baseInputs,
    solunar: solunar,
    wind: { speed: wind.speed },
    sky: { condition: sky.icon },
  })

  // Hourly scores: all 24 hours (0–23); hourIndex == hour
  const hourlyScores: HourlyScore[] = []
  for (let h = 0; h < 24; h++) {
    const hourTide = hourlyCurve.length > 0
      ? { phase: detectPhase(hourlyCurve, h), hoursFromTurn: hoursFromLastTurn(hourlyCurve, h) }
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

  // Best 3-hour window that starts now or later
  const windowAvg = (i: number) => Math.round(
    (hourlyScores[i].score + hourlyScores[i + 1].score + hourlyScores[i + 2].score) / 3
  )
  let bestWindow: ConditionsData['bestWindow'] | null = null
  for (let i = currentHour; i <= 21; i++) {
    const avg = windowAvg(i)
    if (!bestWindow || avg > bestWindow.score) {
      bestWindow = { start: formatHourTime(i), end: formatHourTime(i + 2), score: avg }
    }
  }
  if (!bestWindow) {
    // 10 PM or later — every window today has already started; report the day's peak honestly
    let peak = { start: formatHourTime(0), end: formatHourTime(2), score: windowAvg(0) }
    for (let i = 1; i <= 21; i++) {
      const avg = windowAvg(i)
      if (avg > peak.score) peak = { start: formatHourTime(i), end: formatHourTime(i + 2), score: avg }
    }
    bestWindow = { ...peak, passed: true }
  }

  return {
    fishingScore: currentScore,
    scoreLabel: scoreLabel(currentScore),
    bestWindow,
    wind,
    windHourly: nws?.hourlyForecast.map(h => ({
      hour: h.hour,
      speed: h.windSpeed,
      directionLabel: h.windDirection,
    })) ?? [],
    tide,
    water: { temp: waterTempValue, unit: '°F' },
    air: nws?.air ?? { temp: 65, high: 70, low: 58, humidity: 70, unit: '°F' },
    pressure,
    swell: marine,
    sky,
    sun: solunar.sun,
    moon: solunar.moon,
    hourlyScores,
  }
}

// Keep legacy stub shape for forecastService (Phase B2)
export async function fetchConditions(_spot: Spot): Promise<ConditionsData> {
  throw new Error('fetchConditions not used in Phase B1 — use buildConditionsData via useConditions')
}
