import React, { useMemo, useState } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getDailySolunar } from '../../services/solunarService'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

interface Props {
  lat: number
  lng: number
  visible: boolean
  onClose: () => void
  onSelectDate?: (dateStr: string) => void
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function ratingColor(rating: number): string {
  if (rating >= 70) return Colors.success
  if (rating >= 50) return Colors.accent
  if (rating >= 35) return Colors.warning
  return Colors.textTertiary
}

function ratingBg(rating: number): string {
  if (rating >= 70) return Colors.success + '30'
  if (rating >= 50) return Colors.accent + '25'
  if (rating >= 35) return Colors.warning + '20'
  return 'transparent'
}

function moonIconForPhase(phase: number): keyof typeof Ionicons.glyphMap {
  if (phase < 0.08 || phase > 0.92) return 'ellipse-outline'
  if (phase > 0.42 && phase < 0.58) return 'moon'
  if (phase < 0.5) return 'moon-outline'
  return 'moon-outline'
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function SolunarCalendarModal({ lat, lng, visible, onClose, onSelectDate }: Props) {
  const insets = useSafeAreaInsets()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startPad = firstDay.getDay()
    const result: Array<{ date: Date; solunar: ReturnType<typeof getDailySolunar> } | null> = []
    for (let i = 0; i < startPad; i++) result.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(viewYear, viewMonth, d)
      result.push({ date, solunar: getDailySolunar(lat, lng, date) })
    }
    return result
  }, [lat, lng, viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const todayKey = localDateKey(today)
  const primeCount = days.filter(d => d && d.solunar.rating >= 70).length
  const goodCount = days.filter(d => d && d.solunar.rating >= 50 && d.solunar.rating < 70).length

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top || 16 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Solunar Calendar</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.statText}>{primeCount} Prime days</Text>
          </View>
          <View style={styles.statPill}>
            <View style={[styles.statDot, { backgroundColor: Colors.accent }]} />
            <Text style={styles.statText}>{goodCount} Good days</Text>
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map(l => (
            <Text key={l} style={styles.weekdayLabel}>{l}</Text>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.grid}>
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIdx) => (
            <View key={weekIdx} style={styles.weekRow}>
              {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((cell, colIdx) => {
                if (!cell) {
                  return <View key={colIdx} style={styles.dayCell} />
                }
                const { date, solunar } = cell
                const dateKey = localDateKey(date)
                const isToday = dateKey === todayKey
                const isPast = date < today && !isToday
                const color = ratingColor(solunar.rating)
                const bg = ratingBg(solunar.rating)
                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={[
                      styles.dayCell,
                      { backgroundColor: bg },
                      isToday && styles.todayCell,
                    ]}
                    onPress={() => { onSelectDate?.(dateKey); onClose() }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNum,
                      isPast && styles.dayNumPast,
                      isToday && styles.dayNumToday,
                    ]}>
                      {date.getDate()}
                    </Text>
                    <Ionicons
                      name={moonIconForPhase(solunar.phase)}
                      size={10}
                      color={isPast ? Colors.textTertiary : Colors.textSecondary}
                    />
                    <Text style={[styles.dayRating, { color: isPast ? Colors.textTertiary : color }]}>
                      {solunar.rating}
                    </Text>
                    {solunar.isMajorDay && !isPast && (
                      <View style={[styles.majorDot, { backgroundColor: color }]} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </ScrollView>

        <View style={styles.legend}>
          {[
            { label: 'Prime ≥70', color: Colors.success },
            { label: 'Good ≥50', color: Colors.accent },
            { label: 'Fair ≥35', color: Colors.warning },
          ].map(({ label, color }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.majorDot, { backgroundColor: Colors.accent, marginRight: 4 }]} />
            <Text style={styles.legendText}>Major day</Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad,
    paddingBottom: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad,
    paddingVertical: Spacing.sm,
  },
  navBtn: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenPad,
    marginBottom: Spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenPad,
    marginBottom: 4,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  grid: {
    paddingHorizontal: Spacing.screenPad,
    gap: 4,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayNumPast: {
    color: Colors.textTertiary,
  },
  dayNumToday: {
    color: Colors.accent,
  },
  dayRating: {
    fontSize: 11,
    fontWeight: '700',
  },
  majorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.screenPad,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surface,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
})
