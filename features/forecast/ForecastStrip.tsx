import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import type { DayForecast } from '../../types/conditions'

const FREE_DAYS = 2

interface Props {
  forecast: DayForecast[]
  isLoading: boolean
  isError: boolean
  isPro: boolean
  onRetry: () => void
  onUpgrade: () => void
  onDayPress: (day: DayForecast) => void
}

export function ForecastStrip({ forecast, isLoading, isError, isPro, onRetry, onUpgrade, onDayPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>7-Day Forecast</Text>

      {isError && forecast.length === 0 && (
        <TouchableOpacity style={styles.errorRow} onPress={onRetry}>
          <Text style={styles.errorText}>Could not load forecast — tap to retry</Text>
        </TouchableOpacity>
      )}

      {isLoading && forecast.length === 0 && !isError && (
        <View style={styles.scrollRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={[styles.dayCard, styles.skeleton]} testID="day-skeleton" />
          ))}
        </View>
      )}

      {forecast.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {forecast.map((day, i) => {
            const locked = !isPro && i >= FREE_DAYS
            if (locked) {
              return (
                <TouchableOpacity
                  key={day.date}
                  testID="day-locked"
                  style={[styles.dayCard, styles.lockedCard]}
                  onPress={onUpgrade}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockGlyph}>🔒</Text>
                  </View>
                  <Text style={styles.window}>Pro</Text>
                </TouchableOpacity>
              )
            }
            const color = scoreColor(day.peakScore)
            return (
              <TouchableOpacity
                key={day.date}
                testID="day-unlocked"
                style={styles.dayCard}
                onPress={() => onDayPress(day)}
                activeOpacity={0.7}
              >
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                <View style={[styles.scoreBadge, { borderColor: color }]}>
                  <Text style={[styles.scoreText, { color }]}>{day.peakScore}</Text>
                </View>
                <Text style={styles.window}>{day.peakWindow.start}</Text>
                <Text style={styles.window}>–{day.peakWindow.end}</Text>
                {i === 0 && <Text style={styles.window}>(forecast estimate)</Text>}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  scroll: { gap: Spacing.sm },
  scrollRow: { flexDirection: 'row', gap: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.sm, alignItems: 'center', minWidth: 72,
  },
  lockedCard: { opacity: 0.55 },
  skeleton: { height: 96, flex: 1 },
  dayLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  scoreBadge: { borderWidth: 1.5, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { borderWidth: 1.5, borderColor: Colors.textTertiary, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lockGlyph: { fontSize: 16 },
  scoreText: { fontSize: 15, fontWeight: '700' },
  window: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  errorRow: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, padding: Spacing.md, alignItems: 'center' },
  errorText: { fontSize: 13, color: Colors.textSecondary },
})
