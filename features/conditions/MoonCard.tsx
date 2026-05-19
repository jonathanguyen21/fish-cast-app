import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { cardStyles } from '../../theme/cardStyles'
import { Colors } from '../../theme/colors'
import type { MoonData } from '../../types/conditions'

interface Props {
  moon: MoonData
  onPress?: () => void
}

function parseTimeMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + min
}

function nextPeriodLabel(moon: MoonData): string | null {
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const allPeriods: { start: string; end: string; isMajor: boolean }[] = [
    ...moon.majorPeriods.map(p => ({ ...p, isMajor: true })),
    ...moon.minorPeriods.map(p => ({ ...p, isMajor: false })),
  ]
  for (const p of allPeriods) {
    const start = parseTimeMinutes(p.start)
    const end = parseTimeMinutes(p.end)
    if (start < 0) continue
    if (nowMins >= start && nowMins <= end) {
      const remaining = end - nowMins
      return `${p.isMajor ? 'Major' : 'Minor'} active · ${remaining}m left`
    }
    if (start > nowMins) {
      const diff = start - nowMins
      const h = Math.floor(diff / 60)
      const m = diff % 60
      const label = h > 0 ? `${h}h ${m}m` : `${m}m`
      return `${p.isMajor ? 'Major' : 'Minor'} in ${label}`
    }
  }
  return null
}

const PHASE_SHORT: Record<string, string> = {
  'New Moon': 'New',
  'Waxing Crescent': 'Wax Crescent',
  'First Quarter': '1st Quarter',
  'Waxing Gibbous': 'Wax Gibbous',
  'Full Moon': 'Full',
  'Waning Gibbous': 'Wan Gibbous',
  'Last Quarter': 'Last Qtr',
  'Waning Crescent': 'Wan Crescent',
}

export function MoonCard({ moon, onPress }: Props) {
  const periodHint = nextPeriodLabel(moon)
  const phaseLabel = PHASE_SHORT[moon.phase] ?? moon.phase
  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name="moon-outline" size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
      <Text style={cardStyles.label}>Moon</Text>
      <Text style={cardStyles.value}>{moon.illumination}%</Text>
      <Text style={cardStyles.sub} numberOfLines={1}>
        {phaseLabel}
      </Text>
      {periodHint && (
        <Text style={[cardStyles.sub, { color: Colors.accent }]} numberOfLines={1}>
          {periodHint}
        </Text>
      )}
    </TouchableOpacity>
  )
}
