import React from 'react'
import { View } from 'react-native'
import { TideChart } from '../../tide/TideChart'
import type { SectionProps } from './types'

interface TideSectionProps extends SectionProps {
  currentHour?: number | null
}

export function TideSection({ conditions, theme, currentHour = new Date().getHours() }: TideSectionProps) {
  if (!conditions.tide) return null
  return (
    <View>
      <TideChart
        tide={conditions.tide}
        currentHour={currentHour}
        backgroundColor={theme.tintedDark.card}
      />
    </View>
  )
}
