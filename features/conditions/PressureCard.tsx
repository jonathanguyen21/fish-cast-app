import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { cardStyles } from '../../theme/cardStyles'
import { Colors } from '../../theme/colors'
import type { PressureData } from '../../types/conditions'

interface Props {
  pressure: PressureData
  onPress?: () => void
}

const trendArrow = { rising: '↗', falling: '↘', stable: '→' } as const
const trendColor = { rising: Colors.success, falling: Colors.warning, stable: Colors.textSecondary } as const

export function PressureCard({ pressure, onPress }: Props) {
  const content = (
    <View style={cardStyles.card}>
      <Ionicons name="speedometer-outline" size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
      <Text style={cardStyles.label}>Pressure</Text>
      <Text style={cardStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {pressure.value.toFixed(2)}
      </Text>
      <Text style={[cardStyles.sub, { color: trendColor[pressure.trend] }]}>
        {trendArrow[pressure.trend]} {pressure.trend}
      </Text>
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
