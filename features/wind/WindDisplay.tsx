import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { WindData } from '../../types/conditions'

interface Props {
  wind: WindData
}

function windColor(speed: number): string {
  if (speed > 18) return Colors.danger
  if (speed > 12) return Colors.warning
  return Colors.success
}

export function WindDisplay({ wind }: Props) {
  const color = windColor(wind.speed)
  const rotation = useSharedValue(wind.direction)

  useEffect(() => {
    rotation.value = withTiming(wind.direction, { duration: 800 })
  }, [wind.direction])

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <View style={styles.card} testID="wind-display">
      <Text style={styles.label}>Wind</Text>
      <View style={styles.row}>
        <Animated.Text style={[styles.arrow, arrowStyle]}>↑</Animated.Text>
        <Text style={[styles.speed, { color }]}>{wind.speed}</Text>
        <Text style={styles.unit}>{wind.unit}</Text>
      </View>
      <Text style={styles.sub}>{wind.directionLabel} · Gusts {wind.gusts} {wind.unit}</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  arrow: {
    fontSize: 20,
    color: Colors.accent,
    marginRight: 2,
  },
  speed: {
    fontSize: 24,
    fontWeight: '700',
  },
  unit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  sub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
})
