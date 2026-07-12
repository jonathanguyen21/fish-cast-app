import React, { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { SwipeableRow } from '../../features/common/SwipeableRow'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../../features/score/scoringEngine'
import { useSkyTheme } from '../../hooks/useSkyTheme'
import { Fonts, Radii, Accent, Type } from '../../theme/tokens'
import type { SkyTheme } from '../../theme/skyTheme'
import type { Spot } from '../../types/spot'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function SpotRow({ spot, isActive, onPress, onDelete, onEdit, theme }: {
  spot: Spot; isActive: boolean; onPress: () => void; onDelete: () => void; onEdit: () => void; theme: SkyTheme
}) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const { data } = useConditions(spot, todayStr)
  const score = data?.fishingScore ?? null
  const color = score !== null ? scoreColor(score) : theme.textTint

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: theme.tintedDark.card },
      ]}
      onPress={onPress}
      onLongPress={() => Alert.alert(spot.name, undefined, [
        { text: 'Rename', onPress: onEdit },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ])}
    >
      <View style={styles.rowInfo}>
        <View style={styles.rowNameRow}>
          <Text style={[styles.rowName, { color: theme.textTint }]}>{spot.name}</Text>
          {isActive && (
            <View style={[styles.activeBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '60' }]}>
              <Text style={[Type.chip, { color: theme.accent }]}>Active</Text>
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
      </View>
      <TouchableOpacity onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.editBtn}>
        <Ionicons name="pencil-outline" size={15} color={theme.textTint} style={{ opacity: 0.6 }} />
      </TouchableOpacity>
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
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { spots, activeSpot, activeSpotId, setActiveSpot, removeSpot, updateSpot } = useSpots()
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null)
  const [editName, setEditName] = useState('')
  const theme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    undefined,
    localDateKey(new Date()),
  )

  function openEdit(spot: Spot) {
    setEditingSpot(spot)
    setEditName(spot.name)
  }

  function saveEdit() {
    if (editingSpot && editName.trim()) {
      updateSpot(editingSpot.id, { name: editName.trim() })
    }
    setEditingSpot(null)
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.tintedDark.background }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.tintedDark.background }]}>
        <Text style={[styles.title, { color: theme.textTint }]}>Spots</Text>
        <Text style={[Type.secondary, styles.subtitle, { color: theme.textTint, opacity: 0.7 }]}>Tap a spot to make it active</Text>
      </View>
      <FlatList
        data={spots}
        keyExtractor={s => s.id}
        contentContainerStyle={spots.length === 0 ? styles.emptyContainer : [styles.list, { paddingBottom: Spacing.screenPad + tabBarHeight }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={56} color={theme.textTint} style={{ marginBottom: Spacing.sm, opacity: 0.55 }} />
            <Text style={[styles.emptyTitle, { color: theme.textTint }]}>No spots yet</Text>
            <Text style={[styles.emptyHint, { color: theme.textTint, opacity: 0.7 }]}>Save your favourite fishing locations to get personalised forecasts</Text>
            <TouchableOpacity style={[styles.emptyCta, styles.emptyCtaRow, { backgroundColor: Accent.warmDeep }]} onPress={() => router.push('/spot/new')}>
              <Text style={styles.emptyCtaText}>Add a Spot</Text>
              <Ionicons name="chevron-forward" size={14} color="#3A2A16" />
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <SwipeableRow onDelete={() => removeSpot(item.id)} borderRadius={Radii.card}>
            <SpotRow
              spot={item}
              isActive={item.id === activeSpotId}
              onPress={() => { setActiveSpot(item.id); router.push('/(tabs)/') }}
              onDelete={() => removeSpot(item.id)}
              onEdit={() => openEdit(item)}
              theme={theme}
            />
          </SwipeableRow>
        )}
      />
      <TouchableOpacity style={[styles.fab, { backgroundColor: Accent.warmDeep, bottom: 28 + tabBarHeight }]} onPress={() => router.push('/spot/new')}>
        <Ionicons name="add" size={28} color="#3A2A16" />
      </TouchableOpacity>

      <Modal visible={!!editingSpot} animationType="fade" transparent onRequestClose={() => setEditingSpot(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.renameCard, { backgroundColor: theme.tintedDark.card }]}>
            <Text style={[styles.renameTitle, { color: theme.textTint }]}>Rename Spot</Text>
            <TextInput
              style={[styles.renameInput, { backgroundColor: 'rgba(255,255,255,0.08)', color: theme.textTint }]}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              selectTextOnFocus
              placeholderTextColor={theme.textTint + '80'}
              returnKeyType="done"
              onSubmitEditing={saveEdit}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity style={[styles.renameCancel, { backgroundColor: 'rgba(255,255,255,0.08)' }]} onPress={() => setEditingSpot(null)}>
                <Text style={[styles.renameCancelText, { color: theme.textTint, opacity: 0.7 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.renameSave, { backgroundColor: Accent.warmDeep }]} onPress={saveEdit}>
                <Text style={styles.renameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.screenPad,
    paddingBottom: Spacing.sm,
  },
  title: { fontFamily: Fonts.extraBold, fontSize: 24 },
  subtitle: { marginTop: 2 },
  list: { padding: Spacing.screenPad, gap: Spacing.sm },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontSize: 22, fontFamily: Fonts.bold },
  emptyHint: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    marginTop: Spacing.sm,
    borderRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  emptyCtaText: { fontSize: 15, fontFamily: Fonts.bold, color: '#3A2A16' },
  emptyCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radii.card, padding: Spacing.md, overflow: 'hidden',
  },
  rowInfo: { flex: 1, paddingLeft: 6 },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowName: { fontSize: 16, fontFamily: Fonts.bold },
  activeBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  rowType: { fontSize: 12, fontWeight: '500' },
  scoreBadge: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.sm,
  },
  scoreText: { fontSize: 15, fontWeight: '700' },
  fab: {
    position: 'absolute', right: Spacing.screenPad, bottom: 28,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
    shadowColor: Accent.warmDeep, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  editBtn: { padding: 4, marginLeft: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: '#00000080',
    alignItems: 'center', justifyContent: 'center', padding: Spacing.lg,
  },
  renameCard: {
    borderRadius: Radii.card,
    padding: Spacing.lg, width: '100%',
  },
  renameTitle: { fontSize: 17, fontFamily: Fonts.bold, marginBottom: Spacing.md },
  renameInput: {
    borderRadius: 10, padding: Spacing.md,
    fontSize: 16,
  },
  renameActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  renameCancel: {
    flex: 1, padding: Spacing.md, borderRadius: 10,
    alignItems: 'center',
  },
  renameCancelText: { fontSize: 15, fontFamily: Fonts.bold },
  renameSave: {
    flex: 1, padding: Spacing.md, borderRadius: 10,
    alignItems: 'center',
  },
  renameSaveText: { fontSize: 15, fontFamily: Fonts.bold, color: '#3A2A16' },
})
