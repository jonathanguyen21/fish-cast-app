import React from 'react'
import { View } from 'react-native'
import { TideChart } from '../../tide/TideChart'
import type { SectionProps } from './types'

export function TideSection({ conditions, theme }: SectionProps) {
  if (!conditions.tide) return null
  return (
    <View>
      <TideChart
        tide={conditions.tide}
        currentHour={new Date().getHours()}
        backgroundColor={theme.tintedDark.card}
      />
    </View>
  )
}
