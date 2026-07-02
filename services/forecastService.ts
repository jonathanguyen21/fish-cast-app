import { calculateScoreBreakdown, scoreLabel } from '../features/score/scoringEngine'
import { detectPhase, hoursFromLastTurn } from '../features/tide/tideUtils'
import { calculateSolunar } from './solunarService'
import { fetchNwsData } from './nwsService'
import type { NwsData } from './nwsService'
import { fetchTideWeek } from './noaaService'
import type { TideWeek } from './noaaService'
import {
  NEUTRAL_PRESSURE, NEUTRAL_WIND,
  formatHourLabel, formatHourTime, getHourlySolunar, skyIconFor,
} from './scoringService'
import type { DayForecast, HourlyScore } from '../types/conditions'
import type { Spot } from '../types/spot'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function buildForecastDays(
  nws: NwsData | null,
  tideWeek: TideWeek | null,
  spot: Spot,
  now: Date
): DayForecast[] {
  const days: DayForecast[] = []
  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(now)
    dayDate.setDate(dayDate.getDate() + d)
    dayDate.setHours(12, 0, 0, 0)
    const dateKey = localDateKey(dayDate)
    const solunar = calculateSolunar(spot.lat, spot.lng, dayDate)
    const curve = tideWeek?.curvesByDate[dateKey] ?? null

    const hourlyScores: HourlyScore[] = []
    for (let h = 0; h < 24; h++) {
      const target = new Date(dayDate)
      target.setHours(h, 0, 0, 0)
      const period = nws?.hourlyForecast.find(
        p => Math.abs(p.epochMs - target.getTime()) < 30 * 60 * 1000
      ) ?? null
      const hourBreakdown = calculateScoreBreakdown({
        // Pressure is not forecastable from our free sources — future days score neutral.
        pressure: { value: NEUTRAL_PRESSURE.value, trend: NEUTRAL_PRESSURE.trend, rate: NEUTRAL_PRESSURE.rate },
        tide: curve
          ? { phase: detectPhase(curve, h), hoursFromTurn: hoursFromLastTurn(curve, h) }
          : null,
        waterTemp: { value: spot.type === 'saltwater' ? 65 : 68, spotType: spot.type },
        spotType: spot.type,
        solunar: getHourlySolunar(solunar, h),
        wind: { speed: period ? period.windSpeed : NEUTRAL_WIND.speed },
        sky: { condition: period ? skyIconFor(period.cloudCover, period.rainChance) : 'partly-cloudy' },
      })
      hourlyScores.push({
        hour: formatHourLabel(h),
        hourIndex: h,
        score: hourBreakdown.total,
        breakdown: hourBreakdown,
      })
    }

    let peak = {
      start: formatHourTime(0),
      end: formatHourTime(2),
      score: Math.round((hourlyScores[0].score + hourlyScores[1].score + hourlyScores[2].score) / 3),
    }
    for (let i = 1; i <= 21; i++) {
      const avg = Math.round(
        (hourlyScores[i].score + hourlyScores[i + 1].score + hourlyScores[i + 2].score) / 3
      )
      if (avg > peak.score) peak = { start: formatHourTime(i), end: formatHourTime(i + 2), score: avg }
    }

    days.push({
      date: dateKey,
      dayLabel: d === 0 ? 'Today' : DAY_LABELS[dayDate.getDay()],
      peakScore: peak.score,
      scoreLabel: scoreLabel(peak.score),
      peakWindow: { start: peak.start, end: peak.end },
      hourlyScores,
      tideEvents: tideWeek?.eventsByDate[dateKey] ?? [],
      sun: solunar.sun,
      moon: solunar.moon,
    })
  }
  return days
}

export async function fetchForecast(spot: Spot): Promise<DayForecast[]> {
  const [nws, tideWeek] = await Promise.all([
    fetchNwsData(spot).catch(() => null),
    spot.stationId ? fetchTideWeek(spot.stationId).catch(() => null) : Promise.resolve<TideWeek | null>(null),
  ])
  if (nws === null && tideWeek === null) {
    throw new Error('Forecast unavailable — both NWS and NOAA sources failed')
  }
  return buildForecastDays(nws, tideWeek, spot, new Date())
}
