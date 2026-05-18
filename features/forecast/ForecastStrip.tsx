import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { scoreColor } from '../score/scoringEngine'
import type { DayForecast } from '../../types/conditions'

interface Props {
  forecast: DayForecast[] | undefined
  isPro: boolean
  onUpgrade: () => void
}

type IoniconName = keyof typeof Ionicons.glyphMap

const SKY_ICON: Record<string, IoniconName> = {
  'clear': 'sunny-outline',
  'partly-cloudy': 'partly-sunny-outline',
  'overcast': 'cloud-outline',
  'light-rain': 'rainy-outline',
  'heavy-rain': 'thunderstorm-outline',
}

const SKY_COLOR: Record<string, string> = {
  'clear': Colors.warning,
  'partly-cloudy': Colors.textSecondary,
  'overcast': Colors.textTertiary,
  'light-rain': Colors.ocean,
  'heavy-rain': Colors.danger,
}

export function ForecastStrip({ forecast, isPro, onUpgrade }: Props) {
  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={Typography.sectionTitle}>7-Day Forecast</Text>
        <TouchableOpacity style={styles.upgradeCard} onPress={onUpgrade}>
          <Ionicons name="calendar-outline" size={20} color={Colors.accent} style={{ marginBottom: 4 }} />
          <Text style={styles.upgradeTitle}>Unlock 7-Day Fishing Forecast</Text>
          <Text style={styles.upgradeSub}>See peak scores for the next 7 days → Pro</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!forecast || forecast.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={Typography.sectionTitle}>7-Day Forecast</Text>
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeSub}>Forecast loading…</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={Typography.sectionTitle}>7-Day Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {forecast.map((day) => {
          const color = scoreColor(day.peakScore)
          const iconName: IoniconName = day.skyIcon ? (SKY_ICON[day.skyIcon] ?? 'partly-sunny-outline') : 'partly-sunny-outline'
          const iconColor = day.skyIcon ? (SKY_COLOR[day.skyIcon] ?? Colors.textSecondary) : Colors.textSecondary
          return (
            <View key={day.date} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              <Ionicons name={iconName} size={20} color={iconColor} style={{ marginBottom: 4 }} />
              <View style={[styles.scoreBadge, { borderColor: color, backgroundColor: color + '20' }]}>
                <Text style={[styles.scoreText, { color }]}>{day.peakScore}</Text>
              </View>
              {day.rainChance !== undefined && day.rainChance > 10 && (
                <Text style={styles.rain}>{day.rainChance}%</Text>
              )}
              <Text style={styles.window} numberOfLines={1}>
                {day.peakWindow.start.replace(' AM', 'a').replace(' PM', 'p')}–{day.peakWindow.end.replace(' AM', 'a').replace(' PM', 'p')}
              </Text>
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
  scroll: { gap: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.sm, alignItems: 'center', minWidth: 72,
  },
  dayLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  scoreBadge: { borderWidth: 1.5, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  scoreText: { fontSize: 15, fontWeight: '700' },
  rain: { fontSize: 10, color: Colors.ocean, marginBottom: 2 },
  window: { fontSize: 9, color: Colors.textTertiary, marginTop: 2 },
  upgradeCard: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, padding: Spacing.md, alignItems: 'center' },
  upgradeTitle: { fontSize: 15, fontWeight: '600', color: Colors.accent },
  upgradeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
})
