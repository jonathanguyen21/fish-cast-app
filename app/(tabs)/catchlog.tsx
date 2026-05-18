import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCatchLogStore, type CatchEntry } from '../../store/catchLogStore'
import { useSpots } from '../../hooks/useSpots'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

const COMMON_SPECIES = [
  'Bass', 'Striped Bass', 'Rockfish', 'Halibut', 'Salmon',
  'Trout', 'Redfish', 'Snook', 'Flounder', 'Bluegill',
  'Catfish', 'Crappie', 'Walleye', 'Pike', 'Perch',
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CatchCard({ entry, onDelete }: { entry: CatchEntry; onDelete: () => void }) {
  return (
    <View style={styles.catchCard}>
      <View style={styles.catchHeader}>
        <Text style={styles.catchSpecies}>{entry.species}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Delete', 'Remove this catch?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ])}>
          <Text style={styles.deleteBtn}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.catchSpot}>{entry.spotName} · {formatDate(entry.date)} at {entry.time}</Text>
      <View style={styles.catchStats}>
        {entry.weight != null && (
          <View style={styles.catchStat}>
            <Text style={styles.catchStatValue}>{entry.weight} <Text style={styles.catchStatUnit}>lbs</Text></Text>
          </View>
        )}
        {entry.length != null && (
          <View style={styles.catchStat}>
            <Text style={styles.catchStatValue}>{entry.length} <Text style={styles.catchStatUnit}>in</Text></Text>
          </View>
        )}
        {entry.fishingScore != null && (
          <View style={styles.catchStat}>
            <Text style={[styles.catchStatValue, { color: Colors.accent }]}>{entry.fishingScore}</Text>
            <Text style={styles.catchStatUnit}> score</Text>
          </View>
        )}
      </View>
      {entry.note ? <Text style={styles.catchNote}>{entry.note}</Text> : null}
    </View>
  )
}

interface FormState {
  species: string
  weight: string
  length: string
  note: string
}

export default function CatchLogScreen() {
  const insets = useSafeAreaInsets()
  const { entries, addEntry, deleteEntry } = useCatchLogStore()
  const { activeSpot } = useSpots()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>({ species: '', weight: '', length: '', note: '' })
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false)

  const today = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const nowTime = useMemo(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }, [showModal])

  function handleAdd() {
    if (!form.species.trim()) {
      Alert.alert('Species required', 'Please enter what you caught.')
      return
    }
    addEntry({
      date: today,
      time: nowTime,
      spotId: activeSpot?.id ?? 'unknown',
      spotName: activeSpot?.name ?? 'Unknown Spot',
      species: form.species.trim(),
      weight: form.weight ? parseFloat(form.weight) : undefined,
      length: form.length ? parseFloat(form.length) : undefined,
      note: form.note.trim() || undefined,
    })
    setForm({ species: '', weight: '', length: '', note: '' })
    setShowModal(false)
  }

  const grouped = useMemo(() => {
    const map: Record<string, CatchEntry[]> = {}
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Catch Log</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>+ Log Catch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="fish-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No catches logged yet</Text>
            <Text style={styles.emptyHint}>Tap "Log Catch" after a successful trip to track your catches over time.</Text>
          </View>
        ) : (
          grouped.map(([date, dayEntries]) => (
            <View key={date}>
              <Text style={styles.dayLabel}>{formatDate(date)}</Text>
              {dayEntries.map(e => (
                <CatchCard key={e.id} entry={e} onDelete={() => deleteEntry(e.id)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log a Catch</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕ Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Species *</Text>
            <TouchableOpacity
              style={styles.speciesInput}
              onPress={() => setShowSpeciesPicker(v => !v)}
            >
              <Text style={form.species ? styles.speciesValue : styles.speciesPlaceholder}>
                {form.species || 'What did you catch?'}
              </Text>
              <Text style={styles.speciesArrow}>{showSpeciesPicker ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {showSpeciesPicker && (
              <View style={styles.speciesList}>
                {COMMON_SPECIES.map(sp => (
                  <TouchableOpacity key={sp} style={styles.speciesOption} onPress={() => {
                    setForm(f => ({ ...f, species: sp }))
                    setShowSpeciesPicker(false)
                  }}>
                    <Text style={[styles.speciesOptionText, form.species === sp && { color: Colors.accent }]}>{sp}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={styles.speciesCustomInput}
                  placeholder="Or type a custom species..."
                  placeholderTextColor={Colors.textTertiary}
                  value={COMMON_SPECIES.includes(form.species) ? '' : form.species}
                  onChangeText={v => setForm(f => ({ ...f, species: v }))}
                  onSubmitEditing={() => setShowSpeciesPicker(false)}
                />
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Weight (lbs)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 4.5"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={form.weight}
                  onChangeText={v => setForm(f => ({ ...f, weight: v }))}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Length (in)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 18"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={form.length}
                  onChangeText={v => setForm(f => ({ ...f, length: v }))}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Bait used, depth, spot details..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              value={form.note}
              onChangeText={v => setForm(f => ({ ...f, note: v }))}
            />

            <View style={styles.spotRow}>
              <Text style={styles.spotLabel}>Spot: </Text>
              <Text style={styles.spotValue}>{activeSpot?.name ?? 'No active spot'}</Text>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
              <Text style={styles.submitButtonText}>Save Catch</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingVertical: Spacing.md,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  addButton: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  addButtonText: { fontSize: 14, fontWeight: '700', color: Colors.background },
  content: { paddingHorizontal: Spacing.screenPad, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyIconPlaceholder: {},
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: Colors.textTertiary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  catchCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  catchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catchSpecies: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  deleteBtn: { fontSize: 14, color: Colors.textTertiary, padding: 4 },
  catchSpot: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8 },
  catchStats: { flexDirection: 'row', gap: Spacing.md, marginBottom: 4 },
  catchStat: { flexDirection: 'row', alignItems: 'baseline' },
  catchStatValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  catchStatUnit: { fontSize: 11, color: Colors.textSecondary },
  catchNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalContent: { padding: Spacing.screenPad, paddingBottom: 60 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalClose: { fontSize: 14, color: Colors.accent },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card, borderRadius: 10, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 15,
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  speciesInput: {
    backgroundColor: Colors.card, borderRadius: 10, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  speciesValue: { fontSize: 15, color: Colors.textPrimary },
  speciesPlaceholder: { fontSize: 15, color: Colors.textTertiary },
  speciesArrow: { color: Colors.textTertiary, fontSize: 12 },
  speciesList: {
    backgroundColor: Colors.card, borderRadius: 10, marginTop: 4,
    overflow: 'hidden',
  },
  speciesOption: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surface },
  speciesOptionText: { fontSize: 15, color: Colors.textPrimary },
  speciesCustomInput: {
    padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
    borderTopWidth: 1, borderTopColor: Colors.surface,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfField: { flex: 1 },
  spotRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.lg, padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 10,
  },
  spotLabel: { fontSize: 13, color: Colors.textTertiary },
  spotValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  submitButton: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
