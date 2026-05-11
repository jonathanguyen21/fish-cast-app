import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useSettingsStore } from '../../store/settingsStore'
import type { WindData } from '../../types/conditions'

interface Props {
  wind: WindData
  peakSpeed?: number
  onPress?: () => void
}

function windColor(speed: number): string {
  if (speed > 18) return Colors.danger
  if (speed > 12) return Colors.warning
  return Colors.success
}

export function WindDisplay({ wind, peakSpeed, onPress }: Props) {
  const speedUnit = useSettingsStore(s => s.speedUnit)

  const convert = (mph: number) =>
    speedUnit === 'kts' ? Math.round(mph * 0.868) : mph
  const unitLabel = speedUnit === 'kts' ? 'kts' : 'mph'

  const displaySpeed = convert(wind.speed)
  const displayGusts = convert(wind.gusts)
  const displayPeak = peakSpeed !== undefined ? convert(peakSpeed) : undefined

  const color = windColor(wind.speed)
  const rotation = useSharedValue(wind.direction)

  useEffect(() => {
    rotation.value = withTiming(wind.direction, { duration: 800 })
  }, [wind.direction, rotation])

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const card = (
    <View style={styles.card} testID="wind-display">
      <Text style={styles.label}>Wind</Text>
      <View style={styles.row}>
        <Animated.Text style={[styles.arrow, arrowStyle]}>↑</Animated.Text>
        <Text style={[styles.speed, { color }]}>{displaySpeed}</Text>
        <Text style={styles.unit}>{unitLabel}</Text>
      </View>
      <Text style={styles.sub}>{wind.directionLabel} · Gusts {displayGusts} {unitLabel}</Text>
      {displayPeak !== undefined && (
        <Text style={styles.peak}>↑ {displayPeak} {unitLabel} max</Text>
      )}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity style={styles.touchWrapper} onPress={onPress} activeOpacity={0.75}>
        {card}
      </TouchableOpacity>
    )
  }
  return card
}

const styles = StyleSheet.create({
  touchWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    alignItems: 'center',
  },
  label: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  arrow: { fontSize: 20, color: Colors.accent, marginRight: 2 },
  speed: { fontSize: 24, fontWeight: '700' },
  unit: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  sub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  peak: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
})
