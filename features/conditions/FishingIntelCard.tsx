import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { ConditionsData } from '../../types/conditions'

type IoniconName = keyof typeof Ionicons.glyphMap

interface IntelPill {
  icon: IoniconName
  text: string
  color: string
}

function buildPills(c: ConditionsData): IntelPill[] {
  const pills: IntelPill[] = []

  // Pressure
  if (c.pressure.trend === 'falling' && c.pressure.rate === 'slow') {
    pills.push({ icon: 'trending-down-outline', text: 'Pressure falling slowly — fish feeding', color: Colors.success })
  } else if (c.pressure.trend === 'falling') {
    pills.push({ icon: 'trending-down-outline', text: 'Pressure dropping fast', color: Colors.warning })
  } else if (c.pressure.trend === 'rising' && c.pressure.rate === 'fast') {
    pills.push({ icon: 'trending-up-outline', text: 'Pressure rising fast — fish go deep', color: Colors.warning })
  } else if (c.pressure.trend === 'rising') {
    pills.push({ icon: 'trending-up-outline', text: 'Pressure rising — bottom structure key', color: Colors.accent })
  } else {
    pills.push({ icon: 'remove-outline', text: 'Stable pressure', color: Colors.textSecondary })
  }

  // Solunar
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  function inPeriod(periods: { start: string; end: string }[]): boolean {
    return periods.some(p => {
      const parse = (t: string) => {
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
        if (!m) return -1
        let h = parseInt(m[1])
        if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
        if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
        return h * 60 + parseInt(m[2])
      }
      const s = parse(p.start), e = parse(p.end)
      return s >= 0 && e >= 0 && nowMins >= s && nowMins <= e
    })
  }
  if (inPeriod(c.moon.majorPeriods)) {
    pills.push({ icon: 'moon', text: 'Major solunar period — prime feeding', color: Colors.accent })
  } else if (inPeriod(c.moon.minorPeriods)) {
    pills.push({ icon: 'moon-outline', text: 'Minor solunar period active', color: Colors.textSecondary })
  } else if (c.moon.majorPeriods[0]) {
    pills.push({ icon: 'moon-outline', text: `Major solunar at ${c.moon.majorPeriods[0].start}`, color: Colors.textTertiary })
  }

  // Tide
  if (c.tide) {
    const phase = c.tide.phase
    if (phase === 'incoming') {
      pills.push({ icon: 'arrow-up-outline', text: 'Tide incoming — fish moving to feed', color: Colors.ocean })
    } else if (phase === 'outgoing') {
      pills.push({ icon: 'arrow-down-outline', text: 'Tide outgoing — fish current edges', color: Colors.accent })
    } else {
      pills.push({ icon: 'remove-outline', text: 'Slack tide — less fish movement', color: Colors.textTertiary })
    }
  }

  // Wind
  const windSpeed = c.wind.speed
  if (windSpeed <= 10) {
    pills.push({ icon: 'leaf-outline', text: 'Light winds — ideal surface conditions', color: Colors.success })
  } else if (windSpeed <= 20) {
    pills.push({ icon: 'navigate-outline', text: `${windSpeed} mph wind — manageable`, color: Colors.textSecondary })
  } else {
    pills.push({ icon: 'warning-outline', text: `${windSpeed} mph wind — fish deeper structure`, color: Colors.warning })
  }

  // Water temp
  if (c.water.temp > 0) {
    const t = c.water.temp
    if (t >= 55 && t <= 75) {
      pills.push({ icon: 'thermometer-outline', text: `${t}°F water — fish active`, color: Colors.success })
    } else if (t < 50) {
      pills.push({ icon: 'thermometer-outline', text: `${t}°F — cold, fish sluggish`, color: Colors.textTertiary })
    } else if (t > 80) {
      pills.push({ icon: 'thermometer-outline', text: `${t}°F — hot, fish early/late`, color: Colors.warning })
    }
  }

  return pills.slice(0, 5)
}

export function FishingIntelCard({ conditions }: { conditions: ConditionsData }) {
  const pills = buildPills(conditions)
  if (pills.length === 0) return null

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Fishing Intel</Text>
      {pills.map((pill, i) => (
        <View key={i} style={styles.pill}>
          <Ionicons name={pill.icon} size={13} color={pill.color} />
          <Text style={[styles.pillText, { color: pill.color }]}>{pill.text}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
})
