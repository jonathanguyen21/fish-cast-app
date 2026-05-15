import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import { cardStyles } from '../../theme/cardStyles'
import type { MoonData } from '../../types/conditions'

interface Props {
  moon: MoonData
  onPress?: () => void
}

export function MoonCard({ moon, onPress }: Props) {
  const nextMajor = moon.majorPeriods[0]
  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={cardStyles.icon}>🌙</Text>
      <Text style={cardStyles.label}>Moon</Text>
      <Text style={cardStyles.value}>{moon.illumination}%</Text>
      <Text style={cardStyles.sub}>{moon.phase}</Text>
      {nextMajor && <Text style={cardStyles.sub}>Major {nextMajor.start}</Text>}
    </TouchableOpacity>
  )
}
