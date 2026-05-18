import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Polyline } from 'react-native-svg'
import { cardStyles } from '../../theme/cardStyles'
import { Colors } from '../../theme/colors'
import type { PressureData } from '../../types/conditions'

interface Props {
  pressure: PressureData
  onPress?: () => void
}

const TREND_ICON = {
  rising: 'trending-up-outline',
  falling: 'trending-down-outline',
  stable: 'remove-outline',
} as const

const trendColor = {
  rising: Colors.success,
  falling: Colors.warning,
  stable: Colors.textSecondary,
} as const

function PressureSparkline({ readings }: { readings: number[] }) {
  const pts = [...readings].reverse().slice(-6)
  if (pts.length < 2) return null
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 0.01
  const W = 40, H = 16
  const points = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const color = readings[0] < readings[readings.length - 1] ? Colors.warning : Colors.success
  return (
    <Svg width={W} height={H} style={{ marginTop: 3 }}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function PressureCard({ pressure, onPress }: Props) {
  const TrendIcon = TREND_ICON[pressure.trend]
  const content = (
    <View style={cardStyles.card}>
      <Ionicons name="speedometer-outline" size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
      <Text style={cardStyles.label}>Pressure</Text>
      <Text style={cardStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {pressure.value.toFixed(2)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
        <Ionicons name={TrendIcon} size={11} color={trendColor[pressure.trend]} />
        <Text style={[cardStyles.sub, { color: trendColor[pressure.trend], marginTop: 0 }]}>
          {pressure.trend}
        </Text>
      </View>
      {pressure.readings.length >= 2 && <PressureSparkline readings={pressure.readings} />}
    </View>
  )
  if (onPress) {
    return (
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    )
  }
  return content
}
