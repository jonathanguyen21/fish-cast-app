import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQueryClient } from '@tanstack/react-query'
import { useCatchLog } from '../../hooks/useCatchLog'
import { AuthModal } from '../../features/auth/AuthModal'
import { useSpots } from '../../hooks/useSpots'
import { scoreColor } from '../../features/score/scoringEngine'
import { SwipeableRow } from '../../features/common/SwipeableRow'
import { useLocalCatchLogStore } from '../../store/localCatchLogStore'
import { useAuthStore } from '../../store/authStore'
import { migrateCatches } from '../../services/catchLogService'
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

const SCORE_BUCKETS = [
  { label: '0–39', min: 0, max: 39, color: '#e63946' },
  { label: '40–59', min: 40, max: 59, color: '#f4a261' },
  { label: '60–74', min: 60, max: 74, color: '#a8dadc' },
  { label: '75–89', min: 75, max: 89, color: '#2ec4b6' },
  { label: '90+', min: 90, max: 100, color: '#06d6a0' },
]

function ScoreDistributionChart({ entries }: { entries: CatchEntry[] }) {
  const withScore = entries.filter(e => e.fishingScore != null)
  if (withScore.length < 2) return null
  const counts = SCORE_BUCKETS.map(b =>
    withScore.filter(e => e.fishingScore! >= b.min && e.fishingScore! <= b.max).length
  )
  const maxCount = Math.max(...counts, 1)
  const W = 280, BAR_H = 60, COL_W = W / SCORE_BUCKETS.length
  return (
    <View style={styles.distCard}>
      <Text style={styles.distTitle}>Catches by Score Range</Text>
      <Svg width={W} height={BAR_H + 28}>
        {SCORE_BUCKETS.map((b, i) => {
          const barH = Math.max((counts[i] / maxCount) * BAR_H, counts[i] > 0 ? 4 : 0)
          const x = i * COL_W + 4
          const barW = COL_W - 8
          return (
            <React.Fragment key={b.label}>
              <Rect
                x={x} y={BAR_H - barH} width={barW} height={barH}
                rx={3} fill={counts[i] > 0 ? b.color : '#ffffff18'}
              />
              {counts[i] > 0 && (
                <SvgText x={x + barW / 2} y={BAR_H - barH - 3} textAnchor="middle" fontSize={10} fill={b.color} fontWeight="700">
                  {counts[i]}
                </SvgText>
              )}
              <SvgText x={x + barW / 2} y={BAR_H + 14} textAnchor="middle" fontSize={9} fill="#8899aa">
                {b.label}
              </SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
    </View>
  )
}

const TIME_SLOTS = [
  { label: 'Dawn', hours: [5, 6, 7, 8], icon: 'sunny-outline' as const },
  { label: 'Morning', hours: [9, 10, 11], icon: 'partly-sunny-outline' as const },
  { label: 'Midday', hours: [12, 13, 14], icon: 'sunny' as const },
  { label: 'Afternoon', hours: [15, 16, 17], icon: 'partly-sunny-outline' as const },
  { label: 'Evening', hours: [18, 19, 20], icon: 'moon-outline' as const },
  { label: 'Night', hours: [21, 22, 23, 0, 1, 2, 3, 4], icon: 'moon' as const },
]

function TimeOfDayChart({ entries }: { entries: CatchEntry[] }) {
  const withTime = entries.filter(e => e.time)
  if (withTime.length < 3) return null
  const counts = TIME_SLOTS.map(slot => ({
    ...slot,
    count: withTime.filter(e => {
      const h = parseInt(e.time!.split(':')[0], 10)
      return slot.hours.includes(h)
    }).length,
  }))
  const maxCount = Math.max(...counts.map(s => s.count), 1)
  const best = counts.reduce((a, b) => a.count >= b.count ? a : b)
  return (
    <View style={styles.timeCard}>
      <Text style={styles.distTitle}>Your Best Time to Fish</Text>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-end', marginTop: 4 }}>
        {counts.map(slot => {
          const barH = Math.max((slot.count / maxCount) * 44, slot.count > 0 ? 4 : 0)
          const isBest = slot.label === best.label && best.count > 0
          return (
            <View key={slot.label} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 9, color: isBest ? Colors.accent : Colors.textTertiary, fontWeight: isBest ? '700' : '400' }}>
                {slot.count > 0 ? slot.count : ''}
              </Text>
              <View style={{ height: 44, justifyContent: 'flex-end', width: '100%' }}>
                <View style={{
                  height: barH, borderRadius: 3,
                  backgroundColor: isBest ? Colors.accent : Colors.card,
                  width: '100%',
                }} />
              </View>
              <Ionicons name={slot.icon} size={10} color={isBest ? Colors.accent : Colors.textTertiary} />
              <Text style={{ fontSize: 8, color: isBest ? Colors.accent : Colors.textTertiary, fontWeight: isBest ? '700' : '400' }}>
                {slot.label}
              </Text>
            </View>
          )
        })}
      </View>
      {best.count > 0 && (
        <Text style={styles.timeCardHint}>You catch most fish during {best.label.toLowerCase()} hours</Text>
      )}
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
  const uniqueSpecies = Object.keys(speciesCounts).length
  const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Personal bests
  const withWeight = entries.filter(e => e.weight != null)
  const personalBest = withWeight.length
    ? withWeight.reduce((best, e) => e.weight! > best.weight! ? e : best)
    : null
  const withLength = entries.filter(e => e.length != null)
  const longestCatch = withLength.length
    ? withLength.reduce((best, e) => e.length! > best.length! ? e : best)
    : null

  // Score correlation insight
  const highScoreCatches = withScore.filter(e => e.fishingScore! >= 70).length
  const scoreInsight = withScore.length >= 4
    ? Math.round((highScoreCatches / withScore.length) * 100)
    : null

  return (
    <>
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Ionicons name="fish-outline" size={18} color={Colors.accent} />
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Catches</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="leaf-outline" size={18} color={Colors.accent} />
          <Text style={styles.statValue}>{uniqueSpecies}</Text>
          <Text style={styles.statLabel}>Species</Text>
        </View>
        {avgScore !== null && (
          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={18} color={scoreColor(avgScore)} />
            <Text style={[styles.statValue, { color: scoreColor(avgScore) }]}>{avgScore}</Text>
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

      {(personalBest || longestCatch) && (
        <View style={styles.personalBestCard}>
          <Text style={styles.personalBestTitle}>Personal Bests</Text>
          {personalBest && (
            <View style={styles.personalBestRow}>
              <Ionicons name="trophy-outline" size={14} color={Colors.warning} />
              <Text style={styles.personalBestLabel}>Heaviest</Text>
              <Text style={styles.personalBestValue} numberOfLines={1}>
                {personalBest.species}
                {'  '}
                <Text style={styles.personalBestNum}>
                  {(() => {
                    const oz = Math.round((personalBest.weight! % 1) * 16)
                    return oz > 0
                      ? `${Math.floor(personalBest.weight!)} lbs ${oz} oz`
                      : `${Math.floor(personalBest.weight!)} lbs`
                  })()}
                </Text>
              </Text>
            </View>
          )}
          {longestCatch && (
            <View style={styles.personalBestRow}>
              <Ionicons name="resize-outline" size={14} color={Colors.ocean} />
              <Text style={styles.personalBestLabel}>Longest</Text>
              <Text style={styles.personalBestValue} numberOfLines={1}>
                {longestCatch.species}
                {'  '}
                <Text style={styles.personalBestNum}>{longestCatch.length} in</Text>
              </Text>
            </View>
          )}
        </View>
      )}

      {scoreInsight !== null && (
        <View style={styles.insightCard}>
          <Ionicons
            name={scoreInsight >= 60 ? 'checkmark-circle' : 'information-circle-outline'}
            size={16}
            color={scoreInsight >= 60 ? Colors.success : Colors.textSecondary}
          />
          <Text style={styles.insightText}>
            {scoreInsight}% of your logged catches were during a score of 70 or higher.
            {scoreInsight >= 70 ? ' The score is working for you!' : ''}
          </Text>
        </View>
      )}
      <ScoreDistributionChart entries={entries} />
      <TimeOfDayChart entries={entries} />
    </>
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
  const { entries, addEntry, deleteEntry, isSignedIn, isLocal } = useCatchLog()
  const { activeSpot } = useSpots()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [form, setForm] = useState<FormState>({ species: '', weightLbs: '', weightOz: '', length: '', note: '', score: '' })
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false)
  const [logView, setLogView] = useState<'date' | 'spot'>('date')

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
    setShowModal(true)
  }

  function handleAuthSuccess() {
    setShowAuthModal(false)
    const session = useAuthStore.getState().session
    const localEntries = useLocalCatchLogStore.getState().entries
    if (!session || localEntries.length === 0) return
    const count = localEntries.length
    Alert.alert(
      'Sync Local Catches',
      `You have ${count} local catch${count === 1 ? '' : 'es'}. Sync them to your account?`,
      [
        { text: 'Skip', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            try {
              await migrateCatches(
                session.user.id,
                localEntries.map(({ id: _id, ...rest }) => rest)
              )
              useLocalCatchLogStore.getState().clearAll()
              queryClient.invalidateQueries({ queryKey: ['catches', session.user.id] })
            } catch {
              Alert.alert('Sync Failed', 'Could not sync catches. They are still saved locally.')
            }
          },
        },
      ]
    )
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

  const groupedBySpot = useMemo(() => {
    const map: Record<string, { spotName: string; entries: CatchEntry[] }> = {}
    for (const e of entries) {
      if (!map[e.spotId]) map[e.spotId] = { spotName: e.spotName, entries: [] }
      map[e.spotId].entries.push(e)
    }
    return Object.values(map).sort((a, b) => b.entries.length - a.entries.length)
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
      {entries.length > 0 && (
        <View style={styles.viewToggleRow}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, logView === 'date' && styles.viewToggleActive]}
            onPress={() => setLogView('date')}
          >
            <Ionicons name="calendar-outline" size={12} color={logView === 'date' ? Colors.accent : Colors.textTertiary} />
            <Text style={[styles.viewToggleText, logView === 'date' && styles.viewToggleTextActive]}>By Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, logView === 'spot' && styles.viewToggleActive]}
            onPress={() => setLogView('spot')}
          >
            <Ionicons name="location-outline" size={12} color={logView === 'spot' ? Colors.accent : Colors.textTertiary} />
            <Text style={[styles.viewToggleText, logView === 'spot' && styles.viewToggleTextActive]}>By Spot</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLocal && (
        <TouchableOpacity style={styles.syncBanner} onPress={() => setShowAuthModal(true)} activeOpacity={0.8}>
          <Ionicons name="cloud-outline" size={14} color={Colors.accent} />
          <Text style={styles.syncBannerText}>Sign in to sync catches across devices</Text>
          <Ionicons name="chevron-forward" size={12} color={Colors.accent} />
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="fish-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No catches logged yet</Text>
            <Text style={styles.emptyHint}>Tap "Log Catch" after a successful trip to track your catches over time.</Text>
          </View>
        ) : logView === 'spot' ? (
          <>
            {entries.length >= 1 && <CatchStats entries={entries} />}
            {groupedBySpot.map(({ spotName, entries: spotEntries }) => {
              const withScore = spotEntries.filter(e => e.fishingScore != null)
              const avgScore = withScore.length
                ? Math.round(withScore.reduce((s, e) => s + e.fishingScore!, 0) / withScore.length)
                : null
              const speciesCounts: Record<string, number> = {}
              spotEntries.forEach(e => { speciesCounts[e.species] = (speciesCounts[e.species] ?? 0) + 1 })
              const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
              return (
                <View key={spotName} style={styles.spotGroupCard}>
                  <View style={styles.spotGroupHeader}>
                    <Ionicons name="location" size={14} color={Colors.accent} />
                    <Text style={styles.spotGroupName} numberOfLines={1}>{spotName}</Text>
                    <View style={styles.spotGroupBadge}>
                      <Text style={styles.spotGroupCount}>{spotEntries.length} catch{spotEntries.length !== 1 ? 'es' : ''}</Text>
                    </View>
                  </View>
                  <View style={styles.spotGroupStats}>
                    {avgScore !== null && (
                      <View style={styles.spotStat}>
                        <Text style={[styles.spotStatValue, { color: scoreColor(avgScore) }]}>{avgScore}</Text>
                        <Text style={styles.spotStatLabel}>avg score</Text>
                      </View>
                    )}
                    {topSpecies && (
                      <View style={styles.spotStat}>
                        <Text style={styles.spotStatValue} numberOfLines={1}>{topSpecies}</Text>
                        <Text style={styles.spotStatLabel}>top species</Text>
                      </View>
                    )}
                  </View>
                  {spotEntries.slice(0, 2).map(e => (
                    <View key={e.id} style={styles.catchCardWrap}>
                      <CatchCard entry={e} onDelete={() => deleteEntry(e.id)} />
                    </View>
                  ))}
                  {spotEntries.length > 2 && (
                    <Text style={styles.spotMoreText}>+{spotEntries.length - 2} more catch{spotEntries.length - 2 !== 1 ? 'es' : ''}</Text>
                  )}
                </View>
              )
            })}
          </>
        ) : (
          <>
            {entries.length >= 1 && <CatchStats entries={entries} />}
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
        onSuccess={handleAuthSuccess}
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
  syncBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.sm,
    backgroundColor: Colors.accent + '18',
    borderRadius: 10, paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  syncBannerText: { flex: 1, fontSize: 13, color: Colors.accent },
  content: { paddingHorizontal: Spacing.screenPad, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  viewToggleRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: Spacing.screenPad, marginBottom: Spacing.sm,
  },
  viewToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.card,
  },
  viewToggleActive: { borderColor: Colors.accent + '55', backgroundColor: Colors.accent + '15' },
  viewToggleText: { fontSize: 12, color: Colors.textTertiary, fontWeight: '600' },
  viewToggleTextActive: { color: Colors.accent },
  spotGroupCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    marginBottom: Spacing.md, padding: Spacing.md,
  },
  spotGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  spotGroupName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  spotGroupBadge: {
    backgroundColor: Colors.accent + '22', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  spotGroupCount: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  spotGroupStats: {
    flexDirection: 'row', gap: Spacing.lg, marginBottom: 10,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.card,
  },
  spotStat: { alignItems: 'flex-start' },
  spotStatValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  spotStatLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 1 },
  spotMoreText: {
    fontSize: 12, color: Colors.textTertiary, textAlign: 'center',
    paddingTop: 4,
  },
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
    padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', gap: Spacing.md,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textTertiary },
  personalBestCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
  },
  personalBestTitle: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, marginBottom: 2 },
  personalBestRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  personalBestLabel: { fontSize: 12, color: Colors.textSecondary, width: 52 },
  personalBestValue: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  personalBestNum: { fontSize: 13, color: Colors.textSecondary, fontWeight: '400' },
  insightCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
  },
  insightText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  distCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center',
  },
  distTitle: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, marginBottom: Spacing.sm },
  timeCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  timeCardHint: { fontSize: 11, color: Colors.textTertiary, marginTop: 6, textAlign: 'center' },
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
