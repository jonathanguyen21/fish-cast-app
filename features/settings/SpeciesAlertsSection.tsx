import React, { useState } from 'react'
import {
  View, Text, Switch, StyleSheet, TouchableOpacity, Modal,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import type { Species } from '../../types/species'

interface Props {
  species: Species[]
}

export function SpeciesAlertsSection({ species }: Props) {
  const [open, setOpen] = useState(false)

  const isPro = useSettingsStore(s => s.isPro)
  const speciesAlerts = useSettingsStore(s => s.speciesAlerts)
  const alertThreshold = useSettingsStore(s => s.alertThreshold)
  const setSpeciesAlert = useSettingsStore(s => s.setSpeciesAlert)

  if (species.length === 0) return null

  const enabledCount = species.filter(sp => speciesAlerts[sp.id]?.enabled).length

  return (
    <>
      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Per-Species Alerts</Text>
      <TouchableOpacity style={styles.card} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={styles.summaryRow}>
          <Ionicons name="notifications-outline" size={16} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
          <Text style={styles.summaryLabel}>Species Alerts</Text>
          <View style={styles.summaryRight}>
            {!isPro
              ? <><Ionicons name="lock-closed" size={12} color={Colors.textTertiary} /><Text style={styles.proChip}>Pro</Text></>
              : <Text style={styles.countChip}>{enabledCount > 0 ? `${enabledCount} on` : 'None'}</Text>
            }
            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Species Alerts</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!isPro && (
              <View style={styles.proBanner}>
                <Ionicons name="lock-closed" size={14} color={Colors.accent} />
                <Text style={styles.proBannerText}>Upgrade to Pro to enable species-specific alerts</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {species.map((sp, i) => {
                const alert = speciesAlerts[sp.id]
                const threshold = alert?.threshold ?? alertThreshold
                const enabled = alert?.enabled ?? false
                return (
                  <View key={sp.id} style={[styles.speciesRow, i > 0 && styles.rowBorder]}>
                    <View style={styles.speciesHeader}>
                      <Text style={[styles.speciesName, !isPro && styles.dimmed]}>{sp.common_name}</Text>
                      <Switch
                        testID={`species-alert-toggle-${sp.id}`}
                        value={enabled}
                        onValueChange={v => setSpeciesAlert(sp.id, { enabled: v })}
                        trackColor={{ true: Colors.accent }}
                        disabled={!isPro}
                      />
                    </View>
                    {enabled && isPro && (
                      <View style={styles.sliderRow}>
                        <Text style={styles.sliderLabel}>
                          Notify when score ≥ <Text style={styles.sliderValue}>{threshold}</Text>
                        </Text>
                        <Slider
                          style={{ width: '100%' }}
                          minimumValue={40} maximumValue={90} step={5}
                          value={threshold}
                          onValueChange={v => setSpeciesAlert(sp.id, { threshold: v })}
                          minimumTrackTintColor={Colors.accent}
                          maximumTrackTintColor={Colors.surface}
                          thumbTintColor={Colors.accent}
                        />
                      </View>
                    )}
                  </View>
                )
              })}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  sectionSpacer: { marginTop: Spacing.lg },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden' },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md,
  },
  summaryLabel: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  summaryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proChip: { fontSize: 12, color: Colors.textTertiary, marginRight: 2 },
  countChip: { fontSize: 13, color: Colors.textSecondary, marginRight: 2 },
  sheet: { flex: 1, backgroundColor: Colors.background, padding: Spacing.screenPad },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  proBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent + '18', borderRadius: 10,
    padding: Spacing.sm, marginBottom: Spacing.md,
  },
  proBannerText: { fontSize: 13, color: Colors.accent, flex: 1 },
  speciesRow: { paddingVertical: Spacing.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface },
  speciesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speciesName: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  dimmed: { color: Colors.textTertiary },
  sliderRow: { marginTop: 4 },
  sliderLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  sliderValue: { color: Colors.textPrimary, fontWeight: '700' },
})
