import type { TideData, WindData, PressureData, TideEvent } from '../types/conditions'
import type { Spot } from '../types/spot'
import { detectPhase } from '../features/tide/tideUtils'

export interface NoaaData {
  tideByDay: Record<string, TideData | null>
  wind: WindData | null
  waterTemp: number | null
  pressure: PressureData | null
  airTemp: number | null
}

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
const COMMON = 'time_zone=lst_ldt&units=english&format=json'

function noaaDateStr(d: Date): string {
  return localDateKey(d).replace(/-/g, '')
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildUrl(station: string, product: string, extra = ''): string {
  return `${BASE}?station=${station}&date=today&${COMMON}&product=${product}${extra}`
}

function buildPredictionsUrl(station: string, interval: string): string {
  const today = new Date()
  const end = new Date(today)
  end.setDate(today.getDate() + 6)
  return `${BASE}?station=${station}&begin_date=${noaaDateStr(today)}&end_date=${noaaDateStr(end)}&${COMMON}&product=predictions&interval=${interval}&datum=MLLW`
}

async function fetchProduct(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.error ? null : json
}

function formatNoaaTime(t: string): string {
  const timePart = t.split(' ')[1] ?? '00:00'
  const [hStr, mStr] = timePart.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function parseTideEventsByDay(data: any): Record<string, TideEvent[]> {
  if (!data?.predictions) return {}
  const byDay: Record<string, TideEvent[]> = {}
  for (const p of data.predictions) {
    const dateStr = p.t.slice(0, 10)
    if (!byDay[dateStr]) byDay[dateStr] = []
    byDay[dateStr].push({
      type: (p.type === 'H' ? 'high' : 'low') as 'high' | 'low',
      time: formatNoaaTime(p.t),
      height: parseFloat(p.v),
    })
  }
  return byDay
}

function parseHourlyCurvesByDay(data: any): Record<string, number[]> {
  if (!data?.predictions) return {}
  const byDay: Record<string, number[]> = {}
  for (const p of data.predictions) {
    const dateStr = p.t.slice(0, 10)
    const hour = parseInt((p.t.split(' ')[1] ?? '0:00').split(':')[0], 10)
    if (!byDay[dateStr]) byDay[dateStr] = new Array(24).fill(0)
    if (hour >= 0 && hour < 24) byDay[dateStr][hour] = parseFloat(p.v) || 0
  }
  return byDay
}

function buildTideForDay(events: TideEvent[], curve: number[], refHour: number): TideData | null {
  if (events.length === 0) return null
  const currentHeight = curve[refHour] ?? 0
  const prevHeight = curve[Math.max(0, refHour - 1)] ?? 0
  const phase = detectPhase(curve, refHour)
  const nowMinutes = refHour * 60
  const futureEvent = events.find(e => {
    const match = e.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) return false
    let h = parseInt(match[1])
    const m = parseInt(match[2])
    const p = match[3].toUpperCase()
    if (p === 'PM' && h !== 12) h += 12
    if (p === 'AM' && h === 12) h = 0
    return h * 60 + m > nowMinutes
  }) ?? events[0]
  return {
    current: { height: parseFloat(currentHeight.toFixed(1)), rising: currentHeight > prevHeight, unit: 'ft' },
    next: futureEvent,
    events,
    hourlyCurve: curve,
    phase,
  }
}

function parseWind(data: any): WindData | null {
  const d = data?.data?.[0]
  if (!d) return null
  return {
    speed: parseFloat(d.s) || 0,
    gusts: parseFloat(d.g) || 0,
    direction: parseFloat(d.d) || 0,
    directionLabel: d.dr || 'N',
    unit: 'mph',
  }
}

function parsePressure(data: any): PressureData | null {
  if (!data?.data?.length) return null
  const readings = data.data
    .map((d: any) => parseFloat(d.v))
    .filter((v: number) => !isNaN(v))
  if (readings.length === 0) return null

  // data arrives newest-first; reverse so index 0 = oldest (left of chart)
  const orderedReadings = [...readings].reverse()

  const current = readings[0]
  const threeHrAgo = readings[Math.min(3, readings.length - 1)]
  const delta = current - threeHrAgo
  const abs = Math.abs(delta)

  return {
    value: current,
    trend: delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable',
    rate: abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast',
    unit: 'inHg',
    readings: orderedReadings,
  }
}

export async function fetchNoaaData(spot: Spot): Promise<NoaaData> {
  if (!spot.stationId) {
    return { tideByDay: {}, wind: null, waterTemp: null, pressure: null, airTemp: null }
  }

  const id = spot.stationId
  const [hiLoRes, curveRes, tempRes, windRes, pressureRes] = await Promise.allSettled([
    fetchProduct(buildPredictionsUrl(id, 'hilo')),
    fetchProduct(buildPredictionsUrl(id, 'h')),
    fetchProduct(buildUrl(id, 'water_temperature')),
    fetchProduct(buildUrl(id, 'wind', '&range=1')),
    fetchProduct(buildUrl(id, 'air_pressure', '&range=7')),
  ])

  const val = <T>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null

  const hiLoData = val(hiLoRes)
  const curveData = val(curveRes)

  const eventsByDay = parseTideEventsByDay(hiLoData)
  const curvesByDay = parseHourlyCurvesByDay(curveData)

  const today = new Date()
  const todayKey = localDateKey(today)
  const refHour = today.getHours()

  const tideByDay: Record<string, TideData | null> = {}
  const allDays = new Set([...Object.keys(eventsByDay), ...Object.keys(curvesByDay)])
  for (const day of allDays) {
    const events = eventsByDay[day] ?? []
    const curve = curvesByDay[day] ?? new Array(24).fill(0)
    // future days use noon as representative hour; scoringService re-slices per actual hour
    tideByDay[day] = buildTideForDay(events, curve, day === todayKey ? refHour : 12)
  }

  const tempData = val(tempRes)
  const windData = val(windRes)
  const pressureData = val(pressureRes)

  return {
    tideByDay,
    wind: parseWind(windData),
    waterTemp: tempData?.data?.[0]?.v ? parseFloat(tempData.data[0].v) : null,
    pressure: parsePressure(pressureData),
    airTemp: null,
  }
}
