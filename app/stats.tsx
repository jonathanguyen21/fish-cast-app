import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import { useCatchLogStore } from '../store/catchLogStore'
import { scoreColor } from '../features/score/scoringEngine'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function StatCard({ icon, label, value, sub }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={Colors.accent} style={{ marginBottom: 6 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  )
}

export default function StatsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const entries = useCatchLogStore(s => s.entries)

  const stats = useMemo(() => {
    if (entries.length === 0) return null

    const totalCatches = entries.length
    const uniqueSpots = new Set(entries.map(e => e.spotId)).size
    const uniqueSpecies = new Set(entries.map(e => e.species)).size

    const withWeight = entries.filter(e => e.weight != null)
    const totalWeight = withWeight.reduce((s, e) => s + e.weight!, 0)
    const heaviest = withWeight.reduce<{ weight: number; species: string } | null>((best, e) =>
      !best || e.weight! > best.weight ? { weight: e.weight!, species: e.species } : best, null)

    const withScore = entries.filter(e => e.fishingScore != null)
    const avgScore = withScore.length
      ? Math.round(withScore.reduce((s, e) => s + e.fishingScore!, 0) / withScore.length)
      : null
    const highestScore = withScore.length
      ? Math.max(...withScore.map(e => e.fishingScore!))
      : null

    // Species counts
    const speciesCounts: Record<string, number> = {}
    entries.forEach(e => { speciesCounts[e.species] = (speciesCounts[e.species] ?? 0) + 1 })
    const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Monthly catch counts
    const monthlyCounts = new Array(12).fill(0)
    entries.forEach(e => {
      const month = parseInt(e.date.slice(5, 7)) - 1
      if (month >= 0 && month < 12) monthlyCounts[month]++
    })
    const bestMonth = monthlyCounts.indexOf(Math.max(...monthlyCounts))

    // Spot counts
    const spotCounts: Record<string, { name: string; count: number }> = {}
    entries.forEach(e => {
      if (!spotCounts[e.spotId]) spotCounts[e.spotId] = { name: e.spotName, count: 0 }
      spotCounts[e.spotId].count++
    })
    const topSpot = Object.values(spotCounts).sort((a, b) => b.count - a.count)[0]

    // Win rate (score >= 70)
    const winRate = withScore.length
      ? Math.round(withScore.filter(e => e.fishingScore! >= 70).length / withScore.length * 100)
      : null

    return {
      totalCatches, uniqueSpots, uniqueSpecies,
      totalWeight: Math.round(totalWeight * 10) / 10,
      heaviest, avgScore, highestScore,
      topSpecies, monthlyCounts, bestMonth,
      topSpot, winRate,
    }
  }, [entries])

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Fishing Stats</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {!stats || entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>No data yet</Text>
          <Text style={styles.emptyHint}>Log some catches to see your fishing statistics</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.gridRow}>
            <StatCard icon="fish-outline" label="Total Catches" value={String(stats.totalCatches)} />
            <StatCard icon="map-outline" label="Spots Fished" value={String(stats.uniqueSpots)} />
            <StatCard icon="leaf-outline" label="Species" value={String(stats.uniqueSpecies)} />
          </View>

          {(stats.totalWeight > 0 || stats.avgScore != null) && (
            <View style={styles.gridRow}>
              {stats.totalWeight > 0 && (
                <StatCard icon="scale-outline" label="Total Weight" value={`${stats.totalWeight} lbs`}
                  sub={stats.heaviest ? `Best: ${stats.heaviest.weight}lb ${stats.heaviest.species}` : undefined} />
              )}
              {stats.avgScore != null && (
                <StatCard icon="speedometer-outline" label="Avg Score" value={String(stats.avgScore)}
                  sub={stats.winRate != null ? `${stats.winRate}% great days` : undefined} />
              )}
              {stats.highestScore != null && (
                <StatCard icon="trophy-outline" label="Best Score" value={String(stats.highestScore)} />
              )}
            </View>
          )}

          {stats.topSpot && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Favorite Spot</Text>
              <Text style={styles.cardValue}>{stats.topSpot.name}</Text>
              <Text style={styles.cardSub}>{stats.topSpot.count} {stats.topSpot.count === 1 ? 'catch' : 'catches'}</Text>
            </View>
          )}

          {stats.topSpecies.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Species</Text>
              {stats.topSpecies.map(([sp, count], i) => (
                <View key={sp} style={[styles.speciesRow, i > 0 && styles.speciesRowBorder]}>
                  <Text style={styles.speciesRank}>#{i + 1}</Text>
                  <Text style={styles.speciesName}>{sp}</Text>
                  <Text style={styles.speciesCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Catches by Month</Text>
            {(() => {
              const max = Math.max(...stats.monthlyCounts, 1)
              const barW = 22, gap = 3
              const svgW = (barW + gap) * 12
              const svgH = 60
              return (
                <Svg width={svgW} height={svgH + 18} style={{ marginTop: 8 }}>
                  {stats.monthlyCounts.map((count, i) => {
                    const fillH = Math.max(2, (count / max) * svgH)
                    const x = i * (barW + gap)
                    const y = svgH - fillH
                    const isBest = i === stats.bestMonth && count > 0
                    return (
                      <React.Fragment key={i}>
                        <Rect x={x} y={y} width={barW} height={fillH} rx={3}
                          fill={isBest ? Colors.success : Colors.accent} opacity={isBest ? 1 : 0.6} />
                        <SvgText x={x + barW / 2} y={svgH + 14} textAnchor="middle"
                          fontSize={8} fill={isBest ? Colors.success : Colors.textTertiary} fontWeight={isBest ? '700' : '400'}>
                          {MONTHS[i]}
                        </SvgText>
                        {count > 0 && (
                          <SvgText x={x + barW / 2} y={y - 2} textAnchor="middle"
                            fontSize={8} fill={Colors.textSecondary}>
                            {count}
                          </SvgText>
                        )}
                      </React.Fragment>
                    )
                  })}
                </Svg>
              )
            })()}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: Spacing.screenPad, paddingBottom: 60, gap: Spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  gridRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, textAlign: 'center' },
  statSub: { fontSize: 10, color: Colors.textSecondary, marginTop: 3, textAlign: 'center' },
  card: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  speciesRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  speciesRowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface },
  speciesRank: { width: 28, fontSize: 12, color: Colors.textTertiary, fontWeight: '600' },
  speciesName: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  speciesCount: { fontSize: 14, fontWeight: '700', color: Colors.accent },
})
