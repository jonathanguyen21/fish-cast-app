import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import type { ConditionsData } from '../../types/conditions'

type IoniconName = keyof typeof Ionicons.glyphMap

interface IntelPill {
  icon: IoniconName
  text: string
  color: string
}

interface TopInsight {
  title: string
  detail: string
  action: string
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
  function nextUpcoming(periods: { start: string; end: string }[]): string | null {
    for (const p of periods) {
      const m = p.start.match(/(\d+):(\d+)\s*(AM|PM)/i)
      if (!m) continue
      let h = parseInt(m[1])
      if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
      if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
      const startMins = h * 60 + parseInt(m[2])
      if (startMins > nowMins) return p.start
    }
    return null
  }

  if (inPeriod(c.moon.majorPeriods)) {
    pills.push({ icon: 'moon', text: 'Major solunar active — peak feeding', color: Colors.accent })
  } else if (inPeriod(c.moon.minorPeriods)) {
    pills.push({ icon: 'moon-outline', text: 'Minor solunar active', color: Colors.textSecondary })
  } else {
    const nextMajor = nextUpcoming(c.moon.majorPeriods)
    const nextMinor = nextUpcoming(c.moon.minorPeriods)
    if (nextMajor) {
      pills.push({ icon: 'moon-outline', text: `Major solunar at ${nextMajor}`, color: Colors.accent })
    } else if (nextMinor) {
      pills.push({ icon: 'moon-outline', text: `Minor solunar at ${nextMinor}`, color: Colors.textTertiary })
    }
  }

  // Tide
  if (c.tide) {
    if (c.tide.phase === 'incoming') {
      pills.push({ icon: 'arrow-up-outline', text: `Incoming tide · ${c.tide.next.type === 'high' ? 'High' : 'Low'} at ${c.tide.next.time}`, color: Colors.ocean })
    } else if (c.tide.phase === 'outgoing') {
      pills.push({ icon: 'arrow-down-outline', text: `Outgoing tide · ${c.tide.next.type === 'high' ? 'High' : 'Low'} at ${c.tide.next.time}`, color: Colors.textSecondary })
    } else {
      pills.push({ icon: 'remove-outline', text: `Slack water · turns at ${c.tide.next.time}`, color: Colors.textTertiary })
    }
  }

  // Wind warning
  if (c.wind.speed > 20) {
    pills.push({ icon: 'warning-outline', text: `Wind ${c.wind.speed} mph — fish deeper`, color: Colors.warning })
  } else if (c.wind.speed > 14) {
    pills.push({ icon: 'navigate-outline', text: `Moderate ${c.wind.speed} mph ${c.wind.directionLabel}`, color: Colors.textSecondary })
  }

  // Rain
  if (c.sky.rainChance >= 60) {
    pills.push({ icon: 'rainy-outline', text: `${c.sky.rainChance}% chance of rain`, color: Colors.warning })
  }

  return pills.slice(0, 4)
}

function buildTopInsight(c: ConditionsData): TopInsight {
  const score = c.fishingScore
  const color = scoreColor(score)

  // Exceptional positive combination
  const majorActive = (() => {
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
    return c.moon.majorPeriods.some(p => {
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
  })()

  if (majorActive && c.tide?.phase === 'incoming' && score >= 65) {
    return {
      title: 'Prime conditions aligning',
      detail: 'Major solunar + incoming tide — fish are actively feeding right now.',
      action: 'Get a line in the water',
      color: Colors.success,
    }
  }
  if (c.pressure.trend === 'falling' && c.pressure.rate === 'fast') {
    return {
      title: 'Pressure dropping fast',
      detail: 'Fish go on a feeding frenzy before a front. Short but intense bite window.',
      action: 'Head out now — window closing',
      color: Colors.warning,
    }
  }
  if (c.pressure.trend === 'falling' && score >= 60) {
    return {
      title: 'Conditions building',
      detail: 'Slow-falling pressure + good solunar timing — fish are moving and feeding.',
      action: 'Morning session recommended',
      color: Colors.success,
    }
  }
  if (c.wind.speed > 20) {
    return {
      title: 'Wind advisory',
      detail: `${c.wind.speed} mph ${c.wind.directionLabel} — tough surface conditions. Fish deeper or sheltered structure.`,
      action: 'Target bottom and structure',
      color: Colors.warning,
    }
  }
  if (c.moon.illumination >= 88) {
    return {
      title: 'Full moon phase',
      detail: 'Fish feed aggressively at night near lights and structure. Dawn and dusk windows especially strong.',
      action: 'Plan dawn or dusk session',
      color: Colors.accent,
    }
  }
  if (c.moon.illumination <= 12) {
    return {
      title: 'New moon phase',
      detail: 'Peak daytime solunar strength — fish activity concentrated in daylight hours.',
      action: 'Midday sessions most productive',
      color: Colors.accent,
    }
  }
  // Default score-based insight
  if (score >= 75) {
    return {
      title: 'Strong fishing day',
      detail: 'Multiple positive factors aligned. Don\'t miss this window.',
      action: 'Go fishing',
      color: Colors.success,
    }
  }
  if (score >= 55) {
    return {
      title: 'Decent conditions',
      detail: 'Pick your window carefully — best period is highlighted in the timeline.',
      action: 'Plan around the best window',
      color: Colors.accent,
    }
  }
  return {
    title: 'Challenging conditions',
    detail: 'Slow day — target structure and be patient. Low-and-slow presentations work best.',
    action: 'Fish structure deep',
    color: Colors.textSecondary,
  }
}

interface Props {
  conditions: ConditionsData
}

export function FishingIntelCard({ conditions }: Props) {
  const topInsight = buildTopInsight(conditions)
  const pills = buildPills(conditions)

  return (
    <View style={[styles.container, { borderLeftColor: topInsight.color }]}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={[styles.topTitle, { color: topInsight.color }]}>{topInsight.title}</Text>
          <Text style={styles.topDetail}>{topInsight.detail}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        <Ionicons name="flash-outline" size={11} color={topInsight.color} />
        <Text style={[styles.actionText, { color: topInsight.color }]}>{topInsight.action}</Text>
      </View>
      <View style={styles.pillsRow}>
        {pills.map((pill, i) => (
          <View key={i} style={[styles.pill, { borderColor: pill.color + '44' }]}>
            <Ionicons name={pill.icon} size={10} color={pill.color} />
            <Text style={[styles.pillText, { color: pill.color === Colors.textSecondary || pill.color === Colors.textTertiary ? Colors.textSecondary : pill.color }]} numberOfLines={1}>
              {pill.text}
            </Text>
          </View>
        ))}
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
    padding: Spacing.md,
    borderLeftWidth: 3,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  topLeft: {
    flex: 1,
    gap: 3,
  },
  topTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  topDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: Colors.card,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '500',
  },
})
