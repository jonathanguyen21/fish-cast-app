import React, { useMemo, useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  ActivityIndicator, Modal, Pressable, TouchableOpacity,
} from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { useForecast } from '../../hooks/useForecast'
import { useSettingsStore } from '../../store/settingsStore'
import { ScoreDisplay } from '../../features/score/ScoreDisplay'
import { ScoreTimeline } from '../../features/score/ScoreTimeline'
import { TideChart } from '../../features/tide/TideChart'
import { WindDisplay } from '../../features/wind/WindDisplay'
import { ConditionsGrid } from '../../features/conditions/ConditionsGrid'
import { SpeciesCard } from '../../features/species/SpeciesCard'
import { ForecastStrip } from '../../features/forecast/ForecastStrip'
import { scoreSpecies } from '../../features/species/speciesScoring'
import { detectPhase } from '../../features/tide/tideUtils'
import { getSpeciesForRegion } from '../../data/species'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useRouter } from 'expo-router'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateChip(dateStr: string): string {
  const todayStr = localDateKey(new Date())
  if (dateStr === todayStr) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getDayPills(): { dateStr: string; label: string; dayNum: number }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      dateStr: localDateKey(d),
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
    }
  })
}

export default function ForecastScreen() {
  const router = useRouter()
  const netInfo = useNetInfo()
  const { activeSpot, spots } = useSpots()
  const [selectedDate, setSelectedDate] = useState<string>(() => localDateKey(new Date()))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const { data: conditions, isLoading, isError, refetch } = useConditions(activeSpot, selectedDate)
  const { data: forecast } = useForecast(activeSpot)
  const isPro = useSettingsStore(s => s.isPro)
  const tempUnit = useSettingsStore(s => s.tempUnit)

  const now = new Date()
  const currentHour = now.getHours()

  const windPeak = conditions?.windHourly?.length
    ? Math.max(...conditions.windHourly.map(h => h.speed))
    : undefined

  const tideNextHigh = conditions?.tide?.events.find(e => e.type === 'high')

  const scoredSpecies = useMemo(() => {
    if (!activeSpot || !conditions) return []
    const tidePhase = conditions.tide
      ? detectPhase(conditions.tide.hourlyCurve, currentHour)
      : 'slack'
    return getSpeciesForRegion(activeSpot.lat, activeSpot.lng)
      .map(sp => scoreSpecies(sp, {
        month: now.getMonth() + 1,
        waterTemp: conditions.water.temp,
        tidePhase,
        currentHour,
      }))
      .sort((a, b) => {
        if (!isPro && a.species.tier === 'pro' && b.species.tier !== 'pro') return 1
        if (!isPro && b.species.tier === 'pro' && a.species.tier !== 'pro') return -1
        return b.score - a.score
      })
  }, [activeSpot, conditions, currentHour, isPro])

  if (!activeSpot) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spot selected</Text>
        <Text style={styles.emptyHint}>Go to Spots tab to add your first fishing spot</Text>
      </View>
    )
  }

  if (isError && !conditions) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Could not load conditions</Text>
        <Text style={styles.emptyHint} onPress={refetch}>Tap to retry</Text>
      </View>
    )
  }

  return (
    <View style={styles.screenContainer}>
      {/* Offline banner */}
      {netInfo.isConnected === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading && !!conditions} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        <View style={styles.header}>
          <Text style={styles.spotName}>{activeSpot.name}</Text>
          {spots.length > 1 && (
            <Text style={styles.switchHint} onPress={() => router.push('/spots')}>Switch ›</Text>
          )}
        </View>

        <TouchableOpacity style={styles.dateChip} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateChipText}>{formatDateChip(selectedDate)}</Text>
          <Text style={styles.dateChipArrow}> ▾</Text>
        </TouchableOpacity>

        {conditions && (
          <>
            <ScoreDisplay
              score={conditions.fishingScore}
              label={conditions.scoreLabel}
              bestWindow={conditions.bestWindow}
            />
            <ScoreTimeline hourlyScores={conditions.hourlyScores} />
            <View style={styles.quickStats}>
              <WindDisplay
                wind={conditions.wind}
                peakSpeed={windPeak}
                onPress={() => router.push({
                  pathname: '/detail/wind',
                  params: { data: JSON.stringify(conditions.windHourly) },
                })}
              />
              {conditions.tide && (
                <View style={styles.quickCard}>
                  <Text style={styles.quickLabel}>Tide</Text>
                  <Text style={styles.quickValue}>{conditions.tide.current.height} ft</Text>
                  <Text style={styles.quickSub}>{conditions.tide.current.rising ? '▲ Rising' : '▼ Falling'}</Text>
                  {tideNextHigh && (
                    <Text style={styles.quickPeak}>▲ {tideNextHigh.height.toFixed(1)} ft {tideNextHigh.time}</Text>
                  )}
                </View>
              )}
              <View style={styles.quickCard}>
                <Text style={styles.quickLabel}>Water</Text>
                <Text style={styles.quickValue}>
                  {tempUnit === 'C'
                    ? Math.round((conditions.water.temp - 32) * 5 / 9)
                    : conditions.water.temp}°
                </Text>
                <Text style={styles.quickSub}>{tempUnit === 'C' ? '°C' : '°F'}</Text>
              </View>
            </View>
            {conditions.tide && <TideChart tide={conditions.tide} currentHour={currentHour} />}
            <ConditionsGrid
                conditions={conditions}
                onPressPressure={() => router.push({
                  pathname: '/detail/pressure' as any,
                  params: { data: JSON.stringify(conditions.pressure) },
                })}
              />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Biting</Text>
              {scoredSpecies.map(ss => (
                <SpeciesCard
                  key={ss.species.id}
                  speciesScore={ss}
                  isPro={isPro}
                  onPress={() => {
                    if (ss.species.tier === 'pro' && !isPro) return
                    router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss) } })
                  }}
                />
              ))}
            </View>
            <ForecastStrip forecast={forecast} isPro={isPro} onUpgrade={() => router.push('/settings')} />
          </>
        )}
      </ScrollView>

      {/* Loading overlay — sits on top of ScrollView while fetching */}
      {isLoading && !conditions && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
              {getDayPills().map(({ dateStr, label, dayNum }, i) => {
                const isLocked = !isPro && i >= 7
                const isSelected = dateStr === selectedDate
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.dayPill,
                      isSelected && styles.dayPillSelected,
                      isLocked && styles.dayPillLocked,
                    ]}
                    onPress={() => {
                      if (isLocked) {
                        setShowDatePicker(false)
                        router.push('/settings')
                      } else {
                        setSelectedDate(dateStr)
                        setShowDatePicker(false)
                      }
                    }}
                  >
                    <Text style={[styles.dayPillLabel, isSelected && styles.dayPillLabelSelected]}>
                      {isLocked ? '🔒' : label}
                    </Text>
                    <Text style={[styles.dayPillNum, isSelected && styles.dayPillLabelSelected]}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  offlineBanner: {
    backgroundColor: Colors.warning + 'CC',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineText: { fontSize: 12, color: Colors.background, fontWeight: '600' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background + 'AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingTop: 56, paddingBottom: Spacing.sm,
  },
  spotName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  switchHint: { fontSize: 14, color: Colors.accent },
  quickStats: {
    flexDirection: 'row', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  quickCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  quickLabel: { fontSize: 11, color: Colors.textTertiary },
  quickValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  quickSub: { fontSize: 11, color: Colors.textSecondary },
  quickPeak: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  section: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  dateChip: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  dateChipText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  dateChipArrow: { fontSize: 12, color: Colors.textSecondary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: Spacing.md,
    paddingBottom: 32,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  pickerScroll: { paddingHorizontal: Spacing.screenPad, gap: Spacing.sm },
  dayPill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  dayPillSelected: { backgroundColor: Colors.accent },
  dayPillLocked: { opacity: 0.4 },
  dayPillLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  dayPillNum: { fontSize: 16, color: Colors.textPrimary, fontWeight: '700' },
  dayPillLabelSelected: { color: Colors.background },
})
