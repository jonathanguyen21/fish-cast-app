import type { ConditionsData } from '../../types/conditions'

export function buildConditionsSummary(conditions: ConditionsData): string {
  const parts: string[] = []

  // Pressure
  const { trend, rate } = conditions.pressure
  if (trend === 'falling' && rate === 'slow') parts.push('Pressure slowly falling — fish are likely feeding')
  else if (trend === 'falling') parts.push('Pressure dropping — expect active bite early')
  else if (trend === 'rising' && rate === 'fast') parts.push('Pressure rising fast — fish may go deep')
  else if (trend === 'rising') parts.push('Pressure rising — fish near bottom structure')
  else parts.push('Stable pressure — predictable conditions')

  // Tide (saltwater only)
  if (conditions.tide) {
    const { phase } = conditions.tide
    const nextTurn = conditions.tide.next
    if (phase === 'incoming') {
      parts.push(`incoming tide until ${nextTurn.time}`)
    } else if (phase === 'outgoing') {
      parts.push(`outgoing tide until ${nextTurn.time}`)
    } else {
      parts.push(`slack water — turn ${nextTurn.type === 'high' ? 'high' : 'low'} at ${nextTurn.time}`)
    }
  }

  // Wind warning
  const windSpeed = conditions.wind.speed
  if (windSpeed > 20) {
    parts.push(`strong wind (${windSpeed} mph) — use caution`)
  } else if (windSpeed > 14) {
    parts.push(`moderate wind ${windSpeed} mph from ${conditions.wind.directionLabel}`)
  }

  // Rain
  if (conditions.sky.rainChance >= 50) {
    parts.push(`${conditions.sky.rainChance}% chance of rain`)
  }

  return parts.join(' · ')
}
