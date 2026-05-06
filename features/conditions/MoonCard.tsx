import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { MoonData } from '../../types/conditions'

interface Props {
  moon: MoonData
}

export function MoonCard({ moon }: Props) {
  const nextMajor = moon.majorPeriods[0]
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Moon</Text>
      <Text style={styles.value}>{moon.illumination}%</Text>
      <Text style={styles.sub}>{moon.phase}</Text>
      {nextMajor && <Text style={styles.sub}>Major {nextMajor.start}</Text>}
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
