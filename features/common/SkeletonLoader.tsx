import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

function SkeletonRect({ width = '100%', height = 14, radius = 6, style }: {
  width?: number | string
  height?: number
  radius?: number
  style?: object
}) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.card },
        { opacity },
        style,
      ]}
    />
  )
}

export function ScoreCardSkeleton() {
  return (
    <View style={styles.scoreCard}>
      <SkeletonRect width={140} height={140} radius={70} style={{ marginBottom: 12 }} />
      <SkeletonRect width={120} height={14} style={{ marginBottom: 8 }} />
      <SkeletonRect width={160} height={28} radius={14} />
    </View>
  )
}

export function TimelineSkeleton() {
  return (
    <View style={styles.timelineCard}>
      <SkeletonRect width={120} height={13} style={{ marginBottom: 12 }} />
      <View style={styles.timelineRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={styles.timelineCol}>
            <SkeletonRect width={24} height={20 + (i % 3) * 15} />
            <SkeletonRect width={24} height={10} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  )
}

export function QuickStatsSkeleton() {
  return (
    <View style={styles.quickRow}>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.quickCard}>
          <SkeletonRect width={18} height={18} radius={9} style={{ marginBottom: 6 }} />
          <SkeletonRect width={40} height={10} style={{ marginBottom: 6 }} />
          <SkeletonRect width={36} height={22} style={{ marginBottom: 4 }} />
          <SkeletonRect width={48} height={10} />
        </View>
      ))}
    </View>
  )
}

export function ConditionsGridSkeleton() {
  return (
    <View style={styles.gridCard}>
      <SkeletonRect width={80} height={13} style={{ marginBottom: 12 }} />
      <View style={styles.gridRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={styles.gridCell}>
            <SkeletonRect width={18} height={18} radius={9} style={{ marginBottom: 6 }} />
            <SkeletonRect width={40} height={10} style={{ marginBottom: 6 }} />
            <SkeletonRect width={32} height={20} style={{ marginBottom: 4 }} />
            <SkeletonRect width={44} height={10} />
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  timelineCol: { alignItems: 'center' },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
  },
  quickCard: {
    flex: 1, backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  gridCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  gridRow: { flexDirection: 'row', gap: Spacing.sm },
  gridCell: {
    flex: 1, backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
})
