import React, { useMemo } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native'
import Animated from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { useTabBarScrollHandler } from '../../hooks/useTabBarScrollHandler'
import { useSettingsStore } from '../../store/settingsStore'
import { SpeciesCard } from '../../features/species/SpeciesCard'
import { ActiveRightNow } from '../../features/species/ActiveRightNow'
import { scoreSpecies } from '../../features/species/speciesScoring'
import { scoreSpeciesHourly, type SpeciesHourlyScore } from '../../features/species/speciesHourlyScoring'
import { detectPhase } from '../../features/tide/tideUtils'
import { getSpeciesForRegion } from '../../data/species'
import { ScoreCardSkeleton, ConditionsGridSkeleton } from '../../features/common/SkeletonLoader'
import { scoreColor } from '../../features/score/scoringEngine'
import { Spacing } from '../../theme/spacing'
import { useSkyTheme } from '../../hooks/useSkyTheme'
import { Fonts, Radii, Type } from '../../theme/tokens'
import { useSpeciesAbundance } from '../../hooks/useSpeciesAbundance'
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_GAP } from '../../theme/tabBar'
import type { AbundanceTier } from '../../services/speciesOccurrenceService'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SpeciesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tabBarClearance = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + insets.bottom
  const tabBarScrollHandler = useTabBarScrollHandler()
  const { activeSpot } = useSpots()
  const { data: conditions, isLoading, refetch } = useConditions(activeSpot, localDateKey(new Date()))
  const isPro = useSettingsStore(s => s.isPro)
  const skyTheme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    conditions?.sky.icon,
    localDateKey(new Date()),
  )

  const now = new Date()
  const currentHour = now.getHours()

  const regionSpecies = useMemo(
    () => (activeSpot ? getSpeciesForRegion(activeSpot.lat, activeSpot.lng, activeSpot.type) : []),
    [activeSpot]
  )
  const { data: abundanceData } = useSpeciesAbundance(activeSpot, regionSpecies)

  const TIER_WEIGHT: Record<AbundanceTier, number> = { common: 3, occasional: 2, rare: 1, 'not-recorded': 0 }

  const scoredSpecies = useMemo(() => {
    if (!activeSpot || !conditions) return []
    const tidePhase = conditions.tide
      ? detectPhase(conditions.tide.hourlyCurve, currentHour)
      : 'slack'
    return regionSpecies
      .map(sp => scoreSpecies(sp, {
        month: now.getMonth() + 1,
        waterTemp: conditions.water.temp,
        tidePhase,
        currentHour,
      }))
      .sort((a, b) => {
        if (!isPro && a.species.tier === 'pro' && b.species.tier !== 'pro') return 1
        if (!isPro && b.species.tier === 'pro' && a.species.tier !== 'pro') return -1
        const aTier = TIER_WEIGHT[abundanceData?.[a.species.scientific_name] ?? 'not-recorded']
        const bTier = TIER_WEIGHT[abundanceData?.[b.species.scientific_name] ?? 'not-recorded']
        if (aTier !== bTier) return bTier - aTier
        return b.score - a.score
      })
  }, [activeSpot, conditions, currentHour, isPro, regionSpecies, abundanceData])

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

  const freeSpecies = scoredSpecies.filter(ss => ss.species.tier === 'free')
  const activeScoredSpecies = isPro ? scoredSpecies : freeSpecies
  const visibleSpecies = isPro ? scoredSpecies : freeSpecies.slice(0, 2)
  const lockedCount = isPro ? 0 : scoredSpecies.length - visibleSpecies.length

  const hasAbundanceData = abundanceData != null && Object.keys(abundanceData).length > 0
  const mainSpecies = hasAbundanceData
    ? visibleSpecies.filter(ss => (abundanceData![ss.species.scientific_name] ?? 'not-recorded') !== 'not-recorded')
    : visibleSpecies
  const alsoInRegion = hasAbundanceData
    ? visibleSpecies.filter(ss => (abundanceData![ss.species.scientific_name] ?? 'not-recorded') === 'not-recorded')
    : []

  if (!activeSpot) {
    return (
      <View style={[styles.empty, { backgroundColor: skyTheme.tintedDark.background }]}>
        <StatusBar style="light" />
        <Ionicons name="fish-outline" size={56} color={skyTheme.textTint} style={{ opacity: 0.55 }} />
        <Text style={[styles.emptyText, { color: skyTheme.textTint }]}>No spot selected</Text>
        <Text style={[styles.emptyHint, { color: skyTheme.textTint, opacity: 0.7 }]}>Add a fishing spot to see what's biting</Text>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { backgroundColor: skyTheme.tintedDark.background }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: skyTheme.tintedDark.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: skyTheme.textTint }]}>What's Biting</Text>
          {conditions && (
            <View style={[styles.scoreBadge, { borderColor: scoreColor(conditions.fishingScore) + '60', backgroundColor: scoreColor(conditions.fishingScore) + '18' }]}>
              <Text style={[styles.scoreBadgeText, { color: scoreColor(conditions.fishingScore) }]}>{conditions.fishingScore}</Text>
            </View>
          )}
        </View>
        <Text style={[Type.secondary, styles.subtitle, { color: skyTheme.textTint, opacity: 0.7 }]}>{activeSpot.name}</Text>
      </View>

      <Animated.ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.xl + tabBarClearance }]}
        refreshControl={<RefreshControl refreshing={isLoading && !!conditions} onRefresh={refetch} tintColor={skyTheme.accent} />}
        onScroll={tabBarScrollHandler}
        scrollEventThrottle={16}
      >
        {conditions ? (
          <>
            <ActiveRightNow
              scoredSpecies={activeScoredSpecies}
              hourlyByMap={scoredHourlyByMap}
              currentHour={currentHour}
              maxRows={2}
              theme={skyTheme}
              onPressSpecies={(id) => {
                const ss = scoredSpecies.find(s => s.species.id === id)
                if (!ss) return
                router.push({ pathname: '/species/[id]', params: { id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[id] ?? []) } })
              }}
            />

            <View style={styles.section}>
              <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.7 }]}>All species</Text>
              {scoredSpecies.length === 0 && (
                <Text style={[styles.emptySpecies, { color: skyTheme.textTint, opacity: 0.55 }]}>
                  No species data for this area yet — the fishing score above still applies.
                </Text>
              )}
              {mainSpecies.map(ss => (
                <SpeciesCard
                  key={ss.species.id}
                  speciesScore={ss}
                  hourly={scoredHourlyByMap[ss.species.id]}
                  isPro={isPro}
                  theme={skyTheme}
                  abundanceTier={abundanceData?.[ss.species.scientific_name]}
                  onPress={() => router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[ss.species.id] ?? []) } })
                  }
                />
              ))}
              {hasAbundanceData && (
                <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.55, marginTop: 4 }]}>
                  Ranked by species observed near your spot (public biodiversity records)
                </Text>
              )}
              {alsoInRegion.length > 0 && (
                <>
                  <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.7, marginTop: 12 }]}>Also in this region</Text>
                  {alsoInRegion.map(ss => (
                    <SpeciesCard
                      key={ss.species.id}
                      speciesScore={ss}
                      hourly={scoredHourlyByMap[ss.species.id]}
                      isPro={isPro}
                      theme={skyTheme}
                      abundanceTier={abundanceData?.[ss.species.scientific_name]}
                      onPress={() => router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[ss.species.id] ?? []) } })}
                    />
                  ))}
                </>
              )}
              {lockedCount > 0 && (
                <TouchableOpacity style={[styles.upgradeTeaser, { backgroundColor: skyTheme.tintedDark.card }]} onPress={() => router.push('/settings' as never)}>
                  <Ionicons name="lock-closed" size={14} color={skyTheme.accent} />
                  <Text style={[styles.upgradeTeaserText, { color: skyTheme.accent }]}>{lockedCount} more species unlocked with Pro</Text>
                  <Ionicons name="chevron-forward" size={14} color={skyTheme.accent} />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          !isLoading && (
            <View style={styles.empty}>
              <Text style={[styles.emptyHint, { color: skyTheme.textTint, opacity: 0.7 }]}>Pull to refresh</Text>
            </View>
          )
        )}
      </Animated.ScrollView>

      {isLoading && !conditions && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: skyTheme.tintedDark.background }]}>
          <ScoreCardSkeleton />
          <ConditionsGridSkeleton />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.screenPad,
    paddingBottom: Spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: Fonts.extraBold, fontSize: 24 },
  subtitle: { marginTop: 2 },
  scoreBadge: {
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  scoreBadgeText: { fontSize: 14, fontFamily: Fonts.bold },
  content: { paddingBottom: Spacing.xl },
  section: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  upgradeTeaser: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radii.card,
    padding: Spacing.md, marginTop: Spacing.xs,
  },
  upgradeTeaserText: { flex: 1, fontSize: 14, fontFamily: Fonts.bold },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontFamily: Fonts.bold, textAlign: 'center', marginTop: Spacing.sm },
  emptyHint: { fontSize: 14, textAlign: 'center' },
  emptySpecies: { fontSize: 13, paddingVertical: Spacing.sm },
})
