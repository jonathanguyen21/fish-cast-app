import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'
import type { HourlyScore } from '../../types/conditions'

interface TimeBlock {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  startHour: number
  endHour: number
  avgScore: number
  peakScore: number
}

// hourlyScores covers hours 5..20 (indices 0..15)
function buildBlocks(hourlyScores: HourlyScore[]): TimeBlock[] {
  const scores = hourlyScores.map(h => h.score)

  function sliceAvg(from: number, to: number): number {
    const s = scores.slice(from, to + 1)
    if (s.length === 0) return 0
    return Math.round(s.reduce((a, b) => a + b, 0) / s.length)
  }
  function slicePeak(from: number, to: number): number {
    const s = scores.slice(from, to + 1)
    return s.length ? Math.max(...s) : 0
  }

  // Indices: dawn=0..4 (5-9AM), midday=5..9 (10-14), evening=10..15 (15-20)
  return [
    { label: 'Dawn', icon: 'sunny-outline', startHour: 5, endHour: 9, avgScore: sliceAvg(0, 4), peakScore: slicePeak(0, 4) },
    { label: 'Midday', icon: 'partly-sunny-outline', startHour: 10, endHour: 14, avgScore: sliceAvg(5, 9), peakScore: slicePeak(5, 9) },
    { label: 'Evening', icon: 'moon-outline', startHour: 15, endHour: 20, avgScore: sliceAvg(10, 15), peakScore: slicePeak(10, 15) },
  ]
}

function ratingLabel(score: number): string {
  if (score >= 70) return 'Prime'
  if (score >= 55) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Slow'
}

interface Props {
  hourlyScores: HourlyScore[]
}

export function DayPlanStrip({ hourlyScores }: Props) {
  if (hourlyScores.length === 0) return null
  const blocks = buildBlocks(hourlyScores)
  const bestIdx = blocks.reduce((bi, b, i) => b.avgScore > blocks[bi].avgScore ? i : bi, 0)
  const currentHour = new Date().getHours()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
        <Text style={styles.title}>Today's Plan</Text>
        <Text style={styles.subtitle}>when to go</Text>
      </View>
      <View style={styles.blocks}>
        {blocks.map((block, i) => {
          const isBest = i === bestIdx && block.avgScore >= 40
          const isActive = currentHour >= block.startHour && currentHour <= block.endHour
          const color = scoreColor(block.avgScore)
          return (
            <View
              key={block.label}
              style={[
                styles.block,
                isBest && { borderColor: color + '66', backgroundColor: color + '12' },
                isActive && !isBest && styles.blockActive,
              ]}
            >
              {isBest && (
                <View style={[styles.bestBadge, { backgroundColor: color }]}>
                  <Text style={styles.bestBadgeText}>Best</Text>
                </View>
              )}
              <Ionicons
                name={block.icon}
                size={16}
                color={isBest ? color : Colors.textSecondary}
              />
              <Text style={[styles.blockLabel, isBest && { color: Colors.textPrimary, fontWeight: '700' }]}>
                {block.label}
              </Text>
              <Text style={[styles.blockScore, { color }]}>{block.avgScore}</Text>
              <Text style={[styles.blockRating, { color }]}>{ratingLabel(block.avgScore)}</Text>
            </View>
          )
        })}
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  blocks: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  block: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  blockActive: {
    borderColor: Colors.accent + '33',
    backgroundColor: Colors.card,
  },
  bestBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  bestBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.background,
    letterSpacing: 0.5,
  },
  blockLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  blockScore: {
    fontSize: 22,
    fontWeight: '800',
  },
  blockRating: {
    fontSize: 9,
    fontWeight: '600',
  },
})
