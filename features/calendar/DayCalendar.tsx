import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

interface Props {
  selectedDate: string
  onSelect: (dateStr: string) => void
  todayScore: number | null
  isPro: boolean
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function scoreColor(score: number | null): string {
  if (score === null) return Colors.card
  if (score >= 85) return '#4CAF70'
  if (score >= 70) return '#8BC34A'
  if (score >= 55) return '#FFC107'
  if (score >= 40) return '#FF9800'
  return '#F44336'
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function DayCalendar({ selectedDate, onSelect, todayScore, isPro }: Props) {
  const today = new Date()
  const todayKey = localDateKey(today)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startDow = firstDay.getDay()

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const prevMonth = useCallback(() => {
    if (isCurrentMonth) return
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }, [viewMonth, isCurrentMonth])

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }, [viewMonth])

  const cells: React.ReactElement[] = []

  for (let i = 0; i < startDow; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.cell} />)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const cellDate = new Date(viewYear, viewMonth, d)
    const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const isToday = dateStr === todayKey
    const isSelected = dateStr === selectedDate
    const dayIndex = Math.round((cellDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000)
    const isLocked = !isPro && dayIndex >= 7

    let dotColor: string
    if (isPast) dotColor = Colors.card
    else if (isLocked) dotColor = Colors.background
    else if (isToday && todayScore !== null) dotColor = scoreColor(todayScore)
    else dotColor = Colors.card

    cells.push(
      <TouchableOpacity
        key={dateStr}
        style={[
          styles.cell,
          isToday && styles.cellToday,
          isSelected && styles.cellSelected,
          (isPast || isLocked) && styles.cellDim,
        ]}
        onPress={() => {
          if (!isPast && !isLocked) onSelect(dateStr)
        }}
        activeOpacity={isPast || isLocked ? 1 : 0.7}
      >
        <Text style={[
          styles.dayNum,
          isToday && styles.dayNumToday,
          isSelected && styles.dayNumSelected,
          isPast && styles.dayNumPast,
        ]}>
          {d}
        </Text>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.calHeader}>
        <TouchableOpacity
          onPress={prevMonth}
          style={styles.navBtn}
          disabled={isCurrentMonth}
          activeOpacity={isCurrentMonth ? 1 : 0.7}
        >
          <Text style={[styles.navArrow, isCurrentMonth && styles.navArrowDisabled]}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd, i) => (
          <Text key={i} style={styles.weekday}>{wd}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>Today's score</Text>
        <Text style={styles.legendSep}>·</Text>
        <Text style={styles.legendLock}>🔒</Text>
        <Text style={styles.legendText}>Pro only</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    overflow: 'hidden',
  },
  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.card,
  },
  navBtn: { padding: 4 },
  navArrow: { fontSize: 18, color: Colors.textSecondary, fontWeight: '600' },
  navArrowDisabled: { color: Colors.textTertiary, opacity: 0.3 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  weekdayRow: {
    flexDirection: 'row', paddingHorizontal: 6, paddingTop: 6, paddingBottom: 2,
  },
  weekday: {
    flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600',
    color: Colors.textTertiary,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4, paddingBottom: 4,
  },
  cell: {
    width: '14.28%', alignItems: 'center', paddingVertical: 5,
    borderRadius: 8, minHeight: 44,
  },
  cellToday: { backgroundColor: Colors.card },
  cellSelected: { backgroundColor: Colors.accent },
  cellDim: { opacity: 0.4 },
  dayNum: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, lineHeight: 16 },
  dayNumToday: { color: Colors.accent },
  dayNumSelected: { color: Colors.background },
  dayNumPast: { color: Colors.textSecondary },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
  lockIcon: { fontSize: 7, position: 'absolute', top: 2, right: 4 },
  legend: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.md, paddingTop: 4, paddingBottom: 6, gap: 5,
  },
  legendDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
  legendText: { fontSize: 11, color: Colors.textSecondary },
  legendSep: { fontSize: 11, color: Colors.textTertiary },
  legendLock: { fontSize: 11 },
})
