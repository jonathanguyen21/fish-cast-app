import type { SwellData, PressureData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface MarineDay {
  swell: SwellData | null
  waterTemp: number | null
  pressure: PressureData | null
}

const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine'
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'

function degreesToLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

function buildPressureFromHourly(readings: number[]): PressureData | null {
  if (readings.length === 0) return null
  const inHg = readings.map(r => r * 0.02953)
  const midIdx = Math.floor(inHg.length / 2)
  const current = inHg[midIdx]
  const earlier = inHg[Math.max(0, midIdx - 3)]
  const delta = current - earlier
  const abs = Math.abs(delta)
  return {
    value: parseFloat(current.toFixed(2)),
    trend: delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable',
    rate: abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast',
    unit: 'inHg',
    readings: inHg.map(v => parseFloat(v.toFixed(4))),
  }
}

export async function fetchMarineData(spot: Spot): Promise<Record<string, MarineDay> | null> {
  try {
    const [marineRes, weatherRes] = await Promise.all([
      fetch(
        `${MARINE_BASE}?latitude=${spot.lat}&longitude=${spot.lng}` +
        `&hourly=wave_height,wave_period,wave_direction,sea_surface_temperature` +
        `&length_unit=imperial&timezone=auto`
      ),
      fetch(
        `${WEATHER_BASE}?latitude=${spot.lat}&longitude=${spot.lng}` +
        `&hourly=surface_pressure&timezone=auto`
      ),
    ])

    const marineJson = marineRes.ok ? await marineRes.json() : null
    const weatherJson = weatherRes.ok ? await weatherRes.json() : null

    if (!marineJson) return null

    const times: string[] = marineJson.hourly?.time ?? []
    const heights: number[] = marineJson.hourly?.wave_height ?? []
    const periods: number[] = marineJson.hourly?.wave_period ?? []
    const directions: number[] = marineJson.hourly?.wave_direction ?? []
    const seaTemps: number[] = marineJson.hourly?.sea_surface_temperature ?? []
    const pressures: number[] = weatherJson?.hourly?.surface_pressure ?? []

    const byDay: Record<string, {
      heights: number[]; periods: number[]; directions: number[]
      temps: number[]; pressures: number[]
    }> = {}

    for (let i = 0; i < times.length; i++) {
      const dateStr = times[i].slice(0, 10)
      if (!byDay[dateStr]) byDay[dateStr] = { heights: [], periods: [], directions: [], temps: [], pressures: [] }
      byDay[dateStr].heights.push(heights[i] ?? 0)
      byDay[dateStr].periods.push(periods[i] ?? 0)
      byDay[dateStr].directions.push(directions[i] ?? 0)
      byDay[dateStr].temps.push(seaTemps[i] ?? 0)
      byDay[dateStr].pressures.push(pressures[i] ?? 0)
    }

    const result: Record<string, MarineDay> = {}
    for (const [date, data] of Object.entries(byDay)) {
      const repIdx = Math.min(12, data.heights.length - 1)
      const height = data.heights[repIdx] ?? 0

      let swell: SwellData | null = null
      if (height > 0) {
        const direction = data.directions[repIdx] ?? 0
        swell = {
          height: parseFloat(height.toFixed(1)),
          period: data.periods[repIdx] ?? 0,
          direction,
          directionLabel: degreesToLabel(direction),
          unit: 'ft',
        }
      }

      const rawTemp = data.temps[repIdx] ?? 0
      const waterTemp = rawTemp > 0 ? parseFloat((rawTemp * 9 / 5 + 32).toFixed(1)) : null

      result[date] = {
        swell,
        waterTemp,
        pressure: buildPressureFromHourly(data.pressures),
      }
    }

    return result
  } catch {
    return null
  }
}
