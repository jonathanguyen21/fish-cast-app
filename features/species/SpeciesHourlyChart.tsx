import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import { useSettingsStore } from '../../store/settingsStore'
import type { SpeciesHourlyScore } from './speciesHourlyScoring'

interface Props {
  hourly: SpeciesHourlyScore[]
  onUpgrade?: () => void
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 28

function formatHourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

export function SpeciesHourlyChart({ hourly, onUpgrade }: Props) {
  const isPro = useSettingsStore(s => s.isPro)

  if (hourly.length === 0 || hourly.every(e => e.score === 0)) return null

  const maxScore = Math.max(...hourly.map(e => e.score))
  const nowH = new Date().getHours()

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {hourly.map(item => {
          const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
          const isPeak = item.score === maxScore
          const isNow = item.hour === nowH
          const color = scoreColor(item.score)
          return (
            <View key={item.hour} style={styles.barWrapper} testID={`species-hourly-bar-${item.hour}`}>
              <Text style={[styles.scoreLabel, isPeak && { color }]}>{item.score}</Text>
              {isNow
                ? <View style={styles.nowChip}><Text style={styles.nowChipText}>NOW</Text></View>
                : <View style={styles.nowChipPlaceholder} />}
              <View style={styles.barTrack}>
                <View style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color, opacity: isPeak || isNow ? 1 : 0.65 },
                  isNow && { borderWidth: 2, borderColor: Colors.accent },
                ]} />
              </View>
              <Text style={[styles.hourLabel, isPeak && styles.hourLabelPeak]}>{formatHourLabel(item.hour)}</Text>
            </View>
          )
        })}
      </ScrollView>

      {!isPro && (
        <TouchableOpacity style={styles.proBanner} onPress={onUpgrade} activeOpacity={0.8}>
          <View style={styles.proBannerLeft}>
            <Ionicons name="lock-closed" size={12} color={Colors.textSecondary} />
            <Text style={styles.proBannerText}> Unlock per-species bite windows</Text>
          </View>
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
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  scroll: { paddingBottom: Spacing.xs, gap: Spacing.xs },
  barWrapper: { alignItems: 'center', width: BAR_WIDTH + 8 },
  nowChip: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 2 },
  nowChipText: { fontSize: 8, color: Colors.background, fontWeight: '700' },
  nowChipPlaceholder: { height: 14, marginBottom: 2 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
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
  proBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  proBannerText: { fontSize: 12, color: Colors.textSecondary },
  proBannerCta: { fontSize: 12, fontWeight: '700', color: Colors.accent },
})
