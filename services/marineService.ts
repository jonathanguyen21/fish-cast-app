import type { SwellData } from '../types/conditions'
import type { Spot } from '../types/spot'

const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine'

function degreesToLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

export async function fetchMarineData(spot: Spot): Promise<SwellData | null> {
  try {
    const url =
      `${MARINE_BASE}?latitude=${spot.lat}&longitude=${spot.lng}` +
      `&hourly=wave_height,wave_period,wave_direction&length_unit=imperial&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()

    const heights: number[] = json.hourly?.wave_height ?? []
    const periods: number[] = json.hourly?.wave_period ?? []
    const directions: number[] = json.hourly?.wave_direction ?? []

    if (heights.length === 0) return null

    const i = Math.min(new Date().getHours(), heights.length - 1)

    const height = heights[i] ?? 0
    if (height === 0) return null

    const direction = directions[i] ?? 0
    return {
      height: parseFloat(height.toFixed(1)),
      period: periods[i] ?? 0,
      direction,
      directionLabel: degreesToLabel(direction),
      unit: 'ft',
    }
  } catch {
    return null
  }
}
