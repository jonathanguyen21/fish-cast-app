import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCatchLog } from '../../hooks/useCatchLog'
import { AuthModal } from '../../features/auth/AuthModal'
import { useSpots } from '../../hooks/useSpots'
import { scoreColor } from '../../features/score/scoringEngine'
import { SwipeableRow } from '../../features/common/SwipeableRow'
import type { CatchEntry } from '../../types/catchLog'
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

function CatchStats({ entries }: { entries: CatchEntry[] }) {
  const total = entries.length
  const withScore = entries.filter(e => e.fishingScore != null)
  const avgScore = withScore.length
    ? Math.round(withScore.reduce((s, e) => s + e.fishingScore!, 0) / withScore.length)
    : null
  const speciesCounts: Record<string, number> = {}
  entries.forEach(e => { speciesCounts[e.species] = (speciesCounts[e.species] ?? 0) + 1 })
  const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Ionicons name="fish-outline" size={18} color={Colors.accent} />
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statLabel}>Catches</Text>
      </View>
      {avgScore !== null && (
        <View style={styles.statItem}>
          <Ionicons name="speedometer-outline" size={18} color={Colors.accent} />
          <Text style={styles.statValue}>{avgScore}</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      )}
      {topSpecies && (
        <View style={[styles.statItem, { flex: 1 }]}>
          <Ionicons name="star-outline" size={18} color={Colors.accent} />
          <Text style={styles.statValue} numberOfLines={1}>{topSpecies}</Text>
          <Text style={styles.statLabel}>Top Species</Text>
        </View>
      )}
    </View>
  )
}

function CatchCard({ entry, onDelete }: { entry: CatchEntry; onDelete: () => void }) {
  return (
    <SwipeableRow onDelete={onDelete}>
      <View style={styles.catchCard}>
        <View style={styles.catchHeader}>
          <Text style={styles.catchSpecies}>{entry.species}</Text>
          <Text style={styles.catchSpotInline}>{entry.spotName}</Text>
        </View>
        <Text style={styles.catchMeta}>{formatDate(entry.date)} at {entry.time}</Text>
        <View style={styles.catchStats}>
          {entry.weight != null && (
            <View style={styles.catchStat}>
              <Text style={styles.catchStatValue}>
                {Math.floor(entry.weight)}<Text style={styles.catchStatUnit}> lbs </Text>
                {Math.round((entry.weight % 1) * 16)}<Text style={styles.catchStatUnit}> oz</Text>
              </Text>
            </View>
          )}
          {entry.length != null && (
            <View style={styles.catchStat}>
              <Text style={styles.catchStatValue}>{entry.length} <Text style={styles.catchStatUnit}>in</Text></Text>
            </View>
          )}
          {entry.fishingScore != null && (
            <View style={styles.catchStat}>
              <Text style={[styles.catchStatValue, { color: scoreColor(entry.fishingScore) }]}>{entry.fishingScore}</Text>
              <Text style={styles.catchStatUnit}> score</Text>
            </View>
          )}
        </View>
        {entry.note ? <Text style={styles.catchNote}>{entry.note}</Text> : null}
      </View>
    </SwipeableRow>
  )
}

interface FormState {
  species: string
  weightLbs: string
  weightOz: string
  length: string
  note: string
  score: string
}

export default function CatchLogScreen() {
  const insets = useSafeAreaInsets()
  const { entries, addEntry, deleteEntry, isSignedIn } = useCatchLog()
  const { activeSpot } = useSpots()
  const [showModal, setShowModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [form, setForm] = useState<FormState>({ species: '', weightLbs: '', weightOz: '', length: '', note: '', score: '' })
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

  function handleLogCatchPress() {
    if (!isSignedIn) {
      setShowAuthModal(true)
    } else {
      setShowModal(true)
    }
  }

  function handleAdd() {
    if (!form.species.trim()) {
      Alert.alert('Species required', 'Please enter what you caught.')
      return
    }
    const lbs = parseInt(form.weightLbs || '0', 10)
    const oz = parseInt(form.weightOz || '0', 10)
    const weight = (form.weightLbs || form.weightOz) ? lbs + oz / 16 : undefined
    const score = form.score ? parseInt(form.score, 10) : undefined
    if (score !== undefined && (score < 0 || score > 100)) {
      Alert.alert('Invalid score', 'Score must be between 0 and 100.')
      return
    }
    addEntry({
      date: today,
      time: nowTime,
      spotId: activeSpot?.id ?? 'unknown',
      spotName: activeSpot?.name ?? 'Unknown Spot',
      species: form.species.trim(),
      weight,
      length: form.length ? parseFloat(form.length) : undefined,
      note: form.note.trim() || undefined,
      fishingScore: score,
    })
    setForm({ species: '', weightLbs: '', weightOz: '', length: '', note: '', score: '' })
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
        <TouchableOpacity style={styles.addButton} onPress={handleLogCatchPress}>
          <Ionicons name="add" size={16} color={Colors.background} />
          <Text style={styles.addButtonText}>Log Catch</Text>
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
          <>
            {entries.length >= 3 && <CatchStats entries={entries} />}
            {grouped.map(([date, dayEntries]) => (
              <View key={date}>
                <Text style={styles.dayLabel}>{formatDate(date)}</Text>
                {dayEntries.map(e => (
                  <View key={e.id} style={styles.catchCardWrap}>
                    <CatchCard entry={e} onDelete={() => deleteEntry(e.id)} />
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => { setShowAuthModal(false); setShowModal(true) }}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowModal(false); setForm({ species: '', weightLbs: '', weightOz: '', length: '', note: '', score: '' }) }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log a Catch</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setForm({ species: '', weightLbs: '', weightOz: '', length: '', note: '', score: '' }) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
                <Text style={styles.modalClose}>Cancel</Text>
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
              <Ionicons name={showSpeciesPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
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

            <Text style={styles.fieldLabel}>Weight</Text>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <TextInput
                  style={styles.input}
                  placeholder="lbs"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  value={form.weightLbs}
                  onChangeText={v => setForm(f => ({ ...f, weightLbs: v.replace(/[^0-9]/g, '') }))}
                />
              </View>
              <View style={styles.halfField}>
                <TextInput
                  style={styles.input}
                  placeholder="oz (0–15)"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  value={form.weightOz}
                  onChangeText={v => {
                    const digits = v.replace(/[^0-9]/g, '')
                    const n = parseInt(digits || '0', 10)
                    setForm(f => ({ ...f, weightOz: n > 15 ? '15' : digits }))
                  }}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Length (in)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 18.5"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={form.length}
                  onChangeText={v => setForm(f => ({ ...f, length: v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1') }))}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Score (0–100)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 72"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  value={form.score}
                  onChangeText={v => setForm(f => ({ ...f, score: v.replace(/[^0-9]/g, '') }))}
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
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  addButtonText: { fontSize: 14, fontWeight: '700', color: Colors.background },
  content: { paddingHorizontal: Spacing.screenPad, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: Colors.textTertiary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  catchCardWrap: { marginBottom: Spacing.sm },
  catchCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
  },
  catchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  catchSpecies: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  catchSpotInline: { fontSize: 12, color: Colors.textTertiary },
  catchMeta: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8 },
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
  statsCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', gap: Spacing.md,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textTertiary },
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
