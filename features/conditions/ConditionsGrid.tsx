import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { PressureCard } from './PressureCard'
import { MoonCard } from './MoonCard'
import type { ConditionsData } from '../../types/conditions'

interface Props {
  conditions: Pick<ConditionsData, 'pressure' | 'swell' | 'air' | 'sky' | 'moon' | 'sun'>
}

export function ConditionsGrid({ conditions }: Props) {
  const { pressure, swell, air, sky, moon, sun } = conditions

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Conditions</Text>
      <View style={styles.row}>
        <PressureCard pressure={pressure} />
        <View style={styles.card}>
          <Text style={styles.label}>Swell</Text>
          {swell ? (
            <>
              <Text style={styles.value}>
                {swell.height} {swell.unit}
              </Text>
              <Text style={styles.sub}>
                {swell.period}s {swell.directionLabel}
              </Text>
            </>
          ) : (
            <Text style={styles.sub}>Unavailable</Text>
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Air Temp</Text>
          <Text style={styles.value}>{air.temp}°</Text>
          <Text style={styles.sub}>
            H:{air.high}° L:{air.low}°
          </Text>
        </View>
      </View>
      <View style={[styles.row, { marginTop: Spacing.sm }]}>
        <View style={styles.card}>
          <Text style={styles.label}>Sky</Text>
          <Text style={styles.value}>{sky.rainChance}%</Text>
          <Text style={styles.sub}>{sky.condition}</Text>
        </View>
        <MoonCard moon={moon} />
        <View style={styles.card}>
          <Text style={styles.label}>Sun</Text>
          <Text style={styles.sub}>↑ {sun.sunrise}</Text>
          <Text style={styles.sub}>↓ {sun.sunset}</Text>
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
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
})
