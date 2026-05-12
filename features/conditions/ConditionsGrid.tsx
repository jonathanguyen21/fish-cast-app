import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { cardStyles } from '../../theme/cardStyles'
import { PressureCard } from './PressureCard'
import { MoonCard } from './MoonCard'
import type { ConditionsData } from '../../types/conditions'

interface Props {
  conditions: Pick<ConditionsData, 'pressure' | 'swell' | 'air' | 'sky' | 'moon' | 'sun'>
  onPressPressure?: () => void
  onPressSwell?: () => void
  onPressAir?: () => void
  onPressSky?: () => void
  onPressMoon?: () => void
  onPressSun?: () => void
}

export function ConditionsGrid({
  conditions,
  onPressPressure,
  onPressSwell,
  onPressAir,
  onPressSky,
  onPressMoon,
  onPressSun,
}: Props) {
  const { pressure, swell, air, sky, moon, sun } = conditions

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Conditions</Text>
      <View style={styles.row}>
        <PressureCard pressure={pressure} onPress={onPressPressure} />
        <TouchableOpacity style={cardStyles.card} onPress={onPressSwell} activeOpacity={0.75}>
          <Text style={cardStyles.label}>Swell</Text>
          {swell ? (
            <>
              <Text style={cardStyles.value}>
                {swell.height} {swell.unit}
              </Text>
              <Text style={cardStyles.sub}>
                {swell.period}s {swell.directionLabel}
              </Text>
            </>
          ) : (
            <Text style={cardStyles.sub}>Unavailable</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.card} onPress={onPressAir} activeOpacity={0.75}>
          <Text style={cardStyles.label}>Air Temp</Text>
          <Text style={cardStyles.value}>{air.temp}°</Text>
          <Text style={cardStyles.sub}>
            H:{air.high}° L:{air.low}°
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.row, { marginTop: Spacing.sm }]}>
        <TouchableOpacity style={cardStyles.card} onPress={onPressSky} activeOpacity={0.75}>
          <Text style={cardStyles.label}>Sky</Text>
          <Text style={cardStyles.value}>{sky.rainChance}%</Text>
          <Text style={cardStyles.sub}>{sky.condition}</Text>
        </TouchableOpacity>
        <MoonCard moon={moon} onPress={onPressMoon} />
        <TouchableOpacity style={cardStyles.card} onPress={onPressSun} activeOpacity={0.75}>
          <Text style={cardStyles.label}>Sun</Text>
          <Text style={cardStyles.sub}>↑ {sun.sunrise}</Text>
          <Text style={cardStyles.sub}>↓ {sun.sunset}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
})
