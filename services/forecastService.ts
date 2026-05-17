import { calculateScore, scoreLabel } from '../features/score/scoringEngine'
import { calculateSolunar } from './solunarService'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

const NWS_BASE = 'https://api.weather.gov'
const USER_AGENT = `FishCast/1.0 (${process.env.EXPO_PUBLIC_NWS_CONTACT ?? 'fishcast.app@gmail.com'})`

function nwsHeaders() {
  return { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' }
}

function parseWindSpeedFromStr(ws: string): number {
  const matches = ws.match(/\d+/g)
  if (!matches) return 0
  return Math.max(...matches.map(n => parseInt(n, 10)))
}

function mapShortForecastToSkyIcon(forecast: string, rainChance: number): 'clear' | 'partly-cloudy' | 'overcast' | 'light-rain' | 'heavy-rain' {
  const f = forecast.toLowerCase()
  if (f.includes('rain') || f.includes('shower') || f.includes('drizzle')) {
    return rainChance >= 60 ? 'heavy-rain' : 'light-rain'
  }
  if (f.includes('overcast') || f.includes('cloudy')) {
    return f.includes('partly') || f.includes('mostly clear') ? 'partly-cloudy' : 'overcast'
  }
  if (f.includes('partly')) return 'partly-cloudy'
  return 'clear'
}

function skyIconToScoringCondition(icon: string): 'overcast' | 'partly-cloudy' | 'clear' | 'light-rain' | 'heavy-rain' {
  switch (icon) {
    case 'overcast': return 'overcast'
    case 'partly-cloudy': return 'partly-cloudy'
    case 'light-rain': return 'light-rain'
    case 'heavy-rain': return 'heavy-rain'
    default: return 'clear'
  }
}

function parseHourFromTime(t: string): number {
  // Parses "H:MM AM" / "H:MM PM" → 24-hour integer
  const match = t.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!match) return 0
  let h = parseInt(match[1], 10)
  const period = match[3].toUpperCase()
  if (period === 'AM') {
    if (h === 12) h = 0
  } else {
    if (h !== 12) h += 12
  }
  return h
}

export async function fetchForecast(spot: Spot): Promise<DayForecast[]> {
  try {
    const pointsRes = await fetch(
      `${NWS_BASE}/points/${spot.lat.toFixed(4)},${spot.lng.toFixed(4)}`,
      { headers: nwsHeaders() }
    )
    if (!pointsRes.ok) throw new Error(`NWS points failed: ${pointsRes.status}`)
    const points = await pointsRes.json()
    const dailyUrl: string = points.properties.forecast

    const dailyRes = await fetch(dailyUrl, { headers: nwsHeaders() })
    if (!dailyRes.ok) throw new Error(`NWS daily forecast failed: ${dailyRes.status}`)
    const daily = await dailyRes.json()

    const periods: any[] = daily.properties.periods ?? []

    const daytimePeriods = periods.filter((p: any) => p.isDaytime)
    const first7 = daytimePeriods.slice(0, 7)

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const results: DayForecast[] = first7.map((period: any) => {
      const date: string = period.startTime.slice(0, 10)
      const d = new Date(date + 'T12:00:00')

      let dayLabel: string
      if (date === todayStr) {
        dayLabel = 'Today'
      } else {
        dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
      }

      const windSpeed = parseWindSpeedFromStr(period.windSpeed)
      const rainChance: number = period.probabilityOfPrecipitation?.value ?? 0
      const skyIcon = mapShortForecastToSkyIcon(period.shortForecast, rainChance)
      const skyCondition = skyIconToScoringCondition(skyIcon)

      const solunar = calculateSolunar(spot.lat, spot.lng, d)

      // Determine if noon (hour 12) falls within any major or minor period
      const noonInMajor = solunar.moon.majorPeriods.some(p => {
        const startH = parseHourFromTime(p.start)
        const endH = parseHourFromTime(p.end)
        return 12 >= startH && 12 <= endH
      })
      const noonInMinor = !noonInMajor && solunar.moon.minorPeriods.some(p => {
        const startH = parseHourFromTime(p.start)
        const endH = parseHourFromTime(p.end)
        return 12 >= startH && 12 <= endH
      })

      const solunarInputs = {
        inMajorPeriod: noonInMajor,
        inMinorPeriod: noonInMinor,
        withinHourOfPeriod: !noonInMajor && !noonInMinor && (
          solunar.moon.majorPeriods.some(p => Math.abs(12 - parseHourFromTime(p.start)) <= 1 || Math.abs(12 - parseHourFromTime(p.end)) <= 1) ||
          solunar.moon.minorPeriods.some(p => Math.abs(12 - parseHourFromTime(p.start)) <= 1 || Math.abs(12 - parseHourFromTime(p.end)) <= 1)
        ),
        isMajorMoonDay: solunar.isMajorMoonDay,
      }

      const peakScore = calculateScore({
        pressure: { value: 29.92, trend: 'stable', rate: 'normal' },
        solunar: solunarInputs,
        tide: spot.type === 'saltwater' ? { phase: 'incoming', hoursFromTurn: 2 } : null,
        wind: { speed: windSpeed },
        waterTemp: { value: 63, spotType: spot.type },
        sky: { condition: skyCondition },
        spotType: spot.type,
      })

      const peakWindow = solunar.moon.majorPeriods.length > 0
        ? { start: solunar.moon.majorPeriods[0].start, end: solunar.moon.majorPeriods[0].end }
        : { start: '8:00 AM', end: '11:00 AM' }

      return {
        date,
        dayLabel,
        peakScore,
        scoreLabel: scoreLabel(peakScore),
        peakWindow,
      }
    })

    return results
  } catch {
    return []
  }
}
