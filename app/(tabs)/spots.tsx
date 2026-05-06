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
  const { data } = useConditions(spot)
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
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{spot.name}</Text>
        <Text style={styles.rowType}>{spot.type}</Text>
      </View>
      {score !== null && (
        <View style={[styles.scoreBadge, { borderColor: color }]}>
          <Text style={[styles.scoreText, { color }]}>{score}</Text>
        </View>
      )}
      {isActive && <Text style={styles.activeLabel}>Active</Text>}
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
            <Text style={styles.emptyTitle}>No spots yet</Text>
            <Text style={styles.emptyHint}>Tap + to add your first fishing spot</Text>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius, padding: Spacing.md,
  },
  activeRow: { borderWidth: 1.5, borderColor: Colors.accent },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  rowType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scoreBadge: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  scoreText: { fontSize: 15, fontWeight: '700' },
  activeLabel: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  fab: {
    position: 'absolute', right: Spacing.screenPad, bottom: 28,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  fabText: { fontSize: 28, color: Colors.background, lineHeight: 32 },
})
