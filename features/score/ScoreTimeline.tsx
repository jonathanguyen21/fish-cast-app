import React, { useRef, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'
import { useSettingsStore } from '../../store/settingsStore'
import type { HourlyScore } from '../../types/conditions'

interface Props {
  hourlyScores: HourlyScore[]
  currentHour: number | null
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 28
const BAR_SLOT = BAR_WIDTH + 12 // wrapper width + gap, used for auto-scroll math

export function ScoreTimeline({ hourlyScores, currentHour }: Props) {
  const isPro = useSettingsStore(s => s.isPro)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  if (hourlyScores.length === 0) return null
  const maxScore = Math.max(...hourlyScores.map(h => h.score))

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Today's Forecast</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onContentSizeChange={() => {
          if (currentHour !== null) {
            scrollRef.current?.scrollTo({ x: Math.max(0, (currentHour - 2) * BAR_SLOT), animated: false })
          }
        }}
      >
        {hourlyScores.map((item) => {
          const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
          const isPeak = item.score === maxScore
          const isNow = currentHour !== null && item.hourIndex === currentHour
          const isPast = currentHour !== null && item.hourIndex < currentHour
          const color = scoreColor(item.score)
          return (
            <TouchableOpacity
              key={item.hour}
              testID="timeline-bar"
              style={[styles.barWrapper, isPast && styles.pastBar]}
              onPress={() => { if (!isPro) setTooltipVisible(true) }}
              activeOpacity={isPro ? 1 : 0.7}
            >
              <Text style={styles.scoreLabel}>{isPeak ? item.score : ''}</Text>
              <View style={[styles.barTrack, isNow && styles.nowTrack]}>
                <View style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.7 },
                ]} />
              </View>
              <Text style={[styles.hourLabel, isNow && styles.nowLabel]}>
                {isNow ? 'Now' : item.hour}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <Modal transparent visible={tooltipVisible} onRequestClose={() => setTooltipVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setTooltipVisible(false)}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipTitle}>Score Breakdown</Text>
            <Text style={styles.tooltipBody}>Detailed hourly score breakdown is a Pro feature.</Text>
            <Text style={styles.tooltipHint}>Tap anywhere to dismiss</Text>
          </View>
        </Pressable>
      </Modal>
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
  pastBar: { opacity: 0.4 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end' },
  nowTrack: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  hourLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  nowLabel: { color: Colors.accent, fontWeight: '700' },
  scoreLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', height: 14 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  tooltip: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.lg, margin: Spacing.xl, alignItems: 'center',
  },
  tooltipTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  tooltipBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  tooltipHint: { fontSize: 12, color: Colors.textTertiary, marginTop: Spacing.md },
})
