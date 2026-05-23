import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform, Share,
} from 'react-native'
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useCatchLogStore, type CatchEntry } from '../../store/catchLogStore'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { scoreColor } from '../../features/score/scoringEngine'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

const COMMON_SPECIES = [
  'Bass', 'Striped Bass', 'Rockfish', 'Halibut', 'Salmon',
  'Trout', 'Redfish', 'Snook', 'Flounder', 'Bluegill',
  'Catfish', 'Crappie', 'Walleye', 'Pike', 'Perch',
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const HEATMAP_WEEKS = 8
const CELL = 14
const CELL_GAP = 2

function CatchHeatmap({ entries }: { entries: CatchEntry[] }) {
  const countsByDay = useMemo(() => {
    const map: Record<string, number> = {}
    entries.forEach(e => { map[e.date] = (map[e.date] ?? 0) + 1 })
    return map
  }, [entries])

  if (Object.keys(countsByDay).length === 0) return null

  const today = new Date()
  const todayKey = localDateKey(today)
  const cellTotal = HEATMAP_WEEKS * 7

  const days: { key: string; count: number; isToday: boolean }[] = []
  for (let i = cellTotal - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = localDateKey(d)
    days.push({ key, count: countsByDay[key] ?? 0, isToday: key === todayKey })
  }

  const maxCount = Math.max(...days.map(d => d.count), 1)
  const totalCatches = days.reduce((s, d) => s + d.count, 0)
  const activeDays = days.filter(d => d.count > 0).length

  return (
    <View style={styles.heatmapCard}>
      <View style={styles.bestsHeader}>
        <Ionicons name="calendar-outline" size={14} color={Colors.accent} />
        <Text style={styles.bestsTitle}>Activity — Last {HEATMAP_WEEKS} Weeks</Text>
        <Text style={styles.heatmapMeta}>{totalCatches} catches · {activeDays} days</Text>
      </View>
      <View style={styles.heatmapGrid}>
        {days.map((day, i) => {
          const intensity = day.count === 0 ? 0 : Math.max(0.2, day.count / maxCount)
          const bg = day.count === 0
            ? Colors.card
            : Colors.accent + Math.round(intensity * 220).toString(16).padStart(2, '0')
          return (
            <View
              key={`${day.key}-${i}`}
              style={[
                styles.heatCell,
                { backgroundColor: bg },
                day.isToday && { borderWidth: 1, borderColor: Colors.accent },
              ]}
            />
          )
        })}
      </View>
    </View>
  )
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

function PersonalBests({ entries }: { entries: CatchEntry[] }) {
  const withWeight = entries.filter(e => e.weight != null)
  const withLength = entries.filter(e => e.length != null)
  if (withWeight.length === 0 && withLength.length === 0) return null

  const heaviest = withWeight.reduce<CatchEntry | null>((best, e) =>
    (!best || e.weight! > best.weight!) ? e : best, null)
  const longest = withLength.reduce<CatchEntry | null>((best, e) =>
    (!best || e.length! > best.length!) ? e : best, null)

  return (
    <View style={styles.bestsCard}>
      <View style={styles.bestsHeader}>
        <Ionicons name="trophy-outline" size={14} color={Colors.warning} />
        <Text style={styles.bestsTitle}>Personal Bests</Text>
      </View>
      <View style={styles.bestsRow}>
        {heaviest && (
          <View style={styles.bestItem}>
            <Text style={styles.bestValue}>{heaviest.weight} <Text style={styles.bestUnit}>lbs</Text></Text>
            <Text style={styles.bestLabel} numberOfLines={1}>{heaviest.species}</Text>
          </View>
        )}
        {longest && longest.id !== heaviest?.id && (
          <View style={[styles.bestItem, { borderLeftWidth: heaviest ? 1 : 0, borderLeftColor: Colors.surface }]}>
            <Text style={styles.bestValue}>{longest.length} <Text style={styles.bestUnit}>in</Text></Text>
            <Text style={styles.bestLabel} numberOfLines={1}>{longest.species}</Text>
          </View>
        )}
        {longest && longest.id === heaviest?.id && longest.length != null && (
          <View style={[styles.bestItem, { borderLeftWidth: 1, borderLeftColor: Colors.surface }]}>
            <Text style={styles.bestValue}>{longest.length} <Text style={styles.bestUnit}>in</Text></Text>
            <Text style={styles.bestLabel} numberOfLines={1}>Same catch</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const SCORE_BUCKETS = [
  { label: '0–39', min: 0, max: 39 },
  { label: '40–54', min: 40, max: 54 },
  { label: '55–69', min: 55, max: 69 },
  { label: '70–84', min: 70, max: 84 },
  { label: '85+', min: 85, max: 100 },
]

function ScoreCorrelation({ entries }: { entries: CatchEntry[] }) {
  const withScore = entries.filter(e => e.fishingScore != null)
  if (withScore.length < 3) return null

  const bucketCounts = SCORE_BUCKETS.map(b =>
    withScore.filter(e => e.fishingScore! >= b.min && e.fishingScore! <= b.max).length
  )
  const maxCount = Math.max(...bucketCounts, 1)
  const barW = 40, barGap = 6, svgH = 64, labelH = 16

  return (
    <View style={styles.correlationCard}>
      <View style={styles.bestsHeader}>
        <Ionicons name="bar-chart-outline" size={14} color={Colors.accent} />
        <Text style={styles.bestsTitle}>Catches by Score Range</Text>
      </View>
      <Svg width={(barW + barGap) * SCORE_BUCKETS.length} height={svgH + labelH}>
        {SCORE_BUCKETS.map((b, i) => {
          const count = bucketCounts[i]
          const fillH = Math.max(4, (count / maxCount) * svgH)
          const y = svgH - fillH
          const x = i * (barW + barGap)
          const fillColor = b.min >= 70 ? Colors.success : b.min >= 55 ? Colors.accent : b.min >= 40 ? Colors.warning : Colors.textTertiary
          return (
            <React.Fragment key={b.label}>
              <Rect x={x} y={y} width={barW} height={fillH} rx={4} fill={fillColor} opacity={0.8} />
              {count > 0 && (
                <SvgText x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={10} fill={fillColor} fontWeight="700">
                  {count}
                </SvgText>
              )}
              <SvgText x={x + barW / 2} y={svgH + labelH - 2} textAnchor="middle" fontSize={8} fill={Colors.textTertiary}>
                {b.label}
              </SvgText>
            </React.Fragment>
          )
        })}
        <Line x1={0} y1={svgH} x2={(barW + barGap) * SCORE_BUCKETS.length} y2={svgH} stroke={Colors.surface} strokeWidth={1} />
      </Svg>
    </View>
  )
}

function CatchCard({ entry, onDelete, onEdit }: { entry: CatchEntry; onDelete: () => void; onEdit: () => void }) {
  return (
    <View style={styles.catchCard}>
      <View style={styles.catchHeader}>
        <Text style={styles.catchSpecies}>{entry.species}</Text>
        <View style={styles.catchActions}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={15} color={Colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Delete', 'Remove this catch?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={15} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
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
            <Text style={[styles.catchStatValue, { color: scoreColor(entry.fishingScore) }]}>{entry.fishingScore}</Text>
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
  score: string
}

export default function CatchLogScreen() {
  const insets = useSafeAreaInsets()
  const { entries, addEntry, updateEntry, deleteEntry, clearAll } = useCatchLogStore()
  const { activeSpot } = useSpots()
  const router = useRouter()
  const todayStr = useMemo(() => localDateKey(new Date()), [])
  const { data: conditions } = useConditions(activeSpot, todayStr)
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState<CatchEntry | null>(null)
  const [form, setForm] = useState<FormState>({ species: '', weight: '', length: '', note: '', score: '' })
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false)
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null)

  const today = useMemo(() => localDateKey(new Date()), [])

  const nowTime = useMemo(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }, [showModal])

  const uniqueSpecies = useMemo(() => {
    const counts: Record<string, number> = {}
    entries.forEach(e => { counts[e.species] = (counts[e.species] ?? 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([s]) => s)
  }, [entries])

  const filteredEntries = useMemo(() =>
    speciesFilter ? entries.filter(e => e.species === speciesFilter) : entries,
    [entries, speciesFilter]
  )

  const grouped = useMemo(() => {
    const map: Record<string, CatchEntry[]> = {}
    for (const e of filteredEntries) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredEntries])

  const streak = useMemo(() => {
    if (grouped.length === 0) return 0
    const dateSet = new Set(grouped.map(([d]) => d))
    let count = 0
    const cursor = new Date()
    while (true) {
      const key = localDateKey(cursor)
      if (!dateSet.has(key)) break
      count++
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [grouped])

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
      fishingScore: form.score ? parseInt(form.score, 10) : undefined,
    })
    setForm({ species: '', weight: '', length: '', note: '', score: '' })
    setShowModal(false)
  }

  function handleOpenEdit(entry: CatchEntry) {
    setEditEntry(entry)
    setForm({
      species: entry.species,
      weight: entry.weight != null ? String(entry.weight) : '',
      length: entry.length != null ? String(entry.length) : '',
      note: entry.note ?? '',
      score: entry.fishingScore != null ? String(entry.fishingScore) : '',
    })
    setShowSpeciesPicker(false)
    setShowModal(true)
  }

  function handleSaveEdit() {
    if (!editEntry) return
    if (!form.species.trim()) {
      Alert.alert('Species required', 'Please enter what you caught.')
      return
    }
    updateEntry(editEntry.id, {
      species: form.species.trim(),
      weight: form.weight ? parseFloat(form.weight) : undefined,
      length: form.length ? parseFloat(form.length) : undefined,
      note: form.note.trim() || undefined,
      fishingScore: form.score ? parseInt(form.score, 10) : undefined,
    })
    setEditEntry(null)
    setForm({ species: '', weight: '', length: '', note: '', score: '' })
    setShowModal(false)
  }

  function handleCloseModal() {
    setShowModal(false)
    setEditEntry(null)
    setForm({ species: '', weight: '', length: '', note: '', score: '' })
  }

  async function handleShareLog() {
    const speciesCounts: Record<string, number> = {}
    entries.forEach(e => { speciesCounts[e.species] = (speciesCounts[e.species] ?? 0) + 1 })
    const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const withScore = entries.filter(e => e.fishingScore != null)
    const avgScore = withScore.length
      ? Math.round(withScore.reduce((s, e) => s + e.fishingScore!, 0) / withScore.length)
      : null
    const best = entries.reduce<CatchEntry | null>((acc, e) => {
      if (e.weight == null) return acc
      if (!acc || (acc.weight ?? 0) < e.weight) return e
      return acc
    }, null)

    const lines = [
      '🎣 My FishCast Catch Log',
      `${entries.length} catches logged`,
      avgScore != null ? `Avg fishing score: ${avgScore}/100` : null,
      best?.weight != null ? `Personal best: ${best.weight} lb ${best.species}` : null,
      streak >= 2 ? `${streak}-day fishing streak 🔥` : null,
      '',
      'Top species:',
      ...topSpecies.map(([sp, n]) => `  ${sp}: ${n} ${n === 1 ? 'catch' : 'catches'}`),
    ].filter(Boolean).join('\n')

    await Share.share({ message: lines })
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Catch Log</Text>
          {streak >= 2 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak}-day streak</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {entries.length > 0 && (
            <TouchableOpacity style={styles.shareBtn} onPress={() => router.push('/stats' as any)}>
              <Ionicons name="bar-chart-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          {entries.length > 0 && (
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareLog}>
              <Ionicons name="share-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          {entries.length > 0 && (
            <TouchableOpacity style={styles.shareBtn} onPress={() => Alert.alert(
              'Clear All Catches',
              `This will permanently delete all ${entries.length} catches. This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: clearAll },
              ]
            )}>
              <Ionicons name="trash-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => {
            setEditEntry(null)
            setForm(f => ({ ...f, score: conditions?.fishingScore != null ? String(conditions.fishingScore) : '' }))
            setShowModal(true)
          }}>
            <Ionicons name="add" size={16} color={Colors.background} />
            <Text style={styles.addButtonText}>Log Catch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {uniqueSpecies.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: Spacing.screenPad, gap: 8, flexDirection: 'row' }}>
          <TouchableOpacity
            style={[styles.filterPill, speciesFilter === null && styles.filterPillActive]}
            onPress={() => setSpeciesFilter(null)}
          >
            <Text style={[styles.filterPillText, speciesFilter === null && styles.filterPillTextActive]}>All</Text>
          </TouchableOpacity>
          {uniqueSpecies.map(sp => (
            <TouchableOpacity
              key={sp}
              style={[styles.filterPill, speciesFilter === sp && styles.filterPillActive]}
              onPress={() => setSpeciesFilter(sp === speciesFilter ? null : sp)}
            >
              <Text style={[styles.filterPillText, speciesFilter === sp && styles.filterPillTextActive]}>{sp}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <CatchHeatmap entries={entries} />
      <ScrollView contentContainerStyle={styles.content}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="fish-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No catches logged yet</Text>
            <Text style={styles.emptyHint}>Tap "Log Catch" after a successful trip to track your catches over time.</Text>
          </View>
        ) : (
          <>
            {filteredEntries.length >= 3 && <CatchStats entries={filteredEntries} />}
            <PersonalBests entries={filteredEntries} />
            <ScoreCorrelation entries={filteredEntries} />
            {grouped.map(([date, dayEntries]) => (
              <View key={date}>
                <Text style={styles.dayLabel}>{formatDate(date)}</Text>
                {dayEntries.map(e => (
                  <CatchCard
                    key={e.id}
                    entry={e}
                    onDelete={() => deleteEntry(e.id)}
                    onEdit={() => handleOpenEdit(e)}
                  />
                ))}
              </View>
            ))}
            {filteredEntries.length === 0 && speciesFilter && (
              <Text style={styles.emptyHint}>No {speciesFilter} catches yet.</Text>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editEntry ? 'Edit Catch' : 'Log a Catch'}</Text>
              <TouchableOpacity onPress={handleCloseModal} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
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

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>
                  Fishing Score (0–100){!editEntry && conditions?.fishingScore != null ? <Text style={{ color: Colors.accent }}> · auto-filled</Text> : ''}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 72"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  value={form.score}
                  onChangeText={v => setForm(f => ({ ...f, score: v }))}
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

            {!editEntry && (
              <View style={styles.spotRow}>
                <Text style={styles.spotLabel}>Spot: </Text>
                <Text style={styles.spotValue}>{activeSpot?.name ?? 'No active spot'}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.submitButton} onPress={editEntry ? handleSaveEdit : handleAdd}>
              <Text style={styles.submitButtonText}>{editEntry ? 'Save Changes' : 'Save Catch'}</Text>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  streakBadge: {
    backgroundColor: Colors.warning + '22', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.warning + '44',
  },
  streakText: { fontSize: 11, fontWeight: '700', color: Colors.warning },
  shareBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  addButton: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  addButtonText: { fontSize: 14, fontWeight: '700', color: Colors.background },
  filterRow: { maxHeight: 44, marginBottom: 4 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 16, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.card,
  },
  filterPillActive: { backgroundColor: Colors.accent + '22', borderColor: Colors.accent },
  filterPillText: { fontSize: 13, color: Colors.textSecondary },
  filterPillTextActive: { color: Colors.accent, fontWeight: '600' },
  content: { paddingHorizontal: Spacing.screenPad, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: Colors.textTertiary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  catchCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  catchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catchActions: { flexDirection: 'row', gap: 12 },
  catchSpecies: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
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
  bestsCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  bestsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  bestsTitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  bestsRow: { flexDirection: 'row' },
  bestItem: { flex: 1, paddingHorizontal: Spacing.sm, paddingLeft: 0 },
  bestValue: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  bestUnit: { fontSize: 12, fontWeight: '400', color: Colors.textSecondary },
  bestLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  correlationCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  heatmapCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
    marginHorizontal: Spacing.screenPad,
  },
  heatmapMeta: { fontSize: 11, color: Colors.textTertiary, marginLeft: 'auto' },
  heatmapGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: CELL_GAP, marginTop: Spacing.sm,
  },
  heatCell: {
    width: CELL, height: CELL, borderRadius: 3,
  },
})
