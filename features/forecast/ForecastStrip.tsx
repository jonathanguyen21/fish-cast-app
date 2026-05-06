import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import type { DayForecast } from '../../types/conditions'

interface Props {
  forecast: DayForecast[]
  isPro: boolean
  onUpgrade: () => void
}

export function ForecastStrip({ forecast, isPro, onUpgrade }: Props) {
  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>7-Day Forecast</Text>
        <TouchableOpacity style={styles.upgradeCard} onPress={onUpgrade}>
          <Text style={styles.upgradeTitle}>Unlock 7-Day Fishing Forecast</Text>
          <Text style={styles.upgradeSub}>See peak scores for the next 7 days → Pro</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>7-Day Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {forecast.map((day) => {
          const color = scoreColor(day.peakScore)
          return (
            <View key={day.date} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              <View style={[styles.scoreBadge, { borderColor: color }]}>
                <Text style={[styles.scoreText, { color }]}>{day.peakScore}</Text>
              </View>
              <Text style={styles.window}>{day.peakWindow.start}</Text>
              <Text style={styles.window}>–{day.peakWindow.end}</Text>
            </View>
          )
        })}
      </ScrollView>
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
  dayCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.sm, alignItems: 'center', minWidth: 72,
  },
  dayLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  scoreBadge: { borderWidth: 1.5, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 15, fontWeight: '700' },
  window: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  upgradeCard: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, padding: Spacing.md, alignItems: 'center' },
  upgradeTitle: { fontSize: 15, fontWeight: '600', color: Colors.accent },
  upgradeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
})
