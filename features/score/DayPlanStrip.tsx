import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'
import type { HourlyScore } from '../../types/conditions'

type IoniconName = keyof typeof Ionicons.glyphMap

interface Block {
  label: string
  hours: string[]
  avgScore: number
  iconName: IoniconName
  iconColor: string
}

function parseHour(hour: string): number {
  const m = hour.match(/^(\d+)(AM|PM)$/i)
  if (!m) return -1
  let h = parseInt(m[1])
  if (m[2].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[2].toUpperCase() === 'AM' && h === 12) h = 0
  return h
}

const TIME_BLOCKS: { label: string; iconName: IoniconName; iconColor: string; start: number; end: number }[] = [
  { label: 'Dawn',      iconName: 'sunny-outline',        iconColor: '#FB923C', start: 5,  end: 8  },
  { label: 'Morning',   iconName: 'sunny',                iconColor: '#FBBF24', start: 9,  end: 12 },
  { label: 'Afternoon', iconName: 'partly-sunny-outline', iconColor: '#FCD34D', start: 13, end: 17 },
  { label: 'Dusk',      iconName: 'moon-outline',         iconColor: Colors.purple, start: 18, end: 20 },
]

function buildBlocks(hourlyScores: HourlyScore[]): Block[] {
  return TIME_BLOCKS.map(block => {
    const relevant = hourlyScores.filter(h => {
      const hr = parseHour(h.hour)
      return hr >= block.start && hr <= block.end
    })
    const avgScore = relevant.length
      ? Math.round(relevant.reduce((s, h) => s + h.score, 0) / relevant.length)
      : 0
    return {
      label: block.label,
      hours: relevant.map(h => h.hour),
      avgScore,
      iconName: block.iconName,
      iconColor: block.iconColor,
    }
  })
}

export function DayPlanStrip({ hourlyScores }: { hourlyScores: HourlyScore[] }) {
  if (!hourlyScores.length) return null
  const blocks = buildBlocks(hourlyScores)
  const maxScore = Math.max(...blocks.map(b => b.avgScore), 1)

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Day at a glance</Text>
      <View style={styles.row}>
        {blocks.map(block => {
          const isTop = block.avgScore === maxScore && block.avgScore >= 50
          return (
            <View key={block.label} style={[styles.block, isTop && styles.blockHighlight]}>
              <Ionicons name={block.iconName} size={18} color={block.iconColor} />
              <Text style={styles.blockLabel}>{block.label}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barFill,
                  { height: `${(block.avgScore / 100) * 100}%`, backgroundColor: scoreColor(block.avgScore) },
                ]} />
              </View>
              <Text style={[styles.score, { color: scoreColor(block.avgScore) }]}>{block.avgScore}</Text>
              {isTop && <Text style={styles.bestTag}>BEST</Text>}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  block: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 8,
    gap: 3,
  },
  blockHighlight: {
    backgroundColor: Colors.accent + '18',
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  blockLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  barTrack: {
    width: '100%',
    height: 36,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  score: { fontSize: 13, fontWeight: '800' },
  bestTag: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
})
