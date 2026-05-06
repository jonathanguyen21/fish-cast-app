import React, { useEffect, useState } from 'react'
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import Slider from '@react-native-community/slider'
import * as Notifications from 'expo-notifications'
import { useSettingsStore } from '../../store/settingsStore'
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
    alertThreshold, setAlertThreshold,
    alertsEnabled, setAlertsEnabled,
    isPro,
  } = useSettingsStore()

  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined')

  useEffect(() => {
    Notifications.getPermissionsAsync().then(p => setPermissionStatus(p.status))
  }, [])

  async function requestPermission() {
    const { status } = await Notifications.requestPermissionsAsync()
    setPermissionStatus(status)
  }

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
        <Row label="Score Alerts">
          <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} trackColor={{ true: Colors.accent }} />
        </Row>
        {alertsEnabled && (
          <View style={styles.sliderRow}>
            <Text style={styles.rowLabel}>Notify when score &gt;= {alertThreshold}</Text>
            <Slider
              style={{ width: '100%' }}
              minimumValue={40} maximumValue={90} step={5}
              value={alertThreshold} onValueChange={setAlertThreshold}
              minimumTrackTintColor={Colors.accent}
              maximumTrackTintColor={Colors.card}
              thumbTintColor={Colors.accent}
            />
          </View>
        )}
        {alertsEnabled && permissionStatus !== 'granted' && (
          <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
            <Text style={styles.permText}>Enable Notifications →</Text>
          </TouchableOpacity>
        )}
        {alertsEnabled && permissionStatus === 'granted' && (
          <Text style={styles.permGranted}>✓ Notifications enabled</Text>
        )}
      </View>

      <Text style={styles.sectionHeader}>Subscription</Text>
      <View style={styles.card}>
        <View style={styles.proStatus}>
          <Text style={styles.proLabel}>{isPro ? '✓ FishCast Pro' : 'Free Plan'}</Text>
          {!isPro && (
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </View>
        {isPro && <Text style={styles.manageLink}>Manage Subscription</Text>}
      </View>

      <Text style={styles.version}>FishCast v1.0.0</Text>
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
  sliderRow: { padding: Spacing.md },
  proStatus: { padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proLabel: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  upgradeButton: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  upgradeText: { color: Colors.background, fontWeight: '700', fontSize: 14 },
  manageLink: { padding: Spacing.md, color: Colors.ocean, fontSize: 14 },
  permButton: { padding: Spacing.md, backgroundColor: Colors.accent + '22' },
  permText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  permGranted: { padding: Spacing.md, color: Colors.success, fontSize: 13 },
  version: { textAlign: 'center', color: Colors.textTertiary, fontSize: 12, marginTop: Spacing.xl },
})
