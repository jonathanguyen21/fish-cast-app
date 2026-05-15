import React, { useEffect, useState } from 'react'
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native'
import Slider from '@react-native-community/slider'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

const PRO_FEATURES = [
  { icon: '📅', text: '7-day fishing forecast' },
  { icon: '📊', text: 'Hourly score breakdown' },
  { icon: '🐟', text: 'Full species library' },
]

function Row({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
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
      <Text style={Typography.sectionTitle}>Units</Text>
      <View style={styles.card}>
        <Row icon="🌡️" label="Temperature"><TogglePair value={tempUnit} options={['F', 'C']} onChange={setTempUnit} /></Row>
        <Row icon="💨" label="Wind Speed"><TogglePair value={speedUnit} options={['mph', 'kts']} onChange={setSpeedUnit} /></Row>
        <Row icon="📏" label="Height / Distance"><TogglePair value={lengthUnit} options={['ft', 'm']} onChange={setLengthUnit} /></Row>
      </View>

      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Alerts</Text>
      <View style={styles.card}>
        <Row icon="🔔" label="Score Alerts">
          <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} trackColor={{ true: Colors.accent }} />
        </Row>
        {alertsEnabled && (
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Notify when score ≥ <Text style={styles.sliderValue}>{alertThreshold}</Text></Text>
            <Slider
              style={{ width: '100%' }}
              minimumValue={40} maximumValue={90} step={5}
              value={alertThreshold} onValueChange={setAlertThreshold}
              minimumTrackTintColor={Colors.accent}
              maximumTrackTintColor={Colors.surface}
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

      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Subscription</Text>
      {isPro ? (
        <View style={styles.card}>
          <View style={styles.proActiveRow}>
            <Text style={styles.proActiveIcon}>✦</Text>
            <Text style={styles.proActiveLabel}>FishCast Pro</Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
            <Text style={styles.manageLink}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeHeader}>
            <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={styles.upgradeSub}>Get the full forecast experience</Text>
          </View>
          <View style={styles.featureList}>
            {PRO_FEATURES.map(f => (
              <View key={f.text} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={() => Alert.alert('Coming Soon', 'Pro subscriptions will be available soon!')}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro →</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.version}>FishCast v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      <TouchableOpacity onPress={() => Linking.openURL('https://fishcast.app/privacy')}>
        <Text style={styles.privacyLink}>Privacy Policy</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPad, paddingBottom: Spacing.xl },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  rowIcon: { fontSize: 16, marginRight: Spacing.sm },
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
  sliderLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  sliderValue: { color: Colors.textPrimary, fontWeight: '700' },
  permButton: { padding: Spacing.md, backgroundColor: Colors.accent + '22' },
  permText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  permGranted: { padding: Spacing.md, color: Colors.success, fontSize: 13 },
  proActiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md,
  },
  proActiveIcon: { fontSize: 18, color: Colors.accent },
  proActiveLabel: { fontSize: 16, fontWeight: '700', color: Colors.accent },
  manageLink: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, color: Colors.ocean, fontSize: 14 },
  upgradeCard: {
    backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  upgradeHeader: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.accent + '10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent + '20',
  },
  upgradeTitle: { fontSize: 18, fontWeight: '700', color: Colors.accent },
  upgradeSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  featureList: { padding: Spacing.md, gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureIcon: { fontSize: 16 },
  featureText: { fontSize: 14, color: Colors.textPrimary },
  upgradeButton: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  sectionSpacer: { marginTop: Spacing.lg },
  version: { textAlign: 'center', color: Colors.textTertiary, fontSize: 12, marginTop: Spacing.xl },
  privacyLink: { textAlign: 'center', color: Colors.ocean, fontSize: 12, marginTop: Spacing.sm, paddingBottom: Spacing.sm },
})
