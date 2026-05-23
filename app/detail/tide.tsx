import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useSettingsStore } from '../../store/settingsStore'
import { TideChart } from '../../features/tide/TideChart'
import { estimateCurrentStrength } from '../../features/tide/tideUtils'
import type { TideData } from '../../types/conditions'

function parseEventHour(timeStr: string): number {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h
}

const CURRENT_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  strong:   { label: 'Strong Current',   color: Colors.success,   desc: 'Fish congregate on current edges and structure breaks.' },
  moderate: { label: 'Moderate Current', color: Colors.warning,   desc: 'Good water movement — fish are actively feeding.' },
  weak:     { label: 'Weak Current',     color: Colors.textSecondary, desc: 'Tide is slowing. Fish may become less active.' },
  slack:    { label: 'Slack Water',      color: Colors.textTertiary,  desc: 'Minimal water movement. Fish activity typically low.' },
}

export default function TideDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const lengthUnit = useSettingsStore(s => s.lengthUnit)
  const fmtH = (h: number) => lengthUnit === 'm' ? (h * 0.3048).toFixed(1) : h.toFixed(1)
  const heightUnit = lengthUnit === 'm' ? 'm' : 'ft'

  const tide = useMemo<TideData | null>(() => {
    if (!data) return null
    try { return JSON.parse(data) } catch { return null }
  }, [data])

  const currentHour = new Date().getHours()

  if (!tide) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.empty}>No tide data available for this spot.</Text>
      </View>
    )
  }

  const strength = estimateCurrentStrength(tide.hourlyCurve, currentHour)
  const currentCfg = CURRENT_CONFIG[strength]

  const phaseIcon = tide.phase === 'incoming' ? 'arrow-up-outline' : tide.phase === 'outgoing' ? 'arrow-down-outline' : 'remove-outline'
  const phaseColor = tide.phase === 'incoming' ? Colors.ocean : tide.phase === 'outgoing' ? Colors.accent : Colors.textTertiary
  const phaseLabel = tide.phase === 'incoming' ? 'Incoming' : tide.phase === 'outgoing' ? 'Outgoing' : 'Slack'

  const upcomingEvents = tide.events.filter(e => {
    const h = parseEventHour(e.time)
    return h >= currentHour
  }).slice(0, 4)

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top || 0 }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tides</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* Current state row */}
      <View style={styles.stateCard}>
        <View style={styles.stateMain}>
          <Text style={styles.stateHeight}>{fmtH(tide.current.height)} {heightUnit}</Text>
          <View style={styles.statePhaseRow}>
            <Ionicons name={phaseIcon} size={14} color={phaseColor} />
            <Text style={[styles.statePhase, { color: phaseColor }]}>{phaseLabel}</Text>
          </View>
        </View>
        <View style={styles.stateNext}>
          <Text style={styles.stateNextLabel}>Next {tide.next.type}</Text>
          <Text style={styles.stateNextTime}>{tide.next.time}</Text>
          <Text style={styles.stateNextHeight}>{fmtH(tide.next.height)} {heightUnit}</Text>
        </View>
      </View>

      {/* Current strength */}
      <View style={[styles.strengthCard, { borderLeftColor: currentCfg.color }]}>
        <View style={styles.strengthHeader}>
          <View style={[styles.strengthDot, { backgroundColor: currentCfg.color }]} />
          <Text style={[styles.strengthLabel, { color: currentCfg.color }]}>{currentCfg.label}</Text>
        </View>
        <Text style={styles.strengthDesc}>{currentCfg.desc}</Text>
      </View>

      {/* Full tide chart */}
      <TideChart tide={tide} currentHour={currentHour} />

      {/* Upcoming high/low events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.eventsCard}>
          <Text style={styles.eventsTitle}>Today's Tides</Text>
          {tide.events.map((ev, i) => {
            const isPast = parseEventHour(ev.time) < currentHour
            return (
              <View key={i} style={[styles.eventRow, i > 0 && styles.eventRowBorder, isPast && styles.eventRowPast]}>
                <Ionicons
                  name={ev.type === 'high' ? 'arrow-up-outline' : 'arrow-down-outline'}
                  size={14}
                  color={isPast ? Colors.textTertiary : ev.type === 'high' ? Colors.accent : Colors.textSecondary}
                />
                <Text style={[styles.eventType, isPast && styles.eventPastText]}>
                  {ev.type === 'high' ? 'High' : 'Low'} Tide
                </Text>
                <Text style={[styles.eventTime, isPast && styles.eventPastText]}>{ev.time}</Text>
                <Text style={[styles.eventHeight, isPast && styles.eventPastText]}>
                  {fmtH(ev.height)} {heightUnit}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Fishing tips by phase */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Fishing Tips</Text>
        <View style={styles.tipRow}>
          <Ionicons name="arrow-up-outline" size={13} color={Colors.ocean} />
          <Text style={styles.tipText}>
            <Text style={{ color: Colors.ocean, fontWeight: '600' }}>Incoming:</Text> Fish move shallower to feed — work current edges, jetties, and points.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="arrow-down-outline" size={13} color={Colors.accent} />
          <Text style={styles.tipText}>
            <Text style={{ color: Colors.accent, fontWeight: '600' }}>Outgoing:</Text> Baitfish concentrate near channel mouths — target predators at drop-offs.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="remove-outline" size={13} color={Colors.textTertiary} />
          <Text style={styles.tipText}>
            <Text style={{ fontWeight: '600' }}>Slack:</Text> Fish are typically least active. Move to deeper structure and slow your presentation.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 64 },
  backText: { fontSize: 14, color: Colors.textPrimary },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  empty: { textAlign: 'center', color: Colors.textTertiary, marginTop: 40 },
  stateCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screenPad,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 16,
  },
  stateMain: { flex: 1 },
  stateHeight: { fontSize: 36, fontWeight: '800', color: Colors.ocean, lineHeight: 40 },
  statePhaseRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statePhase: { fontSize: 14, fontWeight: '600' },
  stateNext: { alignItems: 'flex-end', justifyContent: 'center' },
  stateNextLabel: { fontSize: 10, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  stateNextTime: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  stateNextHeight: { fontSize: 12, color: Colors.textSecondary },
  strengthCard: {
    marginHorizontal: Spacing.screenPad,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
  },
  strengthHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  strengthDot: { width: 8, height: 8, borderRadius: 4 },
  strengthLabel: { fontSize: 13, fontWeight: '700' },
  strengthDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  eventsCard: {
    marginHorizontal: Spacing.screenPad,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  eventsTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  eventRowBorder: { borderTopWidth: 1, borderTopColor: Colors.card },
  eventRowPast: { opacity: 0.4 },
  eventType: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  eventTime: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  eventHeight: { fontSize: 12, color: Colors.textSecondary, width: 52, textAlign: 'right' },
  eventPastText: { color: Colors.textTertiary },
  tipsCard: {
    marginHorizontal: Spacing.screenPad,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    gap: 10,
  },
  tipsTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipText: { fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 17 },
})
