import React, { useMemo } from 'react'
import {
  ScrollView, View, Text, StyleSheet,
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

  const activeSpecies = scoredSpecies
    .filter(ss => isPro || ss.species.tier === 'free')
    .map(ss => ss.species)

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
        <Text style={styles.title}>What's Biting</Text>
        <Text style={styles.subtitle}>{activeSpot.name}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading && !!conditions} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        {conditions ? (
          <>
            <ActiveRightNow
              species={activeSpecies}
              hourlyByMap={scoredHourlyByMap}
              currentHour={currentHour}
              onPressSpecies={(id) => {
                const ss = scoredSpecies.find(s => s.species.id === id)
                if (!ss) return
                router.push({ pathname: '/species/[id]', params: { id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[id] ?? []) } })
              }}
            />

            <View style={styles.section}>
              <Text style={Typography.sectionTitle}>All Species</Text>
              {scoredSpecies.map(ss => (
                <SpeciesCard
                  key={ss.species.id}
                  speciesScore={ss}
                  hourly={scoredHourlyByMap[ss.species.id]}
                  isPro={isPro}
                  onPress={() => {
                    if (ss.species.tier === 'pro' && !isPro) return
                    router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[ss.species.id] ?? []) } })
                  }}
                />
              ))}
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
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  content: { paddingBottom: Spacing.xl },
  section: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginTop: Spacing.sm },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
})
