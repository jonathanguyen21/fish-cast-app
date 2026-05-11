import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { cardStyles } from '../../theme/cardStyles'
import { PressureCard } from './PressureCard'
import { MoonCard } from './MoonCard'
import type { ConditionsData } from '../../types/conditions'

interface Props {
  conditions: Pick<ConditionsData, 'pressure' | 'swell' | 'air' | 'sky' | 'moon' | 'sun'>
  onPressPressure?: () => void
}

export function ConditionsGrid({ conditions, onPressPressure }: Props) {
  const { pressure, swell, air, sky, moon, sun } = conditions

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Conditions</Text>
      <View style={styles.row}>
        <PressureCard pressure={pressure} onPress={onPressPressure} />
        <View style={cardStyles.card}>
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
        </View>
        <View style={cardStyles.card}>
          <Text style={cardStyles.label}>Air Temp</Text>
          <Text style={cardStyles.value}>{air.temp}°</Text>
          <Text style={cardStyles.sub}>
            H:{air.high}° L:{air.low}°
          </Text>
        </View>
      </View>
      <View style={[styles.row, { marginTop: Spacing.sm }]}>
        <View style={cardStyles.card}>
          <Text style={cardStyles.label}>Sky</Text>
          <Text style={cardStyles.value}>{sky.rainChance}%</Text>
          <Text style={cardStyles.sub}>{sky.condition}</Text>
        </View>
        <MoonCard moon={moon} />
        <View style={cardStyles.card}>
          <Text style={cardStyles.label}>Sun</Text>
          <Text style={cardStyles.sub}>↑ {sun.sunrise}</Text>
          <Text style={cardStyles.sub}>↓ {sun.sunset}</Text>
        </View>
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
