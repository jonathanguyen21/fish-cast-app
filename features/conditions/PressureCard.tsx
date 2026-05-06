import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { PressureData } from '../../types/conditions'

interface Props {
  pressure: PressureData
}

const trendArrow = { rising: '↗', falling: '↘', stable: '→' } as const

export function PressureCard({ pressure }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Pressure</Text>
      <Text style={styles.value}>{pressure.value.toFixed(2)}</Text>
      <Text style={styles.sub}>{trendArrow[pressure.trend]} {pressure.trend}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
