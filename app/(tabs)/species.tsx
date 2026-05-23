import React, { useMemo, useState } from 'react'
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { useSettingsStore } from '../../store/settingsStore'
import { SpeciesCard } from '../../features/species/SpeciesCard'
import { ActiveRightNow } from '../../features/species/ActiveRightNow'
import { scoreSpecies } from '../../features/species/speciesScoring'
import { scoreSpeciesHourly, type SpeciesHourlyScore } from '../../features/species/speciesHourlyScoring'
import { detectPhase } from '../../features/tide/tideUtils'
import { getSpeciesForRegion } from '../../data/species'
import { ScoreCardSkeleton, ConditionsGridSkeleton } from '../../features/common/SkeletonLoader'
import { scoreColor } from '../../features/score/scoringEngine'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function SpeciesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { activeSpot } = useSpots()
  const { data: conditions, isLoading, refetch } = useConditions(activeSpot, localDateKey(new Date()))
  const isPro = useSettingsStore(s => s.isPro)

  const now = new Date()
  const currentHour = now.getHours()

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

  const [filter, setFilter] = useState<'active' | 'peak' | 'all'>('active')

  const freeSpecies = scoredSpecies.filter(ss => ss.species.tier === 'free')
  const activeScoredSpecies = isPro ? scoredSpecies : freeSpecies
  const currentMonth = now.getMonth() + 1
  const filteredSpecies = useMemo(() => {
    const base = isPro ? scoredSpecies : freeSpecies
    if (filter === 'active') return base.filter(ss => ss.score > 0)
    if (filter === 'peak') return base.filter(ss => ss.species.months_peak.includes(currentMonth))
    return base
  }, [scoredSpecies, freeSpecies, filter, isPro, currentMonth])
  const visibleSpecies = isPro ? filteredSpecies : filteredSpecies.slice(0, filter === 'all' ? 2 : filteredSpecies.length)
  const lockedCount = isPro ? 0 : scoredSpecies.length - visibleSpecies.length
  const peakCount = scoredSpecies.filter(ss => ss.species.months_peak.includes(currentMonth)).length
  const activeCount = scoredSpecies.filter(ss => ss.score > 0).length

  if (!activeSpot) {
    return (
      <View style={styles.empty}>
        <Ionicons name="fish-outline" size={56} color={Colors.textTertiary} />
        <Text style={styles.emptyText}>No spot selected</Text>
        <Text style={styles.emptyHint}>Add a fishing spot to see what's biting</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>What's Biting</Text>
          {conditions && (
            <View style={[styles.scoreBadge, { borderColor: scoreColor(conditions.fishingScore) + '60', backgroundColor: scoreColor(conditions.fishingScore) + '18' }]}>
              <Text style={[styles.scoreBadgeText, { color: scoreColor(conditions.fishingScore) }]}>{conditions.fishingScore}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>{activeSpot.name}</Text>
        {conditions && (
          <View style={styles.seasonRow}>
            <Text style={styles.seasonText}>{activeCount} active now · {peakCount} in peak season</Text>
          </View>
        )}
        <View style={styles.filterRow}>
          {([['active', 'Active Now'], ['peak', 'Peak Season'], ['all', 'All']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterTab, filter === key && styles.filterTabActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterTabText, filter === key && styles.filterTabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading && !!conditions} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        {conditions ? (
          <>
            {filter === 'active' && (
              <ActiveRightNow
                scoredSpecies={activeScoredSpecies}
                hourlyByMap={scoredHourlyByMap}
                currentHour={currentHour}
                maxRows={2}
                onPressSpecies={(id) => {
                  const ss = scoredSpecies.find(s => s.species.id === id)
                  if (!ss) return
                  router.push({ pathname: '/species/[id]', params: { id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[id] ?? []) } })
                }}
              />
            )}

            <View style={styles.section}>
              <Text style={Typography.sectionTitle}>
                {filter === 'active' ? 'Active Species' : filter === 'peak' ? 'Peak Season' : 'All Species'}
              </Text>
              {visibleSpecies.length === 0 && (
                <View style={styles.emptyFilter}>
                  <Ionicons name="fish-outline" size={32} color={Colors.textTertiary} />
                  <Text style={styles.emptyFilterText}>
                    {filter === 'active' ? 'No species active right now' : 'No species in peak season this month'}
                  </Text>
                </View>
              )}
              {visibleSpecies.map(ss => (
                <SpeciesCard
                  key={ss.species.id}
                  speciesScore={ss}
                  hourly={scoredHourlyByMap[ss.species.id]}
                  isPro={isPro}
                  onPress={() => router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[ss.species.id] ?? []) } })
                  }
                />
              ))}
              {lockedCount > 0 && (
                <TouchableOpacity style={styles.upgradeTeaser} onPress={() => router.push('/settings' as never)}>
                  <Ionicons name="lock-closed" size={14} color={Colors.accent} />
                  <Text style={styles.upgradeTeaserText}>{lockedCount} more species unlocked with Pro</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          !isLoading && (
            <View style={styles.empty}>
              <Text style={styles.emptyHint}>Pull to refresh</Text>
            </View>
          )
        )}
      </ScrollView>

      {isLoading && !conditions && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.background }]}>
          <ScoreCardSkeleton />
          <ConditionsGridSkeleton />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.screenPad,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  scoreBadge: {
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  scoreBadgeText: { fontSize: 14, fontWeight: '700' },
  content: { paddingBottom: Spacing.xl },
  seasonRow: { marginTop: 4 },
  seasonText: { fontSize: 12, color: Colors.textTertiary },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.textTertiary + '40',
  },
  filterTabActive: { backgroundColor: Colors.accent + '20', borderColor: Colors.accent + '60' },
  filterTabText: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' },
  filterTabTextActive: { color: Colors.accent, fontWeight: '700' },
  emptyFilter: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyFilterText: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },
  section: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  upgradeTeaser: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent + '15', borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginTop: Spacing.xs,
  },
  upgradeTeaserText: { flex: 1, fontSize: 14, color: Colors.accent, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginTop: Spacing.sm },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
})
