import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ScoreDisplay } from '../../features/score/ScoreDisplay'
import { ScoreTimeline } from '../../features/score/ScoreTimeline'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { DayForecast } from '../../types/conditions'

export default function DayDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  let day: DayForecast | null = null
  try {
    day = data ? JSON.parse(data) : null
  } catch {
    day = null
  }
  if (!day || !day.hourlyScores) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Could not load day details</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.dayTitle}>{day.dayLabel} · {day.date}</Text>
      <ScoreDisplay
        score={day.peakScore}
        label={day.scoreLabel}
        bestWindow={{ ...day.peakWindow, score: day.peakScore }}
      />
      <ScoreTimeline hourlyScores={day.hourlyScores} currentHour={null} title="Hourly Scores" />
      {day.tideEvents.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tides</Text>
          {day.tideEvents.map((ev, i) => (
            <View key={i} style={styles.tideRow}>
              <Text style={styles.tideType}>{ev.type === 'high' ? '▲ High' : '▼ Low'}</Text>
              <Text style={styles.tideTime}>{ev.time}</Text>
              <Text style={styles.tideHeight}>{ev.height.toFixed(1)} ft</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sun</Text>
        <Text style={styles.sunText}>↑ {day.sun.sunrise}    ↓ {day.sun.sunset}</Text>
      </View>
      <Text style={styles.note}>
        Forecast scores assume neutral pressure — check back on the day for the full picture.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingVertical: Spacing.md, paddingBottom: Spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  dayTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.textPrimary,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  tideRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tideType: { fontSize: 14, color: Colors.textPrimary, width: 80 },
  tideTime: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  tideHeight: { fontSize: 14, color: Colors.textSecondary },
  sunText: { fontSize: 14, color: Colors.textSecondary },
  note: {
    fontSize: 11, color: Colors.textTertiary, textAlign: 'center',
    marginHorizontal: Spacing.screenPad,
  },
})
