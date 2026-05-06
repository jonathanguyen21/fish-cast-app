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
const COMMON = 'time_zone=LST/LDT&units=english&format=json'

function buildUrl(station: string, product: string, extra = ''): string {
  return `${BASE}?station=${station}&date=today&${COMMON}&product=${product}${extra}`
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

  const current = readings[0]
  const threeHrAgo = readings[Math.min(3, readings.length - 1)]
  const delta = current - threeHrAgo
  const abs = Math.abs(delta)

  const trend: PressureData['trend'] =
    delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable'
  const rate: PressureData['rate'] =
    abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast'

  return { value: current, trend, rate, unit: 'inHg' }
}

export async function fetchNoaaData(spot: Spot): Promise<NoaaData> {
  if (!spot.stationId) {
    return { tide: null, wind: null, waterTemp: null, pressure: null, airTemp: null }
  }

  const id = spot.stationId
  const [hiLoRes, curveRes, tempRes, windRes, pressureRes] = await Promise.allSettled([
    fetchProduct(buildUrl(id, 'predictions', '&interval=hilo')),
    fetchProduct(buildUrl(id, 'predictions', '&interval=h')),
    fetchProduct(buildUrl(id, 'water_temperature')),
    fetchProduct(buildUrl(id, 'wind', '&range=1')),
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

  const waterTemp = tempData?.data?.[0]?.v ? parseFloat(tempData.data[0].v) : null

  return {
    tide,
    wind: parseWind(windData),
    waterTemp,
    pressure: parsePressure(pressureData),
    airTemp: null,
  }
}
