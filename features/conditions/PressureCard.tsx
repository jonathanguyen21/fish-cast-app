import React from 'react'
import { View, Text } from 'react-native'
import { cardStyles } from '../../theme/cardStyles'
import type { PressureData } from '../../types/conditions'

interface Props {
  pressure: PressureData
}

const trendArrow = { rising: '↗', falling: '↘', stable: '→' } as const

export function PressureCard({ pressure }: Props) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>Pressure</Text>
      <Text style={cardStyles.value}>{pressure.value.toFixed(2)}</Text>
      <Text style={cardStyles.sub}>{trendArrow[pressure.trend]} {pressure.trend}</Text>
    </View>
  )
}
