import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { useSpotsStore } from '../../store/spotsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../../features/score/scoringEngine'
import type { Spot } from '../../types/spot'

function SpotRow({ spot, isActive, onPress, onDelete, onEditNotes }: {
  spot: Spot; isActive: boolean; onPress: () => void; onDelete: () => void; onEditNotes: () => void
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
        { text: 'Edit Notes', onPress: onEditNotes },
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
        <View style={styles.rowMeta}>
          <Ionicons
            name={spot.type === 'saltwater' ? 'water-outline' : 'leaf-outline'}
            size={11}
            color={spot.type === 'saltwater' ? Colors.ocean : Colors.success}
          />
          <Text style={[styles.rowType, { color: spot.type === 'saltwater' ? Colors.ocean : Colors.success }]}>
            {spot.type === 'saltwater' ? 'Saltwater' : 'Freshwater'}
          </Text>
        </View>
        {spot.notes ? (
          <Text style={styles.spotNote} numberOfLines={1}>{spot.notes}</Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <TouchableOpacity onPress={onEditNotes} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="create-outline" size={15} color={Colors.textTertiary} />
        </TouchableOpacity>
        {score !== null && (
          <View style={[styles.scoreBadge, { borderColor: color, backgroundColor: color + '18' }]}>
            <Text style={[styles.scoreText, { color }]}>{score}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function SpotsScreen() {
  const router = useRouter()
  const { spots, activeSpotId, setActiveSpot, removeSpot } = useSpots()
  const updateSpotNotes = useSpotsStore(s => s.updateSpotNotes)
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  function openNotesModal(spot: Spot) {
    setEditingSpot(spot)
    setNotesDraft(spot.notes ?? '')
  }

  function saveNotes() {
    if (editingSpot) {
      updateSpotNotes(editingSpot.id, notesDraft.trim())
    }
    setEditingSpot(null)
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={spots}
        keyExtractor={s => s.id}
        contentContainerStyle={spots.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={56} color={Colors.textTertiary} style={{ marginBottom: Spacing.sm }} />
            <Text style={styles.emptyTitle}>No spots yet</Text>
            <Text style={styles.emptyHint}>Save your favourite fishing locations to get personalised forecasts</Text>
            <TouchableOpacity style={[styles.emptyCta, styles.emptyCtaRow]} onPress={() => router.push('/spot/new')}>
              <Text style={styles.emptyCtaText}>Add a Spot</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.background} />
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
            onEditNotes={() => openNotesModal(item)}
          />
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/spot/new')}>
        <Ionicons name="add" size={28} color={Colors.background} />
      </TouchableOpacity>

      <Modal
        visible={editingSpot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingSpot(null)}
      >
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Spot Notes</Text>
            <Text style={styles.modalSpotName}>{editingSpot?.name}</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about this spot — best bait, depth, access tips..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={6}
            value={notesDraft}
            onChangeText={setNotesDraft}
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingSpot(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveNotes}>
              <Text style={styles.saveBtnText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.screenPad, gap: Spacing.sm },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
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
  emptyCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  rowType: { fontSize: 11, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spotNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 3, fontStyle: 'italic' },
  scoreBadge: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreText: { fontSize: 15, fontWeight: '700' },
  modalContainer: {
    flex: 1, backgroundColor: Colors.background, padding: Spacing.screenPad,
  },
  modalHeader: { marginBottom: Spacing.lg },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalSpotName: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  notesInput: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
    textAlignVertical: 'top', minHeight: 140,
  },
  modalActions: {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Spacing.cardRadius,
    backgroundColor: Colors.card, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Spacing.cardRadius,
    backgroundColor: Colors.accent, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: Colors.background },
  fab: {
    position: 'absolute', right: Spacing.screenPad, bottom: 28,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: Colors.accent, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
})
