import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { scoreColor } from './scoringEngine'
import { useSettingsStore } from '../../store/settingsStore'
import type { HourlyScore } from '../../types/conditions'

interface Props {
  hourlyScores: HourlyScore[]
  onUpgrade?: () => void
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 32
const THRESHOLD_Y = BAR_MAX_HEIGHT - (70 / 100) * BAR_MAX_HEIGHT

export function ScoreTimeline({ hourlyScores, onUpgrade }: Props) {
  const isPro = useSettingsStore(s => s.isPro)

  if (hourlyScores.length === 0) return null
  const maxScore = Math.max(...hourlyScores.map(h => h.score))
  const nowH = new Date().getHours()
  const currentHourLabel = `${nowH === 0 ? 12 : nowH > 12 ? nowH - 12 : nowH}${nowH < 12 ? 'AM' : 'PM'}`

  return (
    <View style={styles.container}>
      <Text style={Typography.sectionTitle}>Today's Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {hourlyScores.map((item) => {
          const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
          const isPeak = item.score === maxScore
          const isNow = item.hour === currentHourLabel
          const color = scoreColor(item.score)
          return (
            <View key={item.hour} style={styles.barWrapper}>
              <Text style={[styles.scoreLabel, isPeak && { color }]}>{item.score}</Text>
              {isNow
                ? <View style={styles.nowChip}><Text style={styles.nowChipText}>NOW</Text></View>
                : <View style={styles.nowChipPlaceholder} />}
              <View style={styles.barTrack}>
                <View style={styles.thresholdLine} />
                <View style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color, opacity: isPeak || isNow ? 1 : 0.6 },
                  isNow && { borderWidth: 2, borderColor: Colors.accent },
                ]} />
              </View>
              <Text style={[styles.hourLabel, isPeak && styles.hourLabelPeak]}>{item.hour}</Text>
            </View>
          )
        })}
      </ScrollView>

      {!isPro && (
        <TouchableOpacity style={styles.proBanner} onPress={onUpgrade} activeOpacity={0.8}>
          <Text style={styles.proBannerText}>🔒 Unlock detailed hourly breakdown</Text>
          <Text style={styles.proBannerCta}>Go Pro →</Text>
        </TouchableOpacity>
      )}
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
  scroll: { paddingBottom: Spacing.xs, gap: Spacing.xs },
  barWrapper: { alignItems: 'center', width: BAR_WIDTH + 8 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', overflow: 'visible' },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  nowChip: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 2 },
  nowChipText: { fontSize: 8, color: '#0B1622', fontWeight: '700' },
  nowChipPlaceholder: { height: 14, marginBottom: 2 },
  thresholdLine: { position: 'absolute', bottom: THRESHOLD_Y, left: 0, right: 0, height: 1, backgroundColor: '#10B98150', width: 2000 },
  hourLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  hourLabelPeak: { color: Colors.textSecondary, fontWeight: '600' },
  scoreLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', height: 14 },
  proBanner: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent + '12',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  proBannerText: { fontSize: 12, color: Colors.textSecondary },
  proBannerCta: { fontSize: 12, fontWeight: '700', color: Colors.accent },
})
