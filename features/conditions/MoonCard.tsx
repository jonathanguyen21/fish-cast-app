import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Path, ClipPath, Defs } from 'react-native-svg'
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

function MoonPhaseIcon({ phase, illumination }: { phase: string; illumination: number }) {
  const R = 9
  const cx = R, cy = R
  const size = R * 2

  const isWaning = phase.toLowerCase().includes('waning')
  const frac = illumination / 100

  // For the illuminated "bulge": map 0->1->0 illumination fraction to ellipse x-radius
  // frac=0: new moon (dark), frac=0.5: quarter (half), frac=1: full
  // The illuminated side of the disc:
  // Waxing: right side lit. Waning: left side lit.
  // We use SVG path to draw limb + terminator as an ellipse arc.
  const termX = R * (1 - 2 * frac) // -R at full (behind), +R at new (in front)

  const illuminatedPath = (() => {
    if (frac >= 0.98) {
      return `M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy} A ${R},${R} 0 0,1 ${cx - R},${cy} Z`
    }
    if (frac <= 0.02) return null

    const tx = cx + termX
    const ry = R
    const large = frac > 0.5 ? 1 : 0
    if (isWaning) {
      return `M ${cx - R},${cy} A ${R},${R} 0 0,0 ${cx + R},${cy} A ${Math.abs(termX)},${ry} 0 0,${large === 1 ? 0 : 1} ${cx - R},${cy} Z`
    } else {
      return `M ${cx + R},${cy} A ${R},${R} 0 0,0 ${cx - R},${cy} A ${Math.abs(termX)},${ry} 0 0,${large === 1 ? 1 : 0} ${cx + R},${cy} Z`
    }
  })()

  return (
    <Svg width={size} height={size} style={{ marginBottom: 4 }}>
      <Circle cx={cx} cy={cy} r={R} fill={Colors.surface} />
      {illuminatedPath && <Path d={illuminatedPath} fill={Colors.warning} opacity={0.9} />}
      <Circle cx={cx} cy={cy} r={R} fill="none" stroke={Colors.textTertiary} strokeWidth={0.8} />
    </Svg>
  )
}

export function MoonCard({ moon, onPress }: Props) {
  const periodHint = nextPeriodLabel(moon)
  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <MoonPhaseIcon phase={moon.phase} illumination={moon.illumination} />
      <Text style={cardStyles.label}>Moon</Text>
      <Text style={cardStyles.value}>{moon.illumination}%</Text>
      <Text style={cardStyles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {moon.phase}
      </Text>
      {periodHint && (
        <Text style={[cardStyles.sub, { color: Colors.accent }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {periodHint}
        </Text>
      )}
    </TouchableOpacity>
  )
}
