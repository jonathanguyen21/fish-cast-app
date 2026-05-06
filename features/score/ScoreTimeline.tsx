import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'
import type { HourlyScore } from '../../types/conditions'

interface Props {
  hourlyScores: HourlyScore[]
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 28

export function ScoreTimeline({ hourlyScores }: Props) {
  if (hourlyScores.length === 0) return null
  const maxScore = Math.max(...hourlyScores.map(h => h.score))

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Today's Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {hourlyScores.map((item) => {
          const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
          const isPeak = item.score === maxScore
          const color = scoreColor(item.score)
          return (
            <View key={item.hour} style={styles.barWrapper}>
              <Text style={styles.scoreLabel}>{isPeak ? item.score : ''}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.7 },
                ]} />
              </View>
              <Text style={styles.hourLabel}>{item.hour}</Text>
            </View>
          )
        })}
      </ScrollView>
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
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  scroll: { paddingBottom: Spacing.xs, gap: Spacing.xs },
  barWrapper: { alignItems: 'center', width: BAR_WIDTH + 8 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  hourLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  scoreLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', height: 14 },
})
