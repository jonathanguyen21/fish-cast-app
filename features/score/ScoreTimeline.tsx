import React, { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { scoreColor } from './scoringEngine'
import { useSettingsStore } from '../../store/settingsStore'
import type { HourlyScore, TidePhase } from '../../types/conditions'

interface MoonPeriods {
  major: { start: string; end: string }[]
  minor: { start: string; end: string }[]
}

interface Props {
  hourlyScores: HourlyScore[]
  tidePhasesByHour?: Record<number, TidePhase>
  windHourly?: { hour: number; speed: number; directionLabel: string }[]
  moonPeriods?: MoonPeriods
  onUpgrade?: () => void
}

function parseTimeToMins(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + min
}

function getMoonStatus(hourNum: number, periods?: MoonPeriods): 'major' | 'minor' | null {
  if (!periods || hourNum < 0) return null
  const hStart = hourNum * 60
  const hEnd = hStart + 59
  function overlaps(p: { start: string; end: string }) {
    const s = parseTimeToMins(p.start), e = parseTimeToMins(p.end)
    return s >= 0 && e >= 0 && hStart <= e && hEnd >= s
  }
  if (periods.major.some(overlaps)) return 'major'
  if (periods.minor.some(overlaps)) return 'minor'
  return null
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 32
const THRESHOLD_Y = BAR_MAX_HEIGHT - (70 / 100) * BAR_MAX_HEIGHT

function parseHourNum(hourLabel: string): number {
  const m = hourLabel.match(/^(\d+)(AM|PM)$/i)
  if (!m) return -1
  let h = parseInt(m[1])
  if (m[2].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[2].toUpperCase() === 'AM' && h === 12) h = 0
  return h
}

const TIDE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  incoming: 'arrow-up-outline',
  outgoing: 'arrow-down-outline',
  slack: 'remove-outline',
}

const TIDE_LABELS: Record<string, string> = {
  incoming: 'In',
  outgoing: 'Out',
  slack: 'Slack',
}

export function ScoreTimeline({ hourlyScores, tidePhasesByHour, windHourly, moonPeriods, onUpgrade }: Props) {
  const isPro = useSettingsStore(s => s.isPro)
  const speedUnit = useSettingsStore(s => s.speedUnit)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  if (hourlyScores.length === 0) return null
  const maxScore = Math.max(...hourlyScores.map(h => h.score))
  const nowH = new Date().getHours()
  const currentHourLabel = `${nowH === 0 ? 12 : nowH > 12 ? nowH - 12 : nowH}${nowH < 12 ? 'AM' : 'PM'}`

  const convertSpeed = (mph: number) => speedUnit === 'kts' ? Math.round(mph * 0.868) : mph
  const speedSuffix = speedUnit === 'kts' ? 'kt' : 'mph'

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={Typography.sectionTitle}>Today's Forecast</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            testID="timeline-chart-toggle"
            style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleActive]}
            onPress={() => setViewMode('chart')}
          >
            <Ionicons name="bar-chart-outline" size={14} color={viewMode === 'chart' ? Colors.accent : Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="timeline-table-toggle"
            style={[styles.toggleBtn, viewMode === 'table' && styles.toggleActive]}
            onPress={() => setViewMode('table')}
          >
            <Ionicons name="list-outline" size={14} color={viewMode === 'table' ? Colors.accent : Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'chart' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {hourlyScores.map((item) => {
            const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
            const isPeak = item.score === maxScore
            const isNow = item.hour === currentHourLabel
            const color = scoreColor(item.score)
            const hourNum = parseHourNum(item.hour)
            const moonStatus = getMoonStatus(hourNum, moonPeriods)
            return (
              <View key={item.hour} style={styles.barWrapper}>
                <Text style={[styles.scoreLabel, isPeak && { color }]}>{item.score}</Text>
                {isNow
                  ? <View style={styles.nowChip}><Text style={styles.nowChipText}>NOW</Text></View>
                  : <View style={styles.nowChipPlaceholder} />}
                <View style={styles.barTrack}>
                  <View style={styles.thresholdLine} />
                  <View style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: color, opacity: isPeak || isNow ? 1 : 0.6 },
                    isNow && { borderWidth: 2, borderColor: Colors.accent },
                  ]} />
                </View>
                <Text style={[styles.hourLabel, isPeak && styles.hourLabelPeak]}>{item.hour}</Text>
                {moonStatus === 'major' && (
                  <Text style={styles.moonMajor}>◉</Text>
                )}
                {moonStatus === 'minor' && (
                  <Text style={styles.moonMinor}>◎</Text>
                )}
              </View>
            )
          })}
        </ScrollView>
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHour]}>Time</Text>
            <Text style={[styles.tableCell, styles.tableScore]}>Score</Text>
            {tidePhasesByHour && <Text style={[styles.tableCell, styles.tableTide]}>Tide</Text>}
            {windHourly && windHourly.length > 0 && <Text style={[styles.tableCell, styles.tableWind]}>Wind</Text>}
            {moonPeriods && <Text style={[styles.tableCell, { width: 14 }]}></Text>}
          </View>
          <ScrollView style={styles.tableScroll} nestedScrollEnabled>
            {hourlyScores.map((item) => {
              const hourNum = parseHourNum(item.hour)
              const isNow = item.hour === currentHourLabel
              const isPeak = item.score === maxScore
              const color = scoreColor(item.score)
              const tidePhase = tidePhasesByHour && hourNum >= 0 ? tidePhasesByHour[hourNum] : undefined
              const wind = windHourly?.find(w => w.hour === hourNum)
              return (
                <View key={item.hour} style={[styles.tableRow, isNow && styles.tableRowNow]}>
                  <View style={[styles.tableCell, styles.tableHour]}>
                    <Text style={[styles.tableHourText, isNow && { color: Colors.accent, fontWeight: '700' }]}>
                      {item.hour}
                    </Text>
                    {isNow && <View style={styles.nowDot} />}
                  </View>
                  <View style={[styles.tableCell, styles.tableScore]}>
                    <View style={[styles.scorePill, { backgroundColor: color + '22', borderColor: color }]}>
                      <Text style={[styles.scorePillText, { color }, isPeak && styles.scorePillPeak]}>{item.score}</Text>
                    </View>
                  </View>
                  {tidePhasesByHour && (
                    <View style={[styles.tableCell, styles.tableTide, styles.tableTideCell]}>
                      {tidePhase ? (
                        <>
                          <Ionicons name={TIDE_ICONS[tidePhase] ?? 'remove-outline'} size={10} color={tidePhase === 'incoming' ? Colors.ocean : Colors.textTertiary} />
                          <Text style={[styles.tableCellText, { color: tidePhase === 'incoming' ? Colors.ocean : Colors.textTertiary }]}>
                            {TIDE_LABELS[tidePhase] ?? tidePhase}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.tableCellText}>—</Text>
                      )}
                    </View>
                  )}
                  {windHourly && windHourly.length > 0 && (
                    <Text style={[styles.tableCell, styles.tableWind, styles.tableCellText]}>
                      {wind ? `${convertSpeed(wind.speed)} ${speedSuffix}` : '—'}
                    </Text>
                  )}
                  {(() => {
                    const ms = getMoonStatus(hourNum, moonPeriods)
                    if (!ms) return null
                    return (
                      <Text style={ms === 'major' ? styles.moonMajorTable : styles.moonMinorTable}>
                        {ms === 'major' ? '◉' : '◎'}
                      </Text>
                    )
                  })()}
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      {!isPro && (
        <TouchableOpacity style={styles.proBanner} onPress={onUpgrade} activeOpacity={0.8}>
          <View style={styles.proBannerLeft}>
            <Ionicons name="lock-closed" size={12} color={Colors.textSecondary} />
            <Text style={styles.proBannerText}> Unlock detailed hourly breakdown</Text>
          </View>
          <View style={styles.proBannerCtaRow}>
            <Text style={styles.proBannerCta}>Go Pro</Text>
            <Ionicons name="chevron-forward" size={12} color={Colors.accent} />
          </View>
        </TouchableOpacity>
      )}
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
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  toggle: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 8, overflow: 'hidden' },
  toggleBtn: { padding: 6 },
  toggleActive: { backgroundColor: Colors.accent + '22' },
  scroll: { paddingBottom: Spacing.xs, gap: Spacing.xs },
  barWrapper: { alignItems: 'center', width: BAR_WIDTH + 8 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', width: BAR_WIDTH },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  nowChip: { backgroundColor: Colors.accent, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginBottom: 2 },
  nowChipText: { fontSize: 8, color: Colors.background, fontWeight: '700' },
  nowChipPlaceholder: { height: 14, marginBottom: 2 },
  thresholdLine: { position: 'absolute', bottom: THRESHOLD_Y, left: 0, width: BAR_WIDTH, height: 1, backgroundColor: Colors.success + '40' },
  hourLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  hourLabelPeak: { color: Colors.textSecondary, fontWeight: '600' },
  moonMajor: { fontSize: 9, color: Colors.accent, marginTop: 1, textAlign: 'center' },
  moonMinor: { fontSize: 9, color: Colors.textTertiary, marginTop: 1, textAlign: 'center' },
  scoreLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', height: 14 },
  // Table view
  tableContainer: { marginTop: 4 },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.card,
  },
  tableScroll: { maxHeight: 260 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.card + '80',
  },
  tableRowNow: { backgroundColor: Colors.accent + '10' },
  tableCell: { justifyContent: 'center' },
  tableHour: { width: 52, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tableScore: { width: 56 },
  tableTide: { flex: 1 },
  tableTideCell: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tableWind: { width: 72, alignItems: 'flex-end' },
  tableHourText: { fontSize: 12, color: Colors.textSecondary },
  nowDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.accent },
  tableCellText: { fontSize: 12, color: Colors.textTertiary },
  scorePill: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  scorePillText: { fontSize: 12, fontWeight: '600' },
  scorePillPeak: { fontWeight: '800' },
  moonMajorTable: { fontSize: 10, color: Colors.accent, width: 14, textAlign: 'center' },
  moonMinorTable: { fontSize: 10, color: Colors.textTertiary, width: 14, textAlign: 'center' },
  proBanner: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent + '12',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  proBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  proBannerText: { fontSize: 12, color: Colors.textSecondary },
  proBannerCta: { fontSize: 12, fontWeight: '700', color: Colors.accent },
  proBannerCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
})
