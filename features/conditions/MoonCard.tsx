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

export function MoonCard({ moon, onPress }: Props) {
  const nextMajor = moon.majorPeriods[0]
  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name="moon-outline" size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
      <Text style={cardStyles.label}>Moon</Text>
      <Text style={cardStyles.value}>{moon.illumination}%</Text>
      <Text style={cardStyles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {moon.phase}
      </Text>
      {nextMajor && (
        <Text style={cardStyles.sub} numberOfLines={1}>Major {nextMajor.start}</Text>
      )}
    </TouchableOpacity>
  )
}
