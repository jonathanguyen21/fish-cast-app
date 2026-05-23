import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import type { DayForecast } from '../../types/conditions'

interface Props {
  forecast: DayForecast[]
  onPress?: () => void
}

const SKY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'clear': 'sunny-outline',
  'partly-cloudy': 'partly-sunny-outline',
  'overcast': 'cloud-outline',
  'light-rain': 'rainy-outline',
  'heavy-rain': 'thunderstorm-outline',
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export function WeekTopDays({ forecast, onPress }: Props) {
  if (!forecast || forecast.length < 2) return null

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = forecast.filter(d => d.date >= today)
  if (upcoming.length < 2) return null

  const top3 = [...upcoming]
    .sort((a, b) => b.peakScore - a.peakScore)
    .slice(0, 3)

  if (top3[0].peakScore < 40) return null

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Best Days This Week</Text>
        <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
      </View>
      {top3.map((day, i) => {
        const color = scoreColor(day.peakScore)
        const skyIcon = SKY_ICONS[day.skyIcon ?? ''] ?? 'cloud-outline'
        return (
          <View key={day.date} style={[styles.dayRow, i > 0 && styles.dayRowBorder]}>
            <Text style={styles.medal}>{RANK_MEDALS[i]}</Text>
            <Text style={styles.dayLabel}>{day.dayLabel}</Text>
            <Ionicons name={skyIcon} size={13} color={Colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={styles.window}>{day.peakWindow.start}–{day.peakWindow.end}</Text>
            <View style={[styles.scorePill, { backgroundColor: color + '22', borderColor: color + '80' }]}>
              <Text style={[styles.scoreText, { color }]}>{day.peakScore}</Text>
            </View>
          </View>
        )
      })}
    </TouchableOpacity>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  dayRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.card,
  },
  medal: { fontSize: 14, width: 22 },
  dayLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  window: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginRight: 6,
  },
  scorePill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
})
