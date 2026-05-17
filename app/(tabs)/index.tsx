import React, { useMemo, useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import { ActiveRightNow } from '../../features/species/ActiveRightNow'
import { ForecastStrip } from '../../features/forecast/ForecastStrip'
import { DayCalendar } from '../../features/calendar/DayCalendar'
import { scoreSpecies } from '../../features/species/speciesScoring'
import { scoreSpeciesHourly, type SpeciesHourlyScore } from '../../features/species/speciesHourlyScoring'
import { detectPhase } from '../../features/tide/tideUtils'
import { getSpeciesForRegion } from '../../data/species'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { useRouter } from 'expo-router'

function tidePhaseLabel(phase: string): string {
  if (phase === 'incoming') return '↑ Incoming'
  if (phase === 'outgoing') return '↓ Outgoing'
  return '→ Slack'
}

function tideTurnCountdown(tide: { next: { type: string; time: string } }): string {
  const m = tide.next.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return ''
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  const nextTime = new Date()
  nextTime.setHours(h, min, 0, 0)
  if (nextTime.getTime() < Date.now()) nextTime.setDate(nextTime.getDate() + 1)
  const diffMs = nextTime.getTime() - Date.now()
  const diffH = Math.floor(diffMs / 3600000)
  const diffM = Math.floor((diffMs % 3600000) / 60000)
  const type = tide.next.type === 'high' ? 'High' : 'Low'
  if (diffH === 0) return `${type} in ${diffM}m`
  return `${type} in ${diffH}h ${diffM}m`
}

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


export default function ForecastScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const netInfo = useNetInfo()
  const { activeSpot, spots } = useSpots()
  const [selectedDate, setSelectedDate] = useState<string>(() => localDateKey(new Date()))
  const [showCalendar, setShowCalendar] = useState(false)
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

  const scoredHourlyByMap = useMemo(() => {
    const map: Record<string, SpeciesHourlyScore[]> = {}
    if (!activeSpot || !conditions) return map
    for (const ss of scoredSpecies) {
      map[ss.species.id] = scoreSpeciesHourly(ss.species, {
        month: now.getMonth() + 1,
        waterTemp: conditions.water.temp,
        tidePhasesByHour: conditions.tidePhasesByHour,
      })
    }
    return map
  }, [scoredSpecies, activeSpot, conditions])

  if (!activeSpot) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🎣</Text>
        <Text style={styles.emptyText}>No spot selected</Text>
        <Text style={styles.emptyHint}>Add a fishing spot to get your first forecast</Text>
        <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/spots')}>
          <Text style={styles.emptyCtaText}>Add Your First Spot →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isError && !conditions) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyText}>Could not load conditions</Text>
        <TouchableOpacity style={styles.emptyCta} onPress={refetch}>
          <Text style={styles.emptyCtaText}>Tap to Retry</Text>
        </TouchableOpacity>
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
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.spotName}>{activeSpot.name}</Text>
          {spots.length > 1 && (
            <Text style={styles.switchHint} onPress={() => router.push('/spots')}>Switch ›</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.dateChip, showCalendar && styles.dateChipActive]}
          onPress={() => setShowCalendar(v => !v)}
        >
          <Text style={styles.dateChipText}>{formatDateChip(selectedDate)}</Text>
          <Text style={styles.dateChipArrow}>{showCalendar ? ' ▴' : ' ▾'}</Text>
        </TouchableOpacity>

        {showCalendar && (
          <DayCalendar
            selectedDate={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setShowCalendar(false) }}
            todayScore={conditions?.fishingScore ?? null}
            isPro={isPro}
          />
        )}

        {conditions && (
          <>
            <ScoreDisplay
              score={conditions.fishingScore}
              label={conditions.scoreLabel}
              bestWindow={conditions.bestWindow}
              breakdown={(conditions as any).scoreBreakdown}
            />
            <ScoreTimeline hourlyScores={conditions.hourlyScores} onUpgrade={() => router.push('/settings')} />
            <View style={styles.quickStats}>
              <WindDisplay
                wind={conditions.wind}
                peakSpeed={windPeak}
                onPress={() => router.push({
                  pathname: '/detail/wind',
                  params: {
                    data: JSON.stringify(conditions.windHourly),
                    current: JSON.stringify(conditions.wind),
                  },
                })}
              />
              {conditions.tide && (
                <View style={styles.quickCard}>
                  <Text style={styles.quickIcon}>🌊</Text>
                  <Text style={styles.quickLabel}>Tide</Text>
                  <Text style={styles.quickValue}>{conditions.tide.current.height.toFixed(1)} <Text style={styles.quickUnit}>{conditions.tide.current.unit}</Text></Text>
                  <Text style={styles.quickSub}>{tidePhaseLabel(conditions.tide.phase)}</Text>
                  <Text style={styles.quickPeak}>{tideTurnCountdown(conditions.tide)}</Text>
                </View>
              )}
              <View style={styles.quickCard}>
                <Text style={styles.quickIcon}>🌡️</Text>
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
              onPressSwell={conditions.swellHourly ? () => router.push({
                pathname: '/detail/swell' as any,
                params: { data: JSON.stringify(conditions.swellHourly) },
              }) : undefined}
              onPressAir={() => router.push({
                pathname: '/detail/airtemp' as any,
                params: { data: JSON.stringify(conditions.airHourly) },
              })}
              onPressSky={() => router.push({
                pathname: '/detail/sky' as any,
                params: { data: JSON.stringify(conditions.airHourly) },
              })}
              onPressMoon={() => router.push({
                pathname: '/detail/moon' as any,
                params: { data: JSON.stringify(conditions.moon) },
              })}
              onPressSun={() => router.push({
                pathname: '/detail/sun' as any,
                params: { data: JSON.stringify(conditions.sun) },
              })}
            />
            <ActiveRightNow
              species={scoredSpecies
                .filter(ss => isPro || ss.species.tier === 'free')
                .map(ss => ss.species)}
              hourlyByMap={scoredHourlyByMap}
              currentHour={currentHour}
              maxRows={2}
              onSeeAll={() => router.push('/(tabs)/species' as any)}
              onPressSpecies={(id) => {
                const ss = scoredSpecies.find(s => s.species.id === id)
                if (!ss) return
                router.push({
                  pathname: '/species/[id]',
                  params: { id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[id] ?? []) },
                })
              }}
            />
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.sm },
  emptyText: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingBottom: Spacing.sm,
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
  quickIcon: { fontSize: 18, marginBottom: 2 },
  quickLabel: { fontSize: 11, color: Colors.textTertiary },
  quickValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  quickSub: { fontSize: 11, color: Colors.textSecondary },
  quickPeak: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  quickUnit: { fontSize: 11, color: Colors.textSecondary },
  section: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  dateChip: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.card,
  },
  dateChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '1A',
  },
  dateChipText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  dateChipArrow: { fontSize: 12, color: Colors.textSecondary },
})
