import React from 'react'
import { View, Text } from 'react-native'
import { cardStyles } from '../../theme/cardStyles'
import type { MoonData } from '../../types/conditions'

interface Props {
  moon: MoonData
}

export function MoonCard({ moon }: Props) {
  const nextMajor = moon.majorPeriods[0]
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>Moon</Text>
      <Text style={cardStyles.value}>{moon.illumination}%</Text>
      <Text style={cardStyles.sub}>{moon.phase}</Text>
      {nextMajor && <Text style={cardStyles.sub}>Major {nextMajor.start}</Text>}
    </View>
  )
}
