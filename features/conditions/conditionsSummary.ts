import type { ConditionsData } from '../../types/conditions'

export function buildConditionsSummary(conditions: ConditionsData): string {
  const parts: string[] = []

  // Pressure
  const { trend, rate } = conditions.pressure
  if (trend === 'falling' && rate === 'slow') parts.push('Pressure slowly falling — fish likely feeding')
  else if (trend === 'falling') parts.push('Pressure dropping — active bite expected')
  else if (trend === 'rising' && rate === 'fast') parts.push('Pressure rising fast — fish may go deep')
  else if (trend === 'rising') parts.push('Pressure rising — fish near bottom structure')
  else parts.push('Stable pressure')

  // Solunar
  const nextMajor = conditions.moon.majorPeriods[0]
  const nextMinor = conditions.moon.minorPeriods[0]
  const nowH = new Date().getHours()
  function parseHour(t: string): number {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!m) return -1
    let h = parseInt(m[1])
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
    return h
  }
  if (nextMajor) {
    const startH = parseHour(nextMajor.start)
    const endH = parseHour(nextMajor.end)
    if (nowH >= startH && nowH <= endH) parts.push('Major solunar period active')
    else if (startH > nowH) parts.push(`Major solunar ${nextMajor.start}–${nextMajor.end}`)
  } else if (nextMinor) {
    const startH = parseHour(nextMinor.start)
    if (startH > nowH) parts.push(`Minor solunar ${nextMinor.start}`)
  }

  // Tide (saltwater only)
  if (conditions.tide) {
    const { phase } = conditions.tide
    const nextTurn = conditions.tide.next
    if (phase === 'incoming') {
      parts.push(`Incoming tide, ${nextTurn.type === 'high' ? 'high' : 'low'} at ${nextTurn.time}`)
    } else if (phase === 'outgoing') {
      parts.push(`Outgoing tide, ${nextTurn.type === 'high' ? 'high' : 'low'} at ${nextTurn.time}`)
    } else {
      parts.push(`Slack water — turns ${nextTurn.type === 'high' ? 'high' : 'low'} at ${nextTurn.time}`)
    }
  }

  // Wind warning
  const windSpeed = conditions.wind.speed
  if (windSpeed > 20) {
    parts.push(`Strong wind ${windSpeed} mph — use caution`)
  } else if (windSpeed > 14) {
    parts.push(`Moderate wind ${windSpeed} mph ${conditions.wind.directionLabel}`)
  }

  // Rain
  if (conditions.sky.rainChance >= 50) {
    parts.push(`${conditions.sky.rainChance}% rain`)
  }

  return parts.join(' · ')
}
