import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Svg, Circle, Path } from 'react-native-svg'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getMoonIllumination } from 'suncalc'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

type DayStrength = 'peak' | 'major' | 'good' | 'fair' | 'normal'

interface CalDay {
  date: Date
  dayNum: number
  monthLabel: string
  strength: DayStrength
  phase: number
  phaseLabel: string
  illumination: number
  isToday: boolean
}

const PHASE_NAMES = [
  { max: 0.03, label: 'New Moon' },
  { max: 0.12, label: 'Waxing Crescent' },
  { max: 0.22, label: 'First Quarter' },
  { max: 0.38, label: 'Waxing Gibbous' },
  { max: 0.55, label: 'Full Moon' },
  { max: 0.65, label: 'Waning Gibbous' },
  { max: 0.78, label: 'Last Quarter' },
  { max: 0.92, label: 'Waning Crescent' },
  { max: 1.01, label: 'New Moon' },
]

function getPhaseName(phase: number): string {
  return PHASE_NAMES.find(p => phase < p.max)?.label ?? 'New Moon'
}

function MoonPhaseIcon({ phase, size = 15 }: { phase: number; size?: number }) {
  const r = (size - 1) / 2
  const cx = size / 2
  const cy = size / 2
  const illum = phase <= 0.5 ? phase * 2 : (1 - phase) * 2
  const isWaxing = phase < 0.5
  const txr = r * Math.abs(2 * illum - 1)
  const litColor = '#CBD5E1'

  if (illum < 0.04) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill={Colors.card} stroke={Colors.textTertiary} strokeWidth={0.75} />
      </Svg>
    )
  }
  if (illum > 0.96) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} fill={litColor} />
      </Svg>
    )
  }

  const top = `${cx.toFixed(1)},${(cy - r).toFixed(1)}`
  const bot = `${cx.toFixed(1)},${(cy + r).toFixed(1)}`
  const tx = txr.toFixed(1)
  let d: string
  if (isWaxing) {
    const sw = illum < 0.5 ? 1 : 0
    d = `M ${top} A ${r} ${r} 0 0 1 ${bot} A ${tx} ${r} 0 0 ${sw} ${top} Z`
  } else {
    const sw = illum < 0.5 ? 0 : 1
    d = `M ${top} A ${r} ${r} 0 0 0 ${bot} A ${tx} ${r} 0 0 ${sw} ${top} Z`
  }

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} fill={Colors.card} />
      <Path d={d} fill={litColor} />
    </Svg>
  )
}

function solunarStrength(phase: number): DayStrength {
  const dNew = Math.min(phase, 1 - phase)
  const dFull = Math.abs(phase - 0.5)
  const d = Math.min(dNew, dFull)
  if (d < 0.035) return 'peak'
  if (d < 0.09) return 'major'
  if (d < 0.18) return 'good'
  if (d < 0.25) return 'fair'
  return 'normal'
}

const STRENGTH_CONFIG: Record<DayStrength, { label: string; color: string; bg: string }> = {
  peak:   { label: 'Peak',   color: Colors.success, bg: Colors.success + '25' },
  major:  { label: 'Major',  color: Colors.accent,  bg: Colors.accent + '20' },
  good:   { label: 'Good',   color: Colors.ocean,   bg: Colors.ocean + '18' },
  fair:   { label: 'Fair',   color: Colors.textSecondary, bg: Colors.card },
  normal: { label: '',       color: Colors.textTertiary,  bg: Colors.card },
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function buildCalendar(today: Date): CalDay[] {
  const days: CalDay[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    date.setHours(12, 0, 0, 0)
    const { fraction: illumination, phase } = getMoonIllumination(date)
    const isToday = i === 0
    days.push({
      date,
      dayNum: date.getDate(),
      monthLabel: MONTH_NAMES[date.getMonth()],
      strength: solunarStrength(phase),
      phase,
      phaseLabel: getPhaseName(phase),
      illumination: Math.round(illumination * 100),
      isToday,
    })
  }
  return days
}

export default function SolunarCalendarScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const days = useMemo(() => buildCalendar(today), [today])
  const topDays = useMemo(() => days.filter(d => d.strength === 'peak' || d.strength === 'major').slice(0, 6), [days])

  // Find the month boundaries for the 6-week grid
  const startDow = today.getDay()
  const paddedDays: (CalDay | null)[] = [
    ...Array(startDow).fill(null),
    ...days,
  ]

  return (
    <View style={[styles.screen, { paddingTop: insets.top || Spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Solunar Calendar</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Legend */}
        <View style={styles.legend}>
          {(['peak', 'major', 'good', 'fair'] as DayStrength[]).map(s => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STRENGTH_CONFIG[s].color }]} />
              <Text style={styles.legendText}>{STRENGTH_CONFIG[s].label}</Text>
            </View>
          ))}
        </View>

        {/* Best upcoming days banner */}
        {topDays.length > 0 && (
          <View style={styles.topDaysCard}>
            <Text style={styles.topDaysTitle}>Best upcoming days</Text>
            <View style={styles.topDaysRow}>
              {topDays.map((d, i) => (
                <View key={i} style={[styles.topDay, { backgroundColor: STRENGTH_CONFIG[d.strength].bg }]}>
                  <Text style={[styles.topDayMonth, { color: STRENGTH_CONFIG[d.strength].color }]}>
                    {d.monthLabel}
                  </Text>
                  <Text style={[styles.topDayNum, { color: STRENGTH_CONFIG[d.strength].color }]}>
                    {d.dayNum}
                  </Text>
                  <Text style={styles.topDayStrength}>{STRENGTH_CONFIG[d.strength].label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Calendar grid */}
        <View style={styles.calCard}>
          <Text style={styles.calMonth}>{MONTH_NAMES[today.getMonth()]} – {MONTH_NAMES[days[days.length - 1].date.getMonth()]} {days[days.length - 1].date.getFullYear()}</Text>
          <View style={styles.weekRow}>
            {WEEKDAYS.map(d => (
              <Text key={d} style={styles.weekDay}>{d}</Text>
            ))}
          </View>
          <View style={styles.calGrid}>
            {paddedDays.map((day, i) => {
              if (!day) {
                return <View key={`pad-${i}`} style={styles.calCell} />
              }
              const cfg = STRENGTH_CONFIG[day.strength]
              const isHighlighted = day.strength === 'peak' || day.strength === 'major'
              return (
                <View
                  key={day.date.toISOString()}
                  style={[
                    styles.calCell,
                    isHighlighted && { backgroundColor: cfg.bg },
                    day.isToday && styles.calCellToday,
                  ]}
                >
                  <Text style={[
                    styles.calDayNum,
                    { color: isHighlighted ? cfg.color : day.isToday ? Colors.accent : Colors.textSecondary },
                    day.isToday && { fontWeight: '700' },
                  ]}>
                    {day.dayNum}
                  </Text>
                  {isHighlighted && (
                    <View style={[styles.calDot, { backgroundColor: cfg.color }]} />
                  )}
                  {day.strength === 'good' && (
                    <View style={[styles.calDot, { backgroundColor: cfg.color, opacity: 0.6 }]} />
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Detail list */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>30-Day Overview</Text>
          {days.filter(d => d.strength !== 'normal').map((d, i) => (
            <View key={i} style={styles.detailRow}>
              <View style={[styles.detailStrengthBadge, { backgroundColor: STRENGTH_CONFIG[d.strength].bg }]}>
                <Text style={[styles.detailStrengthText, { color: STRENGTH_CONFIG[d.strength].color }]}>
                  {STRENGTH_CONFIG[d.strength].label || 'Fair'}
                </Text>
              </View>
              <Text style={styles.detailDate}>{MONTH_NAMES[d.date.getMonth()]} {d.dayNum}</Text>
              <View style={styles.detailPhaseRow}>
                <MoonPhaseIcon phase={d.phase} size={14} />
                <Text style={styles.detailPhase}>{d.phaseLabel}</Text>
              </View>
              <Text style={styles.detailIllum}>{d.illumination}%</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          Solunar peaks occur during new and full moon phases. Fish are most active 1–2 days around each peak.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad,
    paddingBottom: Spacing.sm,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 64 },
  backText: { fontSize: 14, color: Colors.textPrimary },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  scrollContent: { paddingBottom: 40, paddingTop: Spacing.sm },
  legend: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screenPad,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.textSecondary },
  topDaysCard: {
    marginHorizontal: Spacing.screenPad,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  topDaysTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  topDaysRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  topDay: {
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 56,
  },
  topDayMonth: { fontSize: 10, fontWeight: '600' },
  topDayNum: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  topDayStrength: { fontSize: 9, color: Colors.textTertiary, marginTop: 1 },
  calCard: {
    marginHorizontal: Spacing.screenPad,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  calMonth: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 10, color: Colors.textTertiary, fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: 2,
  },
  calCellToday: { borderWidth: 1, borderColor: Colors.accent + '60' },
  calDayNum: { fontSize: 13, color: Colors.textSecondary },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  detailCard: {
    marginHorizontal: Spacing.screenPad,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  detailTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 1 },
  detailPhaseRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  detailStrengthBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, minWidth: 52, alignItems: 'center' },
  detailStrengthText: { fontSize: 11, fontWeight: '700' },
  detailDate: { fontSize: 12, color: Colors.textSecondary, width: 48 },
  detailPhase: { fontSize: 12, color: Colors.textTertiary },
  detailIllum: { fontSize: 11, color: Colors.textTertiary, width: 32, textAlign: 'right' },
  footnote: {
    fontSize: 11,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.screenPad,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: Spacing.lg,
  },
})
