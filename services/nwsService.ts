import type { AirData, SkyData, WindData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface NwsData {
  air: AirData
  sky: SkyData
  wind: WindData
  hourlyForecast: {
    hour: number
    windSpeed: number
    windGust: number
    cloudCover: number
    rainChance: number
    windDirection: string
    directionDeg: number
    temp: number
  }[]
}

export interface NwsMultiDay {
  today: NwsData
  byDay: Record<string, NwsData>
}

const NWS_BASE = 'https://api.weather.gov'
const USER_AGENT = `FishCast/1.0 (${process.env.EXPO_PUBLIC_NWS_CONTACT ?? 'fishcast.app@gmail.com'})`

function nwsHeaders() {
  return { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' }
}

function parseWindSpeed(ws: string): number {
  const match = ws.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function directionToDegrees(dir: string): number {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
    SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  }
  return map[dir.toUpperCase()] ?? 0
}

function mapSkyIcon(forecast: string, rainChance: number): SkyData['icon'] {
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

function iconToCondition(icon: SkyData['icon']): SkyData['condition'] {
  const map: Record<SkyData['icon'], SkyData['condition']> = {
    'clear': 'Clear', 'partly-cloudy': 'Partly Cloudy', 'overcast': 'Overcast',
    'light-rain': 'Light Rain', 'heavy-rain': 'Heavy Rain',
  }
  return map[icon]
}

function buildNwsDataForPeriods(periods: any[]): NwsData {
  if (periods.length === 0) {
    return {
      air: { temp: 65, high: 70, low: 58, humidity: 70, unit: '°F' },
      sky: { condition: 'Partly Cloudy', rainChance: 20, icon: 'partly-cloudy' },
      wind: { speed: 8, gusts: 13, direction: 0, directionLabel: 'N', unit: 'mph' },
      hourlyForecast: [],
    }
  }
  const nowMs = Date.now()
  const currentPeriod = periods.reduce((best: any, p: any) => {
    const pMs = new Date(p.startTime).getTime()
    const bestMs = new Date(best.startTime).getTime()
    if (pMs <= nowMs && pMs > bestMs) return p
    return best
  }, periods[0])

  const rainChance = currentPeriod.probabilityOfPrecipitation?.value ?? 0
  const icon = mapSkyIcon(currentPeriod.shortForecast, rainChance)
  const temps = periods.map((p: any) => p.temperature as number)
  const windSpeed = parseWindSpeed(currentPeriod.windSpeed)

  return {
    air: {
      temp: currentPeriod.temperature,
      high: Math.max(...temps),
      low: Math.min(...temps),
      humidity: currentPeriod.relativeHumidity?.value ?? 70,
      unit: '°F',
    },
    sky: { condition: iconToCondition(icon), rainChance, icon },
    wind: {
      speed: windSpeed,
      gusts: currentPeriod.windGust ? parseWindSpeed(currentPeriod.windGust) : windSpeed + 5,
      direction: directionToDegrees(currentPeriod.windDirection),
      directionLabel: currentPeriod.windDirection,
      unit: 'mph',
    },
    hourlyForecast: periods.map((p: any) => ({
      hour: new Date(p.startTime).getHours(),
      windSpeed: parseWindSpeed(p.windSpeed),
      windGust: p.windGust ? parseWindSpeed(p.windGust) : parseWindSpeed(p.windSpeed) + 5,
      cloudCover: p.shortForecast.toLowerCase().includes('cloud') ? 70 : 20,
      rainChance: p.probabilityOfPrecipitation?.value ?? 0,
      windDirection: (p.windDirection || 'N') as string,
      directionDeg: directionToDegrees(p.windDirection || 'N'),
      temp: p.temperature as number ?? 65,
    })),
  }
}

function groupByDay(periods: any[]): Record<string, NwsData> {
  const dayMap: Record<string, any[]> = {}
  for (const p of periods) {
    const dateStr = p.startTime.slice(0, 10)
    if (!dayMap[dateStr]) dayMap[dateStr] = []
    dayMap[dateStr].push(p)
  }
  const result: Record<string, NwsData> = {}
  for (const [date, dayPeriods] of Object.entries(dayMap)) {
    result[date] = buildNwsDataForPeriods(dayPeriods)
  }
  return result
}

export async function fetchNwsData(spot: Spot): Promise<NwsMultiDay> {
  const pointsRes = await fetch(
    `${NWS_BASE}/points/${spot.lat.toFixed(4)},${spot.lng.toFixed(4)}`,
    { headers: nwsHeaders() }
  )
  if (!pointsRes.ok) throw new Error(`NWS points failed: ${pointsRes.status}`)
  const points = await pointsRes.json()
  const hourlyUrl: string = points.properties.forecastHourly

  const hourlyRes = await fetch(hourlyUrl, { headers: nwsHeaders() })
  if (!hourlyRes.ok) throw new Error(`NWS hourly failed: ${hourlyRes.status}`)
  const hourly = await hourlyRes.json()

  const periods: any[] = hourly.properties.periods ?? []
  if (periods.length === 0) throw new Error('NWS returned no forecast periods')

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayPeriods = periods.filter((p: any) => p.startTime.slice(0, 10) === todayKey)
  const byDay = groupByDay(periods)
  return {
    today: buildNwsDataForPeriods(todayPeriods.length > 0 ? todayPeriods : periods),
    byDay,
  }
}
