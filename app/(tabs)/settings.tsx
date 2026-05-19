import React, { useEffect, useState } from 'react'
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { AuthModal } from '../../features/auth/AuthModal'
import { useSpots } from '../../hooks/useSpots'
import { getSpeciesForRegion } from '../../data/species'
import { SpeciesAlertsSection } from '../../features/settings/SpeciesAlertsSection'
import { submitFeatureRequest } from '../../services/featureRequestService'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

type IoniconName = keyof typeof import('@expo/vector-icons').Ionicons.glyphMap

const PRO_FEATURES: { icon: IoniconName; text: string }[] = [
  { icon: 'calendar-outline', text: '7-day fishing forecast' },
  { icon: 'bar-chart-outline', text: 'Hourly score breakdown' },
  { icon: 'fish-outline', text: 'Full species library' },
]

function Row({ iconName, label, children }: { iconName: IoniconName; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Ionicons name={iconName} size={16} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
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
    isPro, setIsPro,
  } = useSettingsStore()

  const session = useAuthStore(s => s.session)
  const signOut = useAuthStore(s => s.signOut)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const { activeSpot } = useSpots()
  const speciesForRegion = activeSpot ? getSpeciesForRegion(activeSpot.lat, activeSpot.lng) : []

  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined')
  const [showFeatureModal, setShowFeatureModal] = useState(false)
  const [featureTitle, setFeatureTitle] = useState('')
  const [featureDesc, setFeatureDesc] = useState('')
  const [featureCategory, setFeatureCategory] = useState<'feature' | 'bug' | 'improvement'>('feature')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Notifications.getPermissionsAsync().then(p => setPermissionStatus(p.status))
  }, [])

  async function requestPermission() {
    const { status } = await Notifications.requestPermissionsAsync()
    setPermissionStatus(status)
  }

  async function handleSubmitFeature() {
    if (!featureTitle.trim()) {
      Alert.alert('Title required', 'Please give your request a short title.')
      return
    }
    setSubmitting(true)
    try {
      await submitFeatureRequest({ title: featureTitle.trim(), description: featureDesc.trim(), category: featureCategory })
      setShowFeatureModal(false)
      setFeatureTitle('')
      setFeatureDesc('')
      setFeatureCategory('feature')
      Alert.alert('Thanks!', 'Your request has been submitted. We review all feedback.')
    } catch {
      Alert.alert('Error', 'Could not submit right now. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={Typography.sectionTitle}>Units</Text>
      <View style={styles.card}>
        <Row iconName="thermometer-outline" label="Temperature"><TogglePair value={tempUnit} options={['F', 'C']} onChange={setTempUnit} /></Row>
        <Row iconName="speedometer-outline" label="Wind Speed"><TogglePair value={speedUnit} options={['mph', 'kts']} onChange={setSpeedUnit} /></Row>
        <Row iconName="resize-outline" label="Height / Distance"><TogglePair value={lengthUnit} options={['ft', 'm']} onChange={setLengthUnit} /></Row>
      </View>

      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Alerts</Text>
      <View style={styles.card}>
        <Row iconName="notifications-outline" label="Score Alerts">
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
            <Ionicons name="notifications-outline" size={14} color={Colors.accent} />
            <Text style={styles.permText}>Enable Notifications</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
          </TouchableOpacity>
        )}
        {alertsEnabled && permissionStatus === 'granted' && (
          <View style={styles.permGrantedRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.permGranted}>Notifications enabled</Text>
          </View>
        )}
      </View>

      <SpeciesAlertsSection species={speciesForRegion} />

      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Account</Text>
      {session ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="person-outline" size={16} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
            <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>{session.user.email}</Text>
            <TouchableOpacity onPress={() => signOut().catch(() => {})}>
              <Text style={{ color: Colors.warning, fontSize: 14, fontWeight: '600' }}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.card} onPress={() => setShowAuthModal(true)}>
          <View style={styles.row}>
            <Ionicons name="log-in-outline" size={16} color={Colors.accent} style={{ marginRight: Spacing.sm }} />
            <Text style={[styles.rowLabel, { color: Colors.accent }]}>Sign In</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
          </View>
        </TouchableOpacity>
      )}

      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Subscription</Text>
      {isPro ? (
        <View style={styles.card}>
          <View style={styles.proActiveRow}>
            <Ionicons name="star" size={18} color={Colors.accent} />
            <Text style={styles.proActiveLabel}>FishCast Pro</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Manage your subscription"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {})}
          >
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
                <Ionicons name={f.icon} size={16} color={Colors.accent} />
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={() => Alert.alert('Coming Soon', 'Pro subscriptions will be available soon!')}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.background} />
          </TouchableOpacity>
        </View>
      )}

      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Feedback</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.feedbackRow} onPress={() => setShowFeatureModal(true)}>
          <Ionicons name="bulb-outline" size={20} color={Colors.accent} />
          <View style={styles.feedbackText}>
            <Text style={styles.feedbackTitle}>Request a Feature</Text>
            <Text style={styles.feedbackSub}>Share ideas, report bugs, or suggest improvements</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.resetBtn}
        onPress={() => Alert.alert(
          'Reset to Defaults',
          'This will reset all unit and alert settings to defaults. Spots and catch log are not affected.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: () => {
                setTempUnit('F')
                setSpeedUnit('mph')
                setLengthUnit('ft')
                setAlertThreshold(70)
                setAlertsEnabled(false)
              },
            },
          ]
        )}
      >
        <Text style={styles.resetBtnText}>Reset to Defaults</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <>
          <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Developer</Text>
          <View style={styles.card}>
            <Row iconName="star-outline" label="Pro Mode">
              <Switch value={isPro} onValueChange={setIsPro} trackColor={{ true: Colors.accent }} />
            </Row>
          </View>
        </>
      )}

      <Text style={styles.version}>FishCast v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel="Privacy Policy"
        onPress={() => Linking.openURL('https://fishcast.app/privacy').catch(() => {})}
      >
        <Text style={styles.privacyLink}>Privacy Policy</Text>
      </TouchableOpacity>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />

      <Modal visible={showFeatureModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFeatureModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request a Feature</Text>
              <TouchableOpacity onPress={() => setShowFeatureModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Help us build a better app. All requests are reviewed.</Text>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {(['feature', 'improvement', 'bug'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, featureCategory === c && styles.categoryChipActive]}
                  onPress={() => setFeatureCategory(c)}
                >
                  <Text style={[styles.categoryText, featureCategory === c && styles.categoryTextActive]}>
                    {c === 'feature' ? 'Feature' : c === 'improvement' ? 'Improve' : 'Bug'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Short summary of your request"
              placeholderTextColor={Colors.textTertiary}
              value={featureTitle}
              onChangeText={setFeatureTitle}
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>Details (optional)</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              placeholder="Describe your idea or what went wrong..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={5}
              value={featureDesc}
              onChangeText={setFeatureDesc}
            />

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmitFeature} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color={Colors.background} />
                : <Text style={styles.submitBtnText}>Submit Request</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  permButton: { padding: Spacing.md, backgroundColor: Colors.accent + '22', flexDirection: 'row', alignItems: 'center', gap: 6 },
  permText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  permGrantedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.md },
  permGranted: { color: Colors.success, fontSize: 13 },
  proActiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md,
  },
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
  featureText: { fontSize: 14, color: Colors.textPrimary },
  upgradeButton: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Spacing.cardRadius,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeButtonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  sectionSpacer: { marginTop: Spacing.lg },
  resetBtn: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.textTertiary + '40',
  },
  resetBtnText: { fontSize: 13, color: Colors.textTertiary },
  version: { textAlign: 'center', color: Colors.textTertiary, fontSize: 12, marginTop: Spacing.xl },
  privacyLink: { textAlign: 'center', color: Colors.ocean, fontSize: 12, marginTop: Spacing.sm, paddingBottom: Spacing.sm },
  feedbackRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.sm,
  },
  feedbackText: { flex: 1 },
  feedbackTitle: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  feedbackSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalContent: { padding: Spacing.screenPad, paddingBottom: 60 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, marginBottom: 6, marginTop: Spacing.md },
  fieldInput: {
    backgroundColor: Colors.card, borderRadius: 10,
    padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
  },
  fieldInputMulti: { minHeight: 100, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: Spacing.sm },
  categoryChip: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: Colors.surface, alignItems: 'center',
  },
  categoryChipActive: { backgroundColor: Colors.accent + '22', borderWidth: 1, borderColor: Colors.accent },
  categoryText: { fontSize: 13, color: Colors.textSecondary },
  categoryTextActive: { color: Colors.accent, fontWeight: '600' },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
