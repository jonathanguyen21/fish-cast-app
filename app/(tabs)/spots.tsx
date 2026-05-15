import React from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../../features/score/scoringEngine'
import type { Spot } from '../../types/spot'

function SpotRow({ spot, isActive, onPress, onDelete }: {
  spot: Spot; isActive: boolean; onPress: () => void; onDelete: () => void
}) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data } = useConditions(spot, todayStr)
  const score = data?.fishingScore ?? null
  const color = score !== null ? scoreColor(score) : Colors.textTertiary

  return (
    <TouchableOpacity
      style={[styles.row, isActive && styles.activeRow]}
      onPress={onPress}
      onLongPress={() => Alert.alert('Delete Spot', `Remove "${spot.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ])}
    >
      {isActive && <View style={styles.activeIndicator} />}
      <View style={styles.rowInfo}>
        <View style={styles.rowNameRow}>
          <Text style={styles.rowName}>{spot.name}</Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowType}>{spot.type}</Text>
      </View>
      {score !== null && (
        <View style={[styles.scoreBadge, { borderColor: color, backgroundColor: color + '18' }]}>
          <Text style={[styles.scoreText, { color }]}>{score}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function SpotsScreen() {
  const router = useRouter()
  const { spots, activeSpotId, setActiveSpot, removeSpot } = useSpots()

  return (
    <View style={styles.screen}>
      <FlatList
        data={spots}
        keyExtractor={s => s.id}
        contentContainerStyle={spots.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No spots yet</Text>
            <Text style={styles.emptyHint}>Save your favourite fishing locations to get personalised forecasts</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/spot/new')}>
              <Text style={styles.emptyCtaText}>Add a Spot →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <SpotRow
            spot={item}
            isActive={item.id === activeSpotId}
            onPress={() => {
              setActiveSpot(item.id)
              router.push('/(tabs)/')
            }}
            onDelete={() => removeSpot(item.id)}
          />
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/spot/new')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.screenPad, gap: Spacing.sm },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyIcon: { fontSize: 52, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: Colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius, padding: Spacing.md, overflow: 'hidden',
  },
  activeRow: { borderWidth: 1.5, borderColor: Colors.accent },
  activeIndicator: {
    width: 3,
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
    marginRight: Spacing.sm,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  rowInfo: { flex: 1, paddingLeft: 6 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  activeBadge: {
    backgroundColor: Colors.accent + '22',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.accent + '60',
  },
  activeBadgeText: { fontSize: 11, color: Colors.accent, fontWeight: '700' },
  rowType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  scoreBadge: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm,
  },
  scoreText: { fontSize: 15, fontWeight: '700' },
  fab: {
    position: 'absolute', right: Spacing.screenPad, bottom: 28,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: Colors.accent, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  fabText: { fontSize: 28, color: Colors.background, lineHeight: 32 },
})
