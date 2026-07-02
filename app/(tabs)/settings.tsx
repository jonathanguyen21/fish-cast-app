import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useSettingsStore } from '../../store/settingsStore'
import { ProWaitlistSheet } from '../../components/ProWaitlistSheet'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowControl}>{children}</View>
    </View>
  )
}

function TogglePair<T extends string>({
  value, options, onChange,
}: { value: T; options: [T, T]; onChange: (v: T) => void }) {
  return (
    <View style={styles.togglePair}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.toggleOption, value === opt && styles.toggleActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.toggleText, value === opt && styles.toggleTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function SettingsScreen() {
  const {
    tempUnit, setTempUnit,
    speedUnit, setSpeedUnit,
    lengthUnit, setLengthUnit,
    isPro,
  } = useSettingsStore()

  const [showWaitlist, setShowWaitlist] = useState(false)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Units</Text>
      <View style={styles.card}>
        <Row label="Temperature"><TogglePair value={tempUnit} options={['F', 'C']} onChange={setTempUnit} /></Row>
        <Row label="Wind Speed"><TogglePair value={speedUnit} options={['mph', 'kts']} onChange={setSpeedUnit} /></Row>
        <Row label="Height/Distance"><TogglePair value={lengthUnit} options={['ft', 'm']} onChange={setLengthUnit} /></Row>
      </View>

      <Text style={styles.sectionHeader}>Alerts</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Smart score alerts</Text>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Subscription</Text>
      <View style={styles.card}>
        <View style={styles.proStatus}>
          <Text style={styles.proLabel}>{isPro ? '✓ FishCast Pro' : 'Free Plan'}</Text>
          {!isPro && (
            <TouchableOpacity style={styles.upgradeButton} onPress={() => setShowWaitlist(true)}>
              <Text style={styles.upgradeText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </View>
        {isPro && <Text style={styles.manageLink}>Manage Subscription</Text>}
      </View>

      <Text style={styles.version}>FishCast v1.0.0</Text>
      <ProWaitlistSheet visible={showWaitlist} onClose={() => setShowWaitlist(false)} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPad, paddingBottom: Spacing.xl },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  rowControl: { alignItems: 'flex-end' },
  togglePair: { flexDirection: 'row', gap: 4 },
  toggleOption: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: 6, backgroundColor: Colors.surface,
  },
  toggleActive: { backgroundColor: Colors.accent + '33', borderWidth: 1, borderColor: Colors.accent },
  toggleText: { fontSize: 13, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.accent, fontWeight: '600' },
  comingSoon: { fontSize: 13, color: Colors.textTertiary },
  proStatus: { padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proLabel: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  upgradeButton: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  upgradeText: { color: Colors.background, fontWeight: '700', fontSize: 14 },
  manageLink: { padding: Spacing.md, color: Colors.ocean, fontSize: 14 },
  version: { textAlign: 'center', color: Colors.textTertiary, fontSize: 12, marginTop: Spacing.xl },
})
