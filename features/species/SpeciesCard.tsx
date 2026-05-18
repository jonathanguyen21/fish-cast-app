import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import { bestWindowSummary, type SpeciesHourlyScore } from './speciesHourlyScoring'
import type { SpeciesScore } from '../../types/species'

interface Props {
  speciesScore: SpeciesScore
  hourly?: SpeciesHourlyScore[]
  isPro: boolean
  onPress: () => void
}

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

const statusColor: Record<SpeciesScore['status'], string> = {
  'Peak Season': Colors.success,
  'Active': Colors.ocean,
  'Present': Colors.textSecondary,
  'Inactive': Colors.textTertiary,
}

export function SpeciesCard({ speciesScore, hourly, isPro, onPress }: Props) {
  const { species, score, status } = speciesScore
  const isLocked = species.tier === 'pro' && !isPro
  const color = scoreColor(score)
  const window = hourly ? bestWindowSummary(hourly) : null

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} testID={`species-card-${species.id}`}>
      <View style={styles.row}>
        <View style={styles.info}>
          {isLocked ? (
            <View style={styles.lockedNameRow}>
              <Ionicons name="lock-closed" size={12} color={Colors.textTertiary} />
              <Text style={[styles.name, styles.locked]}> Pro Species</Text>
            </View>
          ) : (
            <Text style={styles.name}>{species.common_name}</Text>
          )}
          <Text style={[styles.status, { color: statusColor[status] ?? Colors.textSecondary }]}>
            {status}
          </Text>
          {window && !isLocked && (
            <Text style={styles.bestWindow}>
              Best {formatHour(window.start)}–{formatHour(window.end + 1)} · {window.avgScore}
            </Text>
          )}
        </View>
        {/* color is always a 6-digit hex from scoreColor(); '22' appends ~13% alpha */}
        <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.badgeScore, { color }]}>{isLocked ? '?' : score}</Text>
        </View>
      </View>
      {isLocked && (
        <View style={styles.upgradeHintRow}>
          <Text style={styles.upgradeHint}>Upgrade to Pro to see what's biting</Text>
          <Ionicons name="chevron-forward" size={12} color={Colors.accent} />
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  locked: { color: Colors.textTertiary },
  lockedNameRow: { flexDirection: 'row', alignItems: 'center' },
  status: { fontSize: 12, marginTop: 2 },
  badge: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeScore: { fontSize: 15, fontWeight: '700' },
  upgradeHintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs },
  upgradeHint: { fontSize: 12, color: Colors.accent },
  bestWindow: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
})
