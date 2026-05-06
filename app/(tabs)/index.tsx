import React from 'react'
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
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

export default function DashboardScreen() {
  const router = useRouter()
  const { activeSpot, spots } = useSpots()
  const { data: conditions, isLoading, refetch } = useConditions(activeSpot)
  const { data: forecast } = useForecast(activeSpot)
  const isPro = useSettingsStore(s => s.isPro)

  if (!activeSpot || !conditions) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spot selected</Text>
        <Text style={styles.emptyHint}>Go to Spots tab to add your first fishing spot</Text>
      </View>
    )
  }

  const currentHour = new Date().getHours()
  const tidePhase = conditions.tide
    ? detectPhase(conditions.tide.hourlyCurve, currentHour)
    : 'slack'

  const allSpecies = getSpeciesForRegion(activeSpot.lat, activeSpot.lng)
  const scoredSpecies = allSpecies
    .map(sp => scoreSpecies(sp, {
      month: new Date().getMonth() + 1,
      waterTemp: conditions.water.temp,
      tidePhase,
      currentHour,
    }))
    .sort((a, b) => {
      // Pro species sorted together at bottom if locked
      if (!isPro && a.species.tier === 'pro' && b.species.tier !== 'pro') return 1
      if (!isPro && b.species.tier === 'pro' && a.species.tier !== 'pro') return -1
      return b.score - a.score
    })

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.spotName}>{activeSpot.name}</Text>
        {spots.length > 1 && (
          <Text style={styles.switchHint} onPress={() => router.push('/spots')}>Switch ›</Text>
        )}
      </View>

      <ScoreDisplay
        score={conditions.fishingScore}
        label={conditions.scoreLabel}
        bestWindow={conditions.bestWindow}
      />

      <ScoreTimeline hourlyScores={conditions.hourlyScores} />

      {/* Quick stats row */}
      <View style={styles.quickStats}>
        <WindDisplay wind={conditions.wind} />
        {conditions.tide && (
          <View style={styles.quickCard}>
            <Text style={styles.quickLabel}>Tide</Text>
            <Text style={styles.quickValue}>{conditions.tide.current.height} ft</Text>
            <Text style={styles.quickSub}>{conditions.tide.current.rising ? '▲ Rising' : '▼ Falling'}</Text>
          </View>
        )}
        <View style={styles.quickCard}>
          <Text style={styles.quickLabel}>Water</Text>
          <Text style={styles.quickValue}>{conditions.water.temp}°</Text>
          <Text style={styles.quickSub}>{conditions.water.unit}</Text>
        </View>
      </View>

      {conditions.tide && (
        <TideChart tide={conditions.tide} currentHour={currentHour} />
      )}

      <ConditionsGrid conditions={conditions} />

      {/* What's Biting */}
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

      <ForecastStrip
        forecast={forecast}
        isPro={isPro}
        onUpgrade={() => router.push('/settings')}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl },
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
  section: {
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
})
