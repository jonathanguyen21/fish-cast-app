import type { TideData, WindData, PressureData, TideEvent } from '../types/conditions'
import type { Spot } from '../types/spot'
import { detectPhase } from '../features/tide/tideUtils'

export interface NoaaData {
  tide: TideData | null
  wind: WindData | null
  waterTemp: number | null
  pressure: PressureData | null
  airTemp: number | null
}

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
// Verified against the live API 2026-07-01: time_zone must be lst_ldt (LST/LDT is rejected)
const COMMON = 'time_zone=lst_ldt&units=english&format=json'

function buildUrl(station: string, product: string, extra = ''): string {
  return `${BASE}?station=${station}&${COMMON}&product=${product}${extra}`
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

function parseHourlyCurve(data: any): number[] {
  const curve = new Array(24).fill(0)
  if (!data?.predictions) return curve
  for (const p of data.predictions) {
    const hour = parseInt((p.t.split(' ')[1] ?? '0:00').split(':')[0], 10)
    if (hour >= 0 && hour < 24) curve[hour] = parseFloat(p.v) || 0
  }
  return curve
}

function parseTideEvents(data: any): TideEvent[] {
  if (!data?.predictions) return []
  return data.predictions.map((p: any) => ({
    type: (p.type === 'H' ? 'high' : 'low') as 'high' | 'low',
    time: formatNoaaTime(p.t),
    height: parseFloat(p.v),
  }))
}

const KNOTS_TO_MPH = 1.15078
const MB_TO_INHG = 0.02953

function parseWind(data: any): WindData | null {
  const entries: any[] = data?.data ?? []
  if (entries.length === 0) return null
  // API returns readings oldest-first — most recent is last
  const d = entries[entries.length - 1]
  return {
    speed: Math.round((parseFloat(d.s) || 0) * KNOTS_TO_MPH),
    gusts: Math.round((parseFloat(d.g) || 0) * KNOTS_TO_MPH),
    direction: parseFloat(d.d) || 0,
    directionLabel: d.dr || 'N',
    unit: 'mph',
  }
}

function parsePressure(data: any): PressureData | null {
  const entries: any[] = data?.data ?? []
  const values = entries
    .map((d: any) => ({ t: d.t as string, v: parseFloat(d.v) }))
    .filter((e: { v: number }) => !isNaN(e.v))
  if (values.length === 0) return null

  // API returns 6-minute readings oldest-first, in millibars
  const toInHg = (mb: number) => parseFloat((mb * MB_TO_INHG).toFixed(2))
  const current = toInHg(values[values.length - 1].v)
  // ~3 hours back = 30 readings at 6-minute intervals
  const threeHoursBack = toInHg(values[Math.max(0, values.length - 1 - 30)].v)
  const delta = current - threeHoursBack
  const abs = Math.abs(delta)

  const trend: PressureData['trend'] =
    delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable'
  const rate: PressureData['rate'] =
    abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast'

  // hourly samples (minute :00) for the detail chart, oldest-first
  let readings = values.filter(e => e.t.slice(-2) === '00').map(e => toInHg(e.v))
  if (readings.length === 0) readings = values.slice(-8).map(e => toInHg(e.v))

  return { value: current, trend, rate, unit: 'inHg', readings }
}

export async function fetchNoaaData(spot: Spot): Promise<NoaaData> {
  if (!spot.stationId) {
    return { tide: null, wind: null, waterTemp: null, pressure: null, airTemp: null }
  }

  const id = spot.stationId
  const [hiLoRes, curveRes, tempRes, windRes, pressureRes] = await Promise.allSettled([
    fetchProduct(buildUrl(id, 'predictions', '&date=today&datum=MLLW&interval=hilo')),
    fetchProduct(buildUrl(id, 'predictions', '&date=today&datum=MLLW&interval=h')),
    fetchProduct(buildUrl(id, 'water_temperature', '&range=2')),
    fetchProduct(buildUrl(id, 'wind', '&range=2')),
    fetchProduct(buildUrl(id, 'air_pressure', '&range=7')),
  ])

  const val = <T>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null

  const hiLoData = val(hiLoRes)
  const curveData = val(curveRes)
  const tempData = val(tempRes)
  const windData = val(windRes)
  const pressureData = val(pressureRes)

  const events = parseTideEvents(hiLoData)
  const hourlyCurve = parseHourlyCurve(curveData)
  const hasTideData = hiLoData !== null || curveData !== null

  let tide: TideData | null = null
  if (hasTideData && events.length > 0) {
    const now = new Date()
    const currentHour = now.getHours()
    const currentHeight = hourlyCurve[currentHour] ?? 0
    const prevHeight = hourlyCurve[Math.max(0, currentHour - 1)] ?? 0
    const phase = detectPhase(hourlyCurve, currentHour)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

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

    tide = {
      current: { height: parseFloat(currentHeight.toFixed(1)), rising: currentHeight > prevHeight, unit: 'ft' },
      next: futureEvent,
      events,
      hourlyCurve,
      phase,
    }
  }

  const tempEntries: any[] = tempData?.data ?? []
  const lastTemp = tempEntries.length > 0 ? parseFloat(tempEntries[tempEntries.length - 1].v) : NaN
  const waterTemp = isNaN(lastTemp) ? null : lastTemp

  return {
    tide,
    wind: parseWind(windData),
    waterTemp,
    pressure: parsePressure(pressureData),
    airTemp: null,
  }
}
