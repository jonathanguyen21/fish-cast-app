import React, { useMemo, useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  ActivityIndicator, TouchableOpacity, Share,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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
import { scoreColor } from '../../features/score/scoringEngine'
import { scoreSpeciesHourly, type SpeciesHourlyScore } from '../../features/species/speciesHourlyScoring'
import { detectPhase } from '../../features/tide/tideUtils'
import { getSpeciesForRegion } from '../../data/species'
import { calculateSolunar } from '../../services/solunarService'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { useRouter } from 'expo-router'
import { ScoreCardSkeleton, TimelineSkeleton, QuickStatsSkeleton, ConditionsGridSkeleton } from '../../features/common/SkeletonLoader'
import { buildConditionsSummary } from '../../features/conditions/conditionsSummary'
import { maybeScheduleFishingAlert } from '../../services/notificationService'
import { useCatchLogStore } from '../../store/catchLogStore'

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

function parseTimeToMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + min
}

function checkSolunarActive(
  periods: { start: string; end: string }[],
  nowMinutes: number
): { active: boolean; endTime?: string } {
  for (const p of periods) {
    const start = parseTimeToMinutes(p.start)
    const end = parseTimeToMinutes(p.end)
    if (start >= 0 && end >= 0 && nowMinutes >= start && nowMinutes <= end) {
      return { active: true, endTime: p.end }
    }
  }
  return { active: false }
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
  const { data: forecast, isLoading: forecastLoading, isError: forecastError } = useForecast(activeSpot)
  const isPro = useSettingsStore(s => s.isPro)
  const tempUnit = useSettingsStore(s => s.tempUnit)
  const alertsEnabled = useSettingsStore(s => s.alertsEnabled)
  const alertThreshold = useSettingsStore(s => s.alertThreshold)
  const catchEntries = useCatchLogStore(s => s.entries)

  const now = new Date()
  const currentHour = now.getHours()

  React.useEffect(() => {
    if (!conditions || !activeSpot || !alertsEnabled) return
    maybeScheduleFishingAlert(conditions, activeSpot.name, activeSpot.id, alertThreshold)
  }, [conditions?.fishingScore, activeSpot?.id, alertsEnabled, alertThreshold])

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

  const majorMoonDays = useMemo(() => {
    if (!activeSpot) return {}
    const result: Record<string, boolean> = {}
    for (let i = -2; i <= 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      const key = localDateKey(d)
      const sol = calculateSolunar(activeSpot.lat, activeSpot.lng, d)
      result[key] = sol.isMajorMoonDay
    }
    return result
  }, [activeSpot?.id])

  const recentCatch = useMemo(() => {
    if (!activeSpot || catchEntries.length === 0) return null
    return catchEntries.find(e => e.spotId === activeSpot.id) ?? null
  }, [activeSpot?.id, catchEntries])

  const solunarNow = useMemo(() => {
    if (!conditions) return null
    const nowMins = currentHour * 60 + now.getMinutes()
    const major = checkSolunarActive(conditions.moon.majorPeriods, nowMins)
    if (major.active) return { type: 'major' as const, endTime: major.endTime }
    const minor = checkSolunarActive(conditions.moon.minorPeriods, nowMins)
    if (minor.active) return { type: 'minor' as const, endTime: minor.endTime }
    return null
  }, [conditions, currentHour])

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
        <Ionicons name="fish-outline" size={64} color={Colors.accent} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>Welcome to FishCast</Text>
        <Text style={styles.emptyHint}>Add a spot to get your personalized 0–100 fishing forecast powered by real tide, pressure, solunar, and weather data.</Text>
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
        <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/spots')}>
          <Text style={styles.emptyCtaText}>Add Your First Spot →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isError && !conditions) {
    return (
      <View style={styles.empty}>
        <Ionicons name="alert-circle-outline" size={56} color={Colors.warning} style={styles.emptyIcon} />
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
          <TouchableOpacity
            style={styles.spotNameRow}
            onPress={spots.length > 1 ? () => router.push('/spots') : undefined}
            activeOpacity={spots.length > 1 ? 0.7 : 1}
          >
            <Text style={styles.spotName}>{activeSpot.name}</Text>
            {spots.length > 1 && <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />}
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {conditions && (
              <TouchableOpacity
                style={styles.logBtn}
                onPress={() => Share.share({
                  message: `${activeSpot.name} — Fishing Score: ${conditions.fishingScore} (${conditions.scoreLabel})\nBest window: ${conditions.bestWindow.start}–${conditions.bestWindow.end}\nvia FishCast`,
                })}
              >
                <Ionicons name="share-outline" size={14} color={Colors.textSecondary} />
                <Text style={[styles.logBtnText, { color: Colors.textSecondary }]}>Share</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.logBtn} onPress={() => router.push('/(tabs)/catchlog' as any)}>
              <Ionicons name="journal-outline" size={14} color={Colors.accent} />
              <Text style={styles.logBtnText}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dateChip, showCalendar && styles.dateChipActive]}
          onPress={() => setShowCalendar(v => !v)}
        >
          <Text style={styles.dateChipText}>{formatDateChip(selectedDate)}</Text>
          <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.textTertiary} />
        </TouchableOpacity>

        {showCalendar && (
          <DayCalendar
            selectedDate={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setShowCalendar(false) }}
            todayScore={conditions?.fishingScore ?? null}
            isPro={isPro}
            majorMoonDays={majorMoonDays}
          />
        )}

        {conditions && (
          <>
            <ScoreDisplay
              score={conditions.fishingScore}
              label={conditions.scoreLabel}
              bestWindow={conditions.bestWindow}
              breakdown={conditions.scoreBreakdown}
            />
            {solunarNow && (
              <View style={[styles.solunarBanner, solunarNow.type === 'major' && styles.solunarBannerMajor]}>
                <Ionicons
                  name="moon"
                  size={14}
                  color={solunarNow.type === 'major' ? Colors.accent : Colors.textSecondary}
                />
                <Text style={[styles.solunarBannerText, solunarNow.type === 'major' && { color: Colors.accent }]}>
                  {solunarNow.type === 'major' ? 'Major' : 'Minor'} solunar period active
                  {solunarNow.endTime ? ` · Until ${solunarNow.endTime}` : ''}
                </Text>
              </View>
            )}
            <View style={[styles.summaryCard, { borderLeftColor: scoreColor(conditions.fishingScore) }]}>
              <Text style={styles.summaryText}>{buildConditionsSummary(conditions)}</Text>
            </View>
            <ScoreTimeline
              hourlyScores={conditions.hourlyScores}
              tidePhasesByHour={conditions.tidePhasesByHour}
              windHourly={conditions.windHourly}
              onUpgrade={() => router.push('/settings')}
            />
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
                  <Ionicons name="water-outline" size={18} color={Colors.ocean} />
                  <Text style={styles.quickLabel}>Tide</Text>
                  <Text style={styles.quickValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {conditions.tide.current.height.toFixed(1)} <Text style={styles.quickUnit}>{conditions.tide.current.unit}</Text>
                  </Text>
                  <Text style={styles.quickSub} numberOfLines={1}>{tidePhaseLabel(conditions.tide.phase)}</Text>
                  <Text style={styles.quickPeak} numberOfLines={1}>{tideTurnCountdown(conditions.tide)}</Text>
                </View>
              )}
              <View style={styles.quickCard}>
                <Ionicons name="thermometer-outline" size={18} color={Colors.accent} />
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
              spotType={activeSpot.type}
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
            <ForecastStrip forecast={forecast} isPro={isPro} isLoading={forecastLoading} isError={forecastError} onUpgrade={() => router.push('/settings')} />
            {recentCatch && (
              <TouchableOpacity
                style={styles.recentCatchCard}
                onPress={() => router.push('/(tabs)/catchlog' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="fish-outline" size={16} color={Colors.accent} />
                <View style={styles.recentCatchInfo}>
                  <Text style={styles.recentCatchTitle}>Last catch at this spot</Text>
                  <Text style={styles.recentCatchSub}>
                    {recentCatch.species}
                    {recentCatch.weight ? ` · ${recentCatch.weight} lbs` : ''}
                    {recentCatch.fishingScore != null ? ` · Score ${recentCatch.fishingScore}` : ''}
                    {' · '}{formatDateChip(recentCatch.date)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Skeleton loading — replaces spinner while first fetch runs */}
      {isLoading && !conditions && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.background }]}>
          <ScoreCardSkeleton />
          <TimelineSkeleton />
          <QuickStatsSkeleton />
          <ConditionsGridSkeleton />
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
  emptyIcon: { marginBottom: Spacing.sm },
  recentCatchCard: {
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.card,
  },
  recentCatchInfo: { flex: 1 },
  recentCatchTitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  recentCatchSub: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  solunarBanner: {
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.textTertiary + '40',
  },
  solunarBannerMajor: {
    backgroundColor: Colors.accent + '12',
    borderColor: Colors.accent + '40',
  },
  solunarBannerText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  summaryCard: {
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderLeftWidth: 3,
  },
  summaryText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingBottom: Spacing.sm,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  spotNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  spotName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent + '18',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  logBtnText: { fontSize: 12, fontWeight: '600', color: Colors.accent },
  quickStats: {
    flexDirection: 'row', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  quickCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  quickLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
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
})
