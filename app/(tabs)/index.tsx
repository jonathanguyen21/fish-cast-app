import React, { useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetInfo } from '@react-native-community/netinfo'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { useForecast } from '../../hooks/useForecast'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ScoreCardSkeleton, TimelineSkeleton } from '../../features/common/SkeletonLoader'
import { buildConditionsSummary } from '../../features/conditions/conditionsSummary'
import { maybeScheduleFishingAlert } from '../../services/notificationService'
import { useSkyTheme } from '../../hooks/useSkyTheme'
import { SkyBackground } from '../../features/sky/SkyBackground'
import { VerdictHero } from '../../features/score/VerdictHero'
import { BiteCurve } from '../../features/score/BiteCurve'
import { pickBetterDay } from '../../features/score/verdict'
import { Glass, Radii, Type } from '../../theme/tokens'
import { detectPhase, formatTideHeight, formatScrubTime } from '../../features/tide/tideUtils'

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
  const { activeSpot } = useSpots()
  const params = useLocalSearchParams<{ date?: string }>()
  const selectedDate = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : localDateKey(new Date())
  const { data: conditions, isLoading, isError, refetch } = useConditions(activeSpot, selectedDate)
  const { data: forecast } = useForecast(activeSpot)
  const alertsEnabled = useSettingsStore(s => s.alertsEnabled)
  const alertThreshold = useSettingsStore(s => s.alertThreshold)
  const speedUnit = useSettingsStore(s => s.speedUnit)
  const tempUnit = useSettingsStore(s => s.tempUnit)

  const skyTheme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    conditions?.sky.icon,
    selectedDate,
    conditions?.bestWindow.start,
  )
  const todayKey = localDateKey(new Date())
  const betterDay = conditions && selectedDate === todayKey
    ? pickBetterDay(forecast, conditions.fishingScore, selectedDate)
    : null

  // Hour (0-23) currently being scrubbed on the bite curve, or null when not
  // dragging. Wind and tide have real hourly data, so their chips preview the
  // scrubbed hour; water temp has no hourly source anywhere in this app (NOAA
  // only gives a single latest reading), so that chip is left showing the
  // current value rather than fabricating an hourly curve for it.
  const [scrubHour, setScrubHour] = useState<number | null>(null)
  const scrubTide = scrubHour !== null && conditions?.tide
    ? { phase: detectPhase(conditions.tide.hourlyCurve, scrubHour), height: conditions.tide.hourlyCurve[scrubHour] }
    : null
  const scrubWind = scrubHour !== null
    ? conditions?.windHourly.find(h => h.hour === scrubHour) ?? null
    : null

  React.useEffect(() => {
    if (!conditions || !activeSpot || !alertsEnabled) return
    maybeScheduleFishingAlert(conditions, activeSpot.name, activeSpot.id, alertThreshold)
  }, [conditions?.fishingScore, activeSpot?.id, alertsEnabled, alertThreshold])

  if (!activeSpot) {
    return (
      <SkyBackground theme={skyTheme}>
        <View style={styles.empty}>
          <Ionicons name="fish-outline" size={64} color={Colors.accent} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: skyTheme.textTint }]}>Welcome to FishCast</Text>
          <Text style={[styles.emptyHint, { color: skyTheme.textTint, opacity: 0.8 }]}>Add a spot to get your personalized 0–100 fishing forecast powered by real tide, pressure, solunar, and weather data.</Text>
          <View style={styles.featurePills}>
            <View style={styles.featurePill}>
              <Ionicons name="water-outline" size={14} color={Colors.ocean} />
              <Text style={styles.featurePillText}>Live tides</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="moon-outline" size={14} color={Colors.accent} />
              <Text style={styles.featurePillText}>Solunar</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="speedometer-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.featurePillText}>Pressure</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="navigate-outline" size={14} color={Colors.success} />
              <Text style={styles.featurePillText}>Wind</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.emptyCta, styles.emptyCtaRow]} onPress={() => router.push('/(tabs)/spots')}>
            <Text style={styles.emptyCtaText}>Add Your First Spot</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </SkyBackground>
    )
  }

  if (isError && !conditions) {
    return (
      <SkyBackground theme={skyTheme}>
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.warning} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: skyTheme.textTint }]}>Could not load conditions</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={refetch}>
            <Text style={styles.emptyCtaText}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      </SkyBackground>
    )
  }

  return (
    <SkyBackground theme={skyTheme}>
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
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View>
            <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.75 }]}>
              {formatDateChip(selectedDate)}
            </Text>
            <Text style={[Type.title, { color: skyTheme.textTint, fontSize: 18 }]}>
              {activeSpot?.name ?? 'FishCast'}
            </Text>
            {selectedDate !== todayKey && (
              <TouchableOpacity
                testID="back-to-today"
                accessibilityRole="button"
                onPress={() => router.setParams({ date: undefined })}
                style={styles.backToTodayPill}
              >
                <Text style={[Type.chip, { color: skyTheme.accent }]}>Back to today</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            testID="settings-gear"
            accessibilityRole="button"
            onPress={() => router.push('/settings')}
            style={styles.gear}
          >
            <Ionicons name="settings-outline" size={20} color={skyTheme.textTint} />
          </TouchableOpacity>
        </View>

        {conditions && (
          <>
            <VerdictHero
              score={conditions.fishingScore}
              breakdown={conditions.scoreBreakdown}
              spotType={activeSpot.type}
              skyTheme={skyTheme}
              sky={conditions.sky}
              summary={buildConditionsSummary(conditions)}
              betterDay={betterDay}
            />
            <BiteCurve
              hourlyScores={conditions.hourlyScores}
              bestWindow={conditions.bestWindow}
              currentHour={selectedDate === todayKey ? new Date().getHours() : null}
              skyTheme={skyTheme}
              title={selectedDate === todayKey ? "Today's bite" : 'Forecast bite'}
              onScrubChange={setScrubHour}
            />
            <View style={styles.chipsRow}>
              {conditions.tide && (
                <TouchableOpacity
                  testID="chip-tide"
                  style={styles.conditionChip}
                  onPress={() => router.push({ pathname: '/conditions', params: { section: 'tide', date: selectedDate } })}
                >
                  <Text style={[Type.chip, { color: skyTheme.textTint }]}>
                    {scrubTide
                      ? scrubTide.phase === 'slack' ? 'Tide holding' : scrubTide.phase === 'incoming' ? 'Tide rising' : 'Tide falling'
                      : (conditions.tide.current.rising ? 'Tide rising' : 'Tide falling')}
                  </Text>
                  <Text style={[styles.chipSub, { color: skyTheme.textTint }]}>
                    {scrubTide
                      ? `${formatTideHeight(scrubTide.height, conditions.tide.current.unit)} · ${formatScrubTime(scrubHour!)}`
                      : selectedDate === todayKey
                        ? tideTurnCountdown(conditions.tide)
                        : `${conditions.tide.next.type === 'high' ? 'High' : 'Low'} ${conditions.tide.next.time}`}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="chip-wind"
                style={styles.conditionChip}
                onPress={() => router.push({ pathname: '/conditions', params: { section: 'wind', date: selectedDate } })}
              >
                <Text style={[Type.chip, { color: skyTheme.textTint }]}>
                  Wind {speedUnit === 'kts'
                    ? Math.round((scrubWind?.speed ?? conditions.wind.speed) * 0.868)
                    : Math.round(scrubWind?.speed ?? conditions.wind.speed)} {speedUnit === 'kts' ? 'kt' : 'mph'}
                </Text>
                <Text style={[styles.chipSub, { color: skyTheme.textTint }]}>
                  {scrubWind ? `${scrubWind.directionLabel} · ${formatScrubTime(scrubHour!)}` : conditions.wind.directionLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity testID="chip-species" style={styles.conditionChip} onPress={() => router.push('/(tabs)/species' as never)}>
                <Text style={[Type.chip, { color: skyTheme.textTint }]}>What's biting</Text>
                <Text style={[styles.chipSub, { color: skyTheme.textTint }]}>
                  {conditions.water.estimated ? '~' : ''}{tempUnit === 'C' ? Math.round((conditions.water.temp - 32) * 5 / 9) : conditions.water.temp}° water
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Skeleton loading — replaces spinner while first fetch runs */}
      {isLoading && !conditions && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <ScoreCardSkeleton />
          <TimelineSkeleton />
        </View>
      )}

    </SkyBackground>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  offlineBanner: {
    backgroundColor: Colors.warning + 'CC',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineText: { fontSize: 12, color: Colors.background, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyIcon: { marginBottom: Spacing.sm },
  emptyText: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  featurePills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center', marginVertical: Spacing.sm },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  featurePillText: { fontSize: 12, color: Colors.textSecondary },
  emptyCta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: Colors.background },
  emptyCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 4 },
  backToTodayPill: {
    alignSelf: 'flex-start', marginTop: 6,
    backgroundColor: Glass.fill, borderWidth: 1, borderColor: Glass.stroke,
    borderRadius: Radii.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  gear: { width: 34, height: 34, borderRadius: 17, backgroundColor: Glass.fill, borderWidth: 1, borderColor: Glass.stroke, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  conditionChip: { flex: 1, backgroundColor: Glass.fill, borderWidth: 1, borderColor: Glass.stroke, borderRadius: Radii.chip, padding: 10, alignItems: 'center' },
  chipSub: { fontSize: 11, opacity: 0.7, marginTop: 2 },
})
