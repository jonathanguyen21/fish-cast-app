import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import { bestWindowSummary, type SpeciesHourlyScore } from './speciesHourlyScoring'
import { SpeciesHourlyChart } from './SpeciesHourlyChart'
import type { SpeciesScore } from '../../types/species'

interface Props {
  speciesScore: SpeciesScore
  hourly?: SpeciesHourlyScore[]
  onUpgrade?: () => void
}

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const statusColor: Record<SpeciesScore['status'], string> = {
  'Peak Season': Colors.success,
  'Active': Colors.ocean,
  'Present': Colors.textSecondary,
  'Inactive': Colors.textTertiary,
}

export function SpeciesDetail({ speciesScore, hourly, onUpgrade }: Props) {
  const { species, score, status, waterTempMatch, tideMatch, timeMatch } = speciesScore
  const badgeColor = scoreColor(score)

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{species.common_name}</Text>
          <Text style={styles.scientific}>{species.scientific_name}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
          <Text style={[styles.scoreNum, { color: badgeColor }]}>{score}</Text>
          <Text style={[styles.scoreStatus, { color: statusColor[status] ?? Colors.textSecondary }]}>{status}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Activity by Month</Text>
      <View style={styles.monthChart}>
        {MONTHS.map((m, i) => {
          const month = i + 1
          const isPeak = species.months_peak.includes(month)
          const isPresent = species.months_present.includes(month)
          const barColor = isPeak ? Colors.success : isPresent ? Colors.accent : Colors.card
          const barHeight = isPeak ? 36 : isPresent ? 24 : 10
          return (
            <View key={m} style={styles.monthCol}>
              <View style={styles.monthBarTrack}>
                <View style={[styles.monthBarFill, { height: barHeight, backgroundColor: barColor }]} />
              </View>
              <Text style={[styles.monthLabel, isPeak && { color: Colors.success, fontWeight: '600' }]}>{m}</Text>
            </View>
          )
        })}
      </View>
      <View style={styles.monthLegend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.success }]} /><Text style={styles.legendText}>Peak</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.accent }]} /><Text style={styles.legendText}>Present</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.card }]} /><Text style={styles.legendText}>Absent</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Current Match</Text>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Water Temp</Text><Text style={styles.matchValue}>{waterTempMatch}</Text></View>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Tide</Text><Text style={styles.matchValue}>{tideMatch}</Text></View>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Time of Day</Text><Text style={styles.matchValue}>{timeMatch}</Text></View>

      {hourly && hourly.some(e => e.score > 0) && (
        <>
          <Text style={styles.sectionTitle}>Hourly Bite Window</Text>
          {(() => {
            const summary = bestWindowSummary(hourly)
            if (!summary) return null
            return (
              <Text style={styles.summary}>
                Best window: {formatHour(summary.start)}–{formatHour(summary.end + 1)} · avg {summary.avgScore}
              </Text>
            )
          })()}
          <SpeciesHourlyChart hourly={hourly} onUpgrade={onUpgrade} />
        </>
      )}

      <Text style={styles.sectionTitle}>Fishing Tips</Text>
      <Text style={styles.tips}>{species.tips}</Text>

      <Text style={styles.sectionTitle}>Migration Notes</Text>
      <Text style={styles.tips}>{species.migration_notes}</Text>

      <Text style={styles.sectionTitle}>Preferred Conditions</Text>
      <Text style={styles.tips}>
        Water temp: {species.water_temp_f.min}–{species.water_temp_f.max}°F (peak: {species.water_temp_f.peak_min}–{species.water_temp_f.peak_max}°F){'\n'}
        Tide: {species.preferred_tide}{'\n'}
        Time: {species.preferred_time_of_day.join(', ')}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.screenPad },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerText: { flex: 1, paddingRight: Spacing.md },
  name: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  scientific: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
  scoreBadge: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  scoreNum: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
  scoreStatus: { fontSize: 8, fontWeight: '600', textAlign: 'center', lineHeight: 11 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  monthChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 52 },
  monthCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  monthBarTrack: { width: '100%', height: 40, justifyContent: 'flex-end' },
  monthBarFill: { width: '100%', borderRadius: 3 },
  monthLabel: { fontSize: 8, color: Colors.textTertiary, marginTop: 4 },
  monthLegend: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10, color: Colors.textSecondary },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.surface },
  matchLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  matchValue: { fontSize: 13, color: Colors.textPrimary, flex: 2, textAlign: 'right' },
  tips: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  summary: { fontSize: 14, color: Colors.textPrimary, marginBottom: Spacing.sm },
})
