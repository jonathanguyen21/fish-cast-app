import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { scoreColor } from '../score/scoringEngine'
import { describeBestWindow, type SpeciesHourlyScore } from './speciesHourlyScoring'
import type { Species } from '../../types/species'

interface Props {
  species: Species[]
  hourlyByMap: Record<string, SpeciesHourlyScore[]>
  currentHour: number
  onPressSpecies: (id: string) => void
  maxRows?: number
  onSeeAll?: () => void
}

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

function hintLabel(hourly: SpeciesHourlyScore[], currentHour: number): string {
  const hint = describeBestWindow(hourly, currentHour)
  if (!hint) return 'Not active now'
  switch (hint.kind) {
    case 'peaking-now': return 'Peaking now'
    case 'opens-at': return `Opens ${formatHour(hint.atHour)}`
    case 'window': return `Window ${formatHour(hint.start)}–${formatHour(hint.end + 1)}`
  }
}

export function ActiveRightNow({ species, hourlyByMap, currentHour, onPressSpecies, maxRows = 3, onSeeAll }: Props) {
  const rows = useMemo(() => {
    return species
      .map(sp => {
        const hourly = hourlyByMap[sp.id] ?? []
        const currentEntry = hourly.find(e => e.hour === currentHour)
        const currentScore = currentEntry?.score ?? 0
        return { species: sp, hourly, currentScore }
      })
      .sort((a, b) => b.currentScore - a.currentScore)
      .slice(0, maxRows)
  }, [species, hourlyByMap, currentHour, maxRows])

  if (rows.length === 0) return null

  const hasActive = rows.some(r => r.currentScore > 0)

  return (
    <View style={styles.container}>
      <Text style={Typography.sectionTitle}>Active Right Now</Text>
      {!hasActive && (
        <Text style={styles.quietNote}>No species peaking right now — check back around dawn or tide turns</Text>
      )}
      <View style={styles.card}>
        {rows.map((row, idx) => {
          const isInactive = row.currentScore === 0
          const color = isInactive ? Colors.textTertiary : scoreColor(row.currentScore)
          return (
            <TouchableOpacity
              key={row.species.id}
              testID={`active-row-${row.species.id}`}
              style={[styles.row, idx > 0 && styles.rowBorder, isInactive && styles.rowDim]}
              onPress={() => onPressSpecies(row.species.id)}
            >
              <Text style={[styles.name, isInactive && styles.nameDim]}>{row.species.common_name}</Text>
              <Text style={[styles.hint, isInactive && styles.hintDim]}>
                {hintLabel(row.hourly, currentHour)}
              </Text>
              <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
                <Text style={[styles.badgeScore, { color }]}>
                  {isInactive ? '—' : row.currentScore}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
        {onSeeAll && (
          <TouchableOpacity style={styles.seeAll} onPress={onSeeAll} accessibilityRole="button" accessibilityLabel="See all species">
            <Text style={styles.seeAllText}>See all species</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden' },
  quietNote: {
    fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.sm, lineHeight: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface },
  rowDim: { opacity: 0.5 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  nameDim: { color: Colors.textSecondary },
  hint: { fontSize: 12, color: Colors.textSecondary },
  hintDim: { color: Colors.textTertiary },
  badge: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeScore: { fontSize: 13, fontWeight: '700' },
  seeAll: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  seeAllText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
})
