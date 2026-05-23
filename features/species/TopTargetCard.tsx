import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import { describeBestWindow } from './speciesHourlyScoring'
import type { SpeciesScore } from '../../types/species'
import type { SpeciesHourlyScore } from './speciesHourlyScoring'

interface Props {
  topSpecies: SpeciesScore
  hourly: SpeciesHourlyScore[]
  currentHour: number
  onPress: () => void
}

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

function statusColor(status: SpeciesScore['status']): string {
  switch (status) {
    case 'Peak Season': return Colors.success
    case 'Active': return Colors.accent
    case 'Present': return Colors.textSecondary
    default: return Colors.textTertiary
  }
}

export function TopTargetCard({ topSpecies, hourly, currentHour, onPress }: Props) {
  const { species, score, status, tideMatch, timeMatch } = topSpecies
  const color = scoreColor(score)
  const sColor = statusColor(status)
  const windowHint = describeBestWindow(hourly, currentHour)

  let windowText = ''
  if (windowHint) {
    switch (windowHint.kind) {
      case 'peaking-now': windowText = 'Peaking right now'; break
      case 'opens-at': windowText = `Opens at ${formatHour(windowHint.atHour)}`; break
      case 'window': windowText = `Window ${formatHour(windowHint.start)}–${formatHour(windowHint.end + 1)}`; break
    }
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.topRow}>
        <View style={styles.crown}>
          <Ionicons name="trophy-outline" size={12} color={Colors.warning} />
          <Text style={styles.crownText}>Top Target Today</Text>
        </View>
        <View style={[styles.scorePill, { borderColor: color + '60', backgroundColor: color + '18' }]}>
          <Text style={[styles.scoreNum, { color }]}>{score}</Text>
        </View>
      </View>

      <Text style={styles.speciesName}>{species.common_name}</Text>
      <Text style={styles.scientificName}>{species.scientific_name}</Text>

      <View style={styles.tagRow}>
        <View style={[styles.tag, { borderColor: sColor + '55' }]}>
          <View style={[styles.tagDot, { backgroundColor: sColor }]} />
          <Text style={[styles.tagText, { color: sColor }]}>{status}</Text>
        </View>
        {windowText && (
          <View style={[styles.tag, { borderColor: Colors.accent + '44' }]}>
            <Ionicons name="time-outline" size={9} color={Colors.accent} />
            <Text style={[styles.tagText, { color: Colors.accent }]}>{windowText}</Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.matchRow}>
        <View style={styles.matchItem}>
          <Ionicons name="water-outline" size={11} color={Colors.ocean} />
          <Text style={styles.matchText}>{tideMatch}</Text>
        </View>
        <View style={styles.matchItem}>
          <Ionicons name="sunny-outline" size={11} color={Colors.warning} />
          <Text style={styles.matchText}>{timeMatch}</Text>
        </View>
      </View>

      <View style={styles.tipsBox}>
        <Ionicons name="bulb-outline" size={12} color={Colors.warning} style={{ marginTop: 1 }} />
        <Text style={styles.tipsText}>{species.tips}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLink}>View full details</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
      </View>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  crown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  crownText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.3,
  },
  scorePill: {
    borderWidth: 1.5,
    borderRadius: 14,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  speciesName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  scientificName: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: Colors.card,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.card,
    marginBottom: 10,
  },
  matchRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: 10,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  tipsBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  footerLink: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
})
