import React, { useEffect, useState } from 'react'
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { AuthModal } from '../features/auth/AuthModal'
import { useSpots } from '../hooks/useSpots'
import { useSkyTheme } from '../hooks/useSkyTheme'
import { getSpeciesForRegion } from '../data/species'
import { SpeciesAlertsSection } from '../features/settings/SpeciesAlertsSection'
import { submitFeatureRequest } from '../services/featureRequestService'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'
import { Accent, Radii, Type } from '../theme/tokens'
import type { SkyTheme } from '../theme/skyTheme'

type IoniconName = keyof typeof import('@expo/vector-icons').Ionicons.glyphMap

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const PRO_FEATURES: { icon: IoniconName; text: string }[] = [
  { icon: 'calendar-outline', text: '7-day fishing forecast' },
  { icon: 'bar-chart-outline', text: 'Hourly score breakdown' },
  { icon: 'fish-outline', text: 'Full species library' },
]

function Row({ iconName, label, children, theme }: { iconName: IoniconName; label: string; children: React.ReactNode; theme: SkyTheme }) {
  return (
    <View style={[styles.row, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
      <Ionicons name={iconName} size={16} color={theme.textTint} style={{ marginRight: Spacing.sm, opacity: 0.7 }} />
      <Text style={[styles.rowLabel, { color: theme.textTint }]}>{label}</Text>
      <View style={styles.rowControl}>{children}</View>
    </View>
  )
}

function TogglePair<T extends string>({
  value, options, onChange, theme,
}: { value: T; options: [T, T]; onChange: (v: T) => void; theme: SkyTheme }) {
  return (
    <View style={styles.togglePair}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.toggleOption,
            { backgroundColor: 'rgba(255,255,255,0.08)' },
            value === opt && { backgroundColor: theme.accent + '33', borderWidth: 1, borderColor: theme.accent },
          ]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.toggleText, { color: theme.textTint, opacity: 0.7 }, value === opt && { color: theme.accent, opacity: 1, fontWeight: '600' }]}>{opt}</Text>
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
  const [openFeatureAfterAuth, setOpenFeatureAfterAuth] = useState(false)

  const { activeSpot } = useSpots()
  const speciesForRegion = activeSpot ? getSpeciesForRegion(activeSpot.lat, activeSpot.lng, activeSpot.type) : []
  const theme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    undefined,
    localDateKey(new Date()),
  )

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
    <>
      <StatusBar style="light" />
      <ScrollView style={[styles.screen, { backgroundColor: theme.tintedDark.background }]} contentContainerStyle={styles.content}>
      <Text style={[Type.secondary, { color: theme.textTint, opacity: 0.7, marginBottom: 10 }]}>Units</Text>
      <View style={[styles.card, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]}>
        <Row theme={theme} iconName="thermometer-outline" label="Temperature"><TogglePair theme={theme} value={tempUnit} options={['F', 'C']} onChange={setTempUnit} /></Row>
        <Row theme={theme} iconName="speedometer-outline" label="Wind Speed"><TogglePair theme={theme} value={speedUnit} options={['mph', 'kts']} onChange={setSpeedUnit} /></Row>
        <Row theme={theme} iconName="resize-outline" label="Height / Distance"><TogglePair theme={theme} value={lengthUnit} options={['ft', 'm']} onChange={setLengthUnit} /></Row>
      </View>

      <Text style={[Type.secondary, styles.sectionSpacer, { color: theme.textTint, opacity: 0.7, marginBottom: 10 }]}>Alerts</Text>
      <View style={[styles.card, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]}>
        <Row theme={theme} iconName="notifications-outline" label="Score Alerts">
          <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} trackColor={{ true: theme.accent }} />
        </Row>
        {alertsEnabled && (
          <View style={styles.sliderRow}>
            <Text style={[styles.sliderLabel, { color: theme.textTint, opacity: 0.7 }]}>Notify when score ≥ <Text style={[styles.sliderValue, { color: theme.textTint, opacity: 1 }]}>{alertThreshold}</Text></Text>
            <Slider
              style={{ width: '100%' }}
              minimumValue={40} maximumValue={90} step={5}
              value={alertThreshold} onValueChange={setAlertThreshold}
              minimumTrackTintColor={theme.accent}
              maximumTrackTintColor="rgba(255,255,255,0.08)"
              thumbTintColor={theme.accent}
            />
          </View>
        )}
        {alertsEnabled && permissionStatus !== 'granted' && (
          <TouchableOpacity style={[styles.permButton, { backgroundColor: theme.accent + '22' }]} onPress={requestPermission}>
            <Ionicons name="notifications-outline" size={14} color={theme.accent} />
            <Text style={[styles.permText, { color: theme.accent }]}>Enable Notifications</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.accent} />
          </TouchableOpacity>
        )}
        {alertsEnabled && permissionStatus === 'granted' && (
          <View style={styles.permGrantedRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.permGranted}>Notifications enabled</Text>
          </View>
        )}
      </View>

      <SpeciesAlertsSection species={speciesForRegion} theme={theme} />

      <Text style={[Type.secondary, styles.sectionSpacer, { color: theme.textTint, opacity: 0.7, marginBottom: 10 }]}>Account</Text>
      {session ? (
        <View style={[styles.card, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]}>
          <View style={[styles.row, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
            <Ionicons name="person-outline" size={16} color={theme.textTint} style={{ marginRight: Spacing.sm, opacity: 0.7 }} />
            <Text style={[styles.rowLabel, { color: theme.textTint, flex: 1 }]} numberOfLines={1}>{session.user.email}</Text>
            <TouchableOpacity onPress={() => signOut().catch(() => {})}>
              <Text style={{ color: Colors.warning, fontSize: 14, fontWeight: '600' }}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[styles.card, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]} onPress={() => setShowAuthModal(true)}>
          <View style={[styles.row, { borderBottomColor: 'rgba(255,255,255,0.08)' }]}>
            <Ionicons name="log-in-outline" size={16} color={theme.accent} style={{ marginRight: Spacing.sm }} />
            <Text style={[styles.rowLabel, { color: theme.accent }]}>Sign In</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.accent} />
          </View>
        </TouchableOpacity>
      )}

      <Text style={[Type.secondary, styles.sectionSpacer, { color: theme.textTint, opacity: 0.7, marginBottom: 10 }]}>Subscription</Text>
      {isPro ? (
        <View style={[styles.card, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]}>
          <View style={styles.proActiveRow}>
            <Ionicons name="star" size={18} color={theme.accent} />
            <Text style={[styles.proActiveLabel, { color: theme.accent }]}>FishCast Pro</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Manage your subscription"
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {})}
          >
            <Text style={[styles.manageLink, { color: theme.accent }]}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.upgradeCard, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card, borderColor: theme.accent + '30' }]}>
          <View style={[styles.upgradeHeader, { backgroundColor: theme.accent + '10', borderBottomColor: theme.accent + '20' }]}>
            <Text style={[styles.upgradeTitle, { color: theme.accent }]}>Upgrade to Pro</Text>
            <Text style={[styles.upgradeSub, { color: theme.textTint, opacity: 0.7 }]}>Get the full forecast experience</Text>
          </View>
          <View style={styles.featureList}>
            {PRO_FEATURES.map(f => (
              <View key={f.text} style={styles.featureRow}>
                <Ionicons name={f.icon} size={16} color={theme.accent} />
                <Text style={[styles.featureText, { color: theme.textTint }]}>{f.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: Accent.warmDeep }]} onPress={() => Alert.alert('Coming Soon', 'Pro subscriptions will be available soon!')}>
            <Text style={[styles.upgradeButtonText, { color: '#3A2A16' }]}>Upgrade to Pro</Text>
            <Ionicons name="arrow-forward" size={16} color="#3A2A16" />
          </TouchableOpacity>
        </View>
      )}

      <Text style={[Type.secondary, styles.sectionSpacer, { color: theme.textTint, opacity: 0.7, marginBottom: 10 }]}>Feedback</Text>
      <View style={[styles.card, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]}>
        <TouchableOpacity style={styles.feedbackRow} onPress={() => {
          if (!session) { setOpenFeatureAfterAuth(true); setShowAuthModal(true) }
          else setShowFeatureModal(true)
        }}>
          <Ionicons name="bulb-outline" size={20} color={theme.accent} />
          <View style={styles.feedbackText}>
            <Text style={[styles.feedbackTitle, { color: theme.textTint }]}>Request a Feature</Text>
            <Text style={[styles.feedbackSub, { color: theme.textTint, opacity: 0.7 }]}>Share ideas, report bugs, or suggest improvements</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textTint} style={{ opacity: 0.55 }} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.resetBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: theme.textTint + '40' }]}
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
        <Text style={[styles.resetBtnText, { color: theme.textTint, opacity: 0.55 }]}>Reset to Defaults</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <>
          <Text style={[Type.secondary, styles.sectionSpacer, { color: theme.textTint, opacity: 0.7, marginBottom: 10 }]}>Developer</Text>
          <View style={[styles.card, { backgroundColor: theme.tintedDark.card, borderRadius: Radii.card }]}>
            <Row theme={theme} iconName="star-outline" label="Pro Mode">
              <Switch value={isPro} onValueChange={setIsPro} trackColor={{ true: theme.accent }} />
            </Row>
          </View>
        </>
      )}

      <Text style={[styles.version, { color: theme.textTint, opacity: 0.55 }]}>FishCast v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel="Privacy Policy"
        onPress={() => Linking.openURL('https://fishcast.app/privacy').catch(() => {})}
      >
        <Text style={[styles.privacyLink, { color: theme.accent }]}>Privacy Policy</Text>
      </TouchableOpacity>

      <AuthModal
        visible={showAuthModal}
        onClose={() => { setShowAuthModal(false); setOpenFeatureAfterAuth(false) }}
        onSuccess={() => {
          setShowAuthModal(false)
          if (openFeatureAfterAuth) { setOpenFeatureAfterAuth(false); setShowFeatureModal(true) }
        }}
      />

      <Modal visible={showFeatureModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFeatureModal(false)}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={[styles.modal, { backgroundColor: theme.tintedDark.background }]} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textTint }]}>Request a Feature</Text>
              <TouchableOpacity onPress={() => setShowFeatureModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={theme.textTint} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: theme.textTint, opacity: 0.7 }]}>Help us build a better app. All requests are reviewed.</Text>

            <Text style={[styles.fieldLabel, { color: theme.textTint, opacity: 0.55 }]}>Category</Text>
            <View style={styles.categoryRow}>
              {(['feature', 'improvement', 'bug'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: 'rgba(255,255,255,0.08)' },
                    featureCategory === c && { backgroundColor: theme.accent + '22', borderWidth: 1, borderColor: theme.accent },
                  ]}
                  onPress={() => setFeatureCategory(c)}
                >
                  <Text style={[styles.categoryText, { color: theme.textTint, opacity: 0.7 }, featureCategory === c && { color: theme.accent, opacity: 1, fontWeight: '600' }]}>
                    {c === 'feature' ? 'Feature' : c === 'improvement' ? 'Improve' : 'Bug'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textTint, opacity: 0.55 }]}>Title *</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: 'rgba(255,255,255,0.08)', color: theme.textTint }]}
              placeholder="Short summary of your request"
              placeholderTextColor={theme.textTint + '80'}
              value={featureTitle}
              onChangeText={setFeatureTitle}
              maxLength={100}
            />

            <Text style={[styles.fieldLabel, { color: theme.textTint, opacity: 0.55 }]}>Details (optional)</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti, { backgroundColor: 'rgba(255,255,255,0.08)', color: theme.textTint }]}
              placeholder="Describe your idea or what went wrong..."
              placeholderTextColor={theme.textTint + '80'}
              multiline
              numberOfLines={5}
              value={featureDesc}
              onChangeText={setFeatureDesc}
            />

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: Accent.warmDeep }, submitting && { opacity: 0.6 }]} onPress={handleSubmitFeature} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#3A2A16" />
                : <Text style={[styles.submitBtnText, { color: '#3A2A16' }]}>Submit Request</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.screenPad, paddingBottom: Spacing.xl },
  card: { overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 15, flex: 1 },
  rowControl: { alignItems: 'flex-end' },
  togglePair: { flexDirection: 'row', gap: 4 },
  toggleOption: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: 6,
  },
  toggleText: { fontSize: 13 },
  sliderRow: { padding: Spacing.md },
  sliderLabel: { fontSize: 14, marginBottom: 4 },
  sliderValue: { fontWeight: '700' },
  permButton: { padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6 },
  permText: { fontSize: 14, fontWeight: '600' },
  permGrantedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.md },
  permGranted: { color: Colors.success, fontSize: 13 },
  proActiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md,
  },
  proActiveLabel: { fontSize: 16, fontWeight: '700' },
  manageLink: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, fontSize: 14 },
  upgradeCard: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  upgradeHeader: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  upgradeTitle: { fontSize: 18, fontWeight: '700' },
  upgradeSub: { fontSize: 13, marginTop: 2 },
  featureList: { padding: Spacing.md, gap: Spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { fontSize: 14 },
  upgradeButton: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Spacing.cardRadius,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeButtonText: { fontSize: 16, fontWeight: '700' },
  sectionSpacer: { marginTop: Spacing.lg },
  resetBtn: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  resetBtnText: { fontSize: 13 },
  version: { textAlign: 'center', fontSize: 12, marginTop: Spacing.xl },
  privacyLink: { textAlign: 'center', fontSize: 12, marginTop: Spacing.sm, paddingBottom: Spacing.sm },
  feedbackRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, gap: Spacing.sm,
  },
  feedbackText: { flex: 1 },
  feedbackTitle: { fontSize: 15, fontWeight: '600' },
  feedbackSub: { fontSize: 12, marginTop: 2 },
  modal: { flex: 1 },
  modalContent: { padding: Spacing.screenPad, paddingBottom: 60 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSub: { fontSize: 13, marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: Spacing.md },
  fieldInput: {
    borderRadius: 10,
    padding: Spacing.md, fontSize: 15,
  },
  fieldInputMulti: { minHeight: 100, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', gap: Spacing.sm },
  categoryChip: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: 'center',
  },
  categoryText: { fontSize: 13 },
  submitBtn: {
    borderRadius: Spacing.cardRadius,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
})
