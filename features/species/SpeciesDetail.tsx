import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSpots } from '../../hooks/useSpots'
import { useSkyTheme } from '../../hooks/useSkyTheme'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Fonts, Type } from '../../theme/tokens'
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

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const insets = useSafeAreaInsets()
  const { activeSpot } = useSpots()
  const theme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    undefined,
    localDateKey(new Date()),
  )

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.tintedDark.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: theme.textTint }]}>{species.common_name}</Text>
          <Text style={[styles.scientific, { color: theme.textTint, opacity: 0.7 }]}>{species.scientific_name}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
          <Text style={[styles.scoreNum, { color: badgeColor }]}>{score}</Text>
          <Text style={[styles.scoreStatus, { color: statusColor[status] ?? theme.textTint }]}>{status}</Text>
        </View>
      </View>

      <Text style={[Type.secondary, styles.sectionTitle, { color: theme.textTint, opacity: 0.7 }]}>Activity by Month</Text>
      <View style={styles.monthChart}>
        {MONTHS.map((m, i) => {
          const month = i + 1
          const isPeak = species.months_peak.includes(month)
          const isPresent = species.months_present.includes(month)
          const barColor = isPeak ? Colors.success : isPresent ? theme.accent : theme.tintedDark.card
          const barHeight = isPeak ? 36 : isPresent ? 24 : 10
          return (
            <View key={m} style={styles.monthCol}>
              <View style={styles.monthBarTrack}>
                <View style={[styles.monthBarFill, { height: barHeight, backgroundColor: barColor }]} />
              </View>
              <Text style={[
                styles.monthLabel,
                { color: theme.textTint, opacity: 0.55 },
                isPeak && { color: Colors.success, fontFamily: Fonts.bold, opacity: 1 },
              ]}>{m}</Text>
            </View>
          )
        })}
      </View>
      <View style={styles.monthLegend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: Colors.success }]} /><Text style={[styles.legendText, { color: theme.textTint, opacity: 0.7 }]}>Peak</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: theme.accent }]} /><Text style={[styles.legendText, { color: theme.textTint, opacity: 0.7 }]}>Present</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: theme.tintedDark.card }]} /><Text style={[styles.legendText, { color: theme.textTint, opacity: 0.7 }]}>Absent</Text></View>
      </View>

      <Text style={[Type.secondary, styles.sectionTitle, { color: theme.textTint, opacity: 0.7 }]}>Current Match</Text>
      <View style={[styles.matchRow, { borderBottomColor: theme.tintedDark.card }]}><Text style={[styles.matchLabel, { color: theme.textTint, opacity: 0.7 }]}>Water Temp</Text><Text style={[styles.matchValue, { color: theme.textTint }]}>{waterTempMatch}</Text></View>
      <View style={[styles.matchRow, { borderBottomColor: theme.tintedDark.card }]}><Text style={[styles.matchLabel, { color: theme.textTint, opacity: 0.7 }]}>Tide</Text><Text style={[styles.matchValue, { color: theme.textTint }]}>{tideMatch}</Text></View>
      <View style={[styles.matchRow, { borderBottomColor: theme.tintedDark.card }]}><Text style={[styles.matchLabel, { color: theme.textTint, opacity: 0.7 }]}>Time of Day</Text><Text style={[styles.matchValue, { color: theme.textTint }]}>{timeMatch}</Text></View>

      {hourly && hourly.some(e => e.score > 0) && (
        <>
          <Text style={[Type.secondary, styles.sectionTitle, { color: theme.textTint, opacity: 0.7 }]}>Hourly Bite Window</Text>
          {(() => {
            const summary = bestWindowSummary(hourly)
            if (!summary) return null
            return (
              <Text style={[styles.summary, { color: theme.textTint }]}>
                Best window: {formatHour(summary.start)}–{formatHour(summary.end + 1)}
                {' · avg '}<Text style={{ color: scoreColor(summary.avgScore), fontFamily: Fonts.bold }}>{summary.avgScore}</Text>
              </Text>
            )
          })()}
          <SpeciesHourlyChart hourly={hourly} onUpgrade={onUpgrade} />
        </>
      )}

      <Text style={[Type.secondary, styles.sectionTitle, { color: theme.textTint, opacity: 0.7 }]}>Fishing Tips</Text>
      <Text style={[styles.tips, { color: theme.textTint }]}>{species.tips}</Text>

      <Text style={[Type.secondary, styles.sectionTitle, { color: theme.textTint, opacity: 0.7 }]}>Migration Notes</Text>
      <Text style={[styles.tips, { color: theme.textTint }]}>{species.migration_notes}</Text>

      <Text style={[Type.secondary, styles.sectionTitle, { color: theme.textTint, opacity: 0.7 }]}>Preferred Conditions</Text>
      <View style={[styles.matchRow, { borderBottomColor: theme.tintedDark.card }]}>
        <Text style={[styles.matchLabel, { color: theme.textTint, opacity: 0.7 }]}>Water Temp</Text>
        <Text style={[styles.matchValue, { color: theme.textTint }]}>
          {species.water_temp_f.min}–{species.water_temp_f.max}°F
          <Text style={[styles.matchSub, { color: theme.textTint, opacity: 0.55 }]}>{' '}(peak {species.water_temp_f.peak_min}–{species.water_temp_f.peak_max}°F)</Text>
        </Text>
      </View>
      <View style={[styles.matchRow, { borderBottomColor: theme.tintedDark.card }]}>
        <Text style={[styles.matchLabel, { color: theme.textTint, opacity: 0.7 }]}>Tide</Text>
        <Text style={[styles.matchValue, styles.capitalize, { color: theme.textTint }]}>{species.preferred_tide}</Text>
      </View>
      <View style={[styles.matchRow, { borderBottomColor: theme.tintedDark.card }]}>
        <Text style={[styles.matchLabel, { color: theme.textTint, opacity: 0.7 }]}>Time of Day</Text>
        <Text style={[styles.matchValue, { color: theme.textTint }]}>{species.preferred_time_of_day.join(', ')}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.screenPad },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerText: { flex: 1, paddingRight: Spacing.md },
  name: { fontSize: 26, fontFamily: Fonts.extraBold },
  scientific: { fontSize: 14, fontStyle: 'italic', marginTop: 2 },
  scoreBadge: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  scoreNum: { fontSize: 20, fontFamily: Fonts.bold, lineHeight: 22 },
  scoreStatus: { fontSize: 8, fontFamily: Fonts.bold, textAlign: 'center', lineHeight: 11 },
  sectionTitle: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  monthChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 52 },
  monthCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  monthBarTrack: { width: '100%', height: 40, justifyContent: 'flex-end' },
  monthBarFill: { width: '100%', borderRadius: 3 },
  monthLabel: { fontSize: 8, marginTop: 4 },
  monthLegend: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10 },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  matchLabel: { fontSize: 13, flex: 1 },
  matchValue: { fontSize: 13, flex: 2, textAlign: 'right' },
  matchSub: { fontSize: 11 },
  capitalize: { textTransform: 'capitalize' },
  tips: { fontSize: 14, lineHeight: 22 },
  summary: { fontSize: 14, marginBottom: Spacing.sm },
})
