import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getDailySolunar } from '../../services/solunarService'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

interface Props {
  lat: number
  lng: number
}

const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ratingColor(rating: number): string {
  if (rating >= 70) return Colors.success
  if (rating >= 50) return Colors.accent
  if (rating >= 35) return Colors.warning
  return Colors.textTertiary
}

function ratingLabel(rating: number): string {
  if (rating >= 70) return 'Prime'
  if (rating >= 50) return 'Good'
  if (rating >= 35) return 'Fair'
  return 'Slow'
}

function moonIcon(phase: number): keyof typeof Ionicons.glyphMap {
  if (phase < 0.08 || phase > 0.92) return 'ellipse-outline'
  if (phase > 0.42 && phase < 0.58) return 'moon'
  return 'moon-outline'
}

export function SolunarWeekStrip({ lat, lng }: Props) {
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const solunar = getDailySolunar(lat, lng, d)
      return {
        dayAbbrev: i === 0 ? 'Today' : DAY_ABBREVS[d.getDay()],
        isToday: i === 0,
        ...solunar,
      }
    })
  }, [lat, lng])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="moon-outline" size={13} color={Colors.textSecondary} />
        <Text style={styles.title}>Solunar Forecast</Text>
        <Text style={styles.subtitle}>7-day bite strength</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {days.map((day, i) => {
          const color = ratingColor(day.rating)
          return (
            <View
              key={i}
              style={[styles.dayCard, day.isToday && styles.dayCardToday]}
            >
              <Text style={[styles.dayLabel, day.isToday && { color: Colors.accent, fontWeight: '700' }]}>
                {day.dayAbbrev}
              </Text>
              <Ionicons
                name={moonIcon(day.phase)}
                size={18}
                color={Colors.textSecondary}
                style={styles.moonIcon}
              />
              <Text style={styles.illumPct}>{day.illumination}%</Text>
              <View style={[styles.ratingPill, { backgroundColor: color + '22', borderColor: color + '88' }]}>
                <Text style={[styles.ratingScore, { color }]}>{day.rating}</Text>
              </View>
              <Text style={[styles.ratingLabel, { color }]}>{ratingLabel(day.rating)}</Text>
              {day.isMajorDay && (
                <View style={styles.majorDot} />
              )}
            </View>
          )
        })}
      </ScrollView>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
        <Text style={styles.legendText}>Prime ≥70</Text>
        <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
        <Text style={styles.legendText}>Good ≥50</Text>
        <View style={[styles.legendDot, { backgroundColor: Colors.warning }]} />
        <Text style={styles.legendText}>Fair ≥35</Text>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
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
  strip: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  dayCard: {
    width: 58,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 3,
  },
  dayCardToday: {
    backgroundColor: Colors.card,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  moonIcon: {
    marginVertical: 1,
  },
  illumPct: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  ratingPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  ratingLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  majorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.warning,
    marginTop: 1,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginRight: 4,
  },
})
