import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { cardStyles } from '../../theme/cardStyles'
import type { PressureData } from '../../types/conditions'

interface Props {
  pressure: PressureData
  onPress?: () => void
}

const trendArrow = { rising: '↗', falling: '↘', stable: '→' } as const

export function PressureCard({ pressure, onPress }: Props) {
  const content = (
    <View style={cardStyles.card}>
      <Text style={cardStyles.icon}>🌡️</Text>
      <Text style={cardStyles.label}>Pressure</Text>
      <Text style={cardStyles.value}>{pressure.value.toFixed(2)}</Text>
      <Text style={cardStyles.sub}>{trendArrow[pressure.trend]} {pressure.trend}</Text>
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
