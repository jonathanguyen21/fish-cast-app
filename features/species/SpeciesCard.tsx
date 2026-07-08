import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Fonts, Radii } from '../../theme/tokens'
import type { SkyTheme } from '../../theme/skyTheme'
import { scoreColor } from '../score/scoringEngine'
import { bestWindowSummary, type SpeciesHourlyScore } from './speciesHourlyScoring'
import type { SpeciesScore } from '../../types/species'
import type { AbundanceTier } from '../../services/speciesOccurrenceService'

const ABUNDANCE_LABEL: Record<Exclude<AbundanceTier, 'not-recorded'>, string> = {
  common: 'Common here',
  occasional: 'Occasional',
  rare: 'Rarely seen',
}

interface Props {
  speciesScore: SpeciesScore
  hourly?: SpeciesHourlyScore[]
  isPro: boolean
  onPress: () => void
  theme?: SkyTheme
  abundanceTier?: AbundanceTier
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

const FAKE_SCORE_POOL = [82, 65, 48, 74, 58, 71, 55, 79, 63, 45]
function lockedBadgeColor(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return scoreColor(FAKE_SCORE_POOL[hash % FAKE_SCORE_POOL.length])
}

export function SpeciesCard({ speciesScore, hourly, isPro, onPress, theme, abundanceTier }: Props) {
  const { species, score, status } = speciesScore
  const isLocked = species.tier === 'pro' && !isPro
  const color = isLocked ? lockedBadgeColor(species.id) : scoreColor(score)
  const window = hourly ? bestWindowSummary(hourly) : null

  return (
    <TouchableOpacity
      style={[styles.card, theme && { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]}
      onPress={onPress}
      testID={`species-card-${species.id}`}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <View style={styles.lockedNameRow}>
            {isLocked && (
              <Ionicons
                name="lock-closed"
                size={11}
                color={theme ? theme.textTint : Colors.textTertiary}
                style={theme ? { marginRight: 4, opacity: 0.55 } : { marginRight: 4 }}
              />
            )}
            <Text style={[
              styles.name,
              theme && { fontFamily: Fonts.bold, color: theme.textTint },
              isLocked && (theme ? { color: theme.textTint, opacity: 0.55 } : styles.locked),
            ]}>{species.common_name}</Text>
          </View>
          <Text style={[styles.status, { color: statusColor[status] ?? (theme ? theme.textTint : Colors.textSecondary) }]}>
            {status}
          </Text>
          {abundanceTier && abundanceTier !== 'not-recorded' && (
            <View style={[styles.abundanceChip, theme && { backgroundColor: theme.accent + '22', borderColor: theme.accent + '55' }]}>
              <Text style={[styles.abundanceChipText, theme && { color: theme.accent }]}>
                {ABUNDANCE_LABEL[abundanceTier]}
              </Text>
            </View>
          )}
          {window && !isLocked && (
            <Text style={[styles.bestWindow, theme && { color: theme.textTint, opacity: 0.55 }]}>
              Best {formatHour(window.start)}–{formatHour(window.end + 1)}
              {' · '}<Text style={{ color: scoreColor(window.avgScore) }}>{window.avgScore}</Text>
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
          <Text style={[styles.upgradeHint, theme && { color: theme.accent }]}>Upgrade to Pro to see what's biting</Text>
          <Ionicons name="chevron-forward" size={12} color={theme ? theme.accent : Colors.accent} />
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
  abundanceChip: {
    alignSelf: 'flex-start', marginTop: 3,
    borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 2,
    backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '40',
  },
  abundanceChipText: { fontSize: 11, fontWeight: '600', color: Colors.accent },
})
