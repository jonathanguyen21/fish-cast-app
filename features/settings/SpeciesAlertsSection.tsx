import React, { useState } from 'react'
import {
  View, Text, Switch, StyleSheet, TouchableOpacity, Modal,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Slider from '@react-native-community/slider'
import { StatusBar } from 'expo-status-bar'
import { useSettingsStore } from '../../store/settingsStore'
import { Spacing } from '../../theme/spacing'
import { Radii, Type } from '../../theme/tokens'
import type { SkyTheme } from '../../theme/skyTheme'
import type { Species } from '../../types/species'

interface Props {
  species: Species[]
  theme: SkyTheme
}

export function SpeciesAlertsSection({ species, theme }: Props) {
  const [open, setOpen] = useState(false)

  const isPro = useSettingsStore(s => s.isPro)
  const speciesAlerts = useSettingsStore(s => s.speciesAlerts)
  const alertThreshold = useSettingsStore(s => s.alertThreshold)
  const setSpeciesAlert = useSettingsStore(s => s.setSpeciesAlert)

  if (species.length === 0) return null

  const enabledCount = species.filter(sp => speciesAlerts[sp.id]?.enabled).length

  return (
    <>
      <Text style={[Type.secondary, styles.sectionSpacer, { color: theme.textTint, opacity: 0.7 }]}>Per-Species Alerts</Text>
      <TouchableOpacity style={[styles.card, { backgroundColor: theme.tintedDark.card }]} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={styles.summaryRow}>
          <Ionicons name="notifications-outline" size={16} color={theme.textTint} style={{ marginRight: Spacing.sm, opacity: 0.7 }} />
          <Text style={[styles.summaryLabel, { color: theme.textTint }]}>Species Alerts</Text>
          <View style={styles.summaryRight}>
            {!isPro
              ? <><Ionicons name="lock-closed" size={12} color={theme.textTint} style={{ opacity: 0.55 }} /><Text style={[styles.proChip, { color: theme.textTint, opacity: 0.55 }]}>Pro</Text></>
              : <Text style={[styles.countChip, { color: theme.textTint, opacity: 0.7 }]}>{enabledCount > 0 ? `${enabledCount} on` : 'None'}</Text>
            }
            <Ionicons name="chevron-forward" size={16} color={theme.textTint} style={{ opacity: 0.55 }} />
          </View>
        </View>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: theme.tintedDark.background }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textTint }]}>Species Alerts</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={theme.textTint} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            </View>

            {!isPro && (
              <View style={[styles.proBanner, { backgroundColor: theme.accent + '18' }]}>
                <Ionicons name="lock-closed" size={14} color={theme.accent} />
                <Text style={[styles.proBannerText, { color: theme.accent }]}>Upgrade to Pro to enable species-specific alerts</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {species.map((sp, i) => {
                const alert = speciesAlerts[sp.id]
                const threshold = alert?.threshold ?? alertThreshold
                const enabled = alert?.enabled ?? false
                return (
                  <View key={sp.id} style={[styles.speciesRow, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                    <View style={styles.speciesHeader}>
                      <Text style={[styles.speciesName, { color: theme.textTint }, !isPro && { opacity: 0.55 }]}>{sp.common_name}</Text>
                      <Switch
                        testID={`species-alert-toggle-${sp.id}`}
                        value={enabled}
                        onValueChange={v => setSpeciesAlert(sp.id, { enabled: v })}
                        trackColor={{ true: theme.accent }}
                        disabled={!isPro}
                      />
                    </View>
                    {enabled && isPro && (
                      <View style={styles.sliderRow}>
                        <Text style={[styles.sliderLabel, { color: theme.textTint, opacity: 0.7 }]}>
                          Notify when score ≥ <Text style={[styles.sliderValue, { color: theme.textTint, opacity: 1 }]}>{threshold}</Text>
                        </Text>
                        <Slider
                          style={{ width: '100%' }}
                          minimumValue={40} maximumValue={90} step={5}
                          value={threshold}
                          onValueChange={v => setSpeciesAlert(sp.id, { threshold: v })}
                          minimumTrackTintColor={theme.accent}
                          maximumTrackTintColor="rgba(255,255,255,0.08)"
                          thumbTintColor={theme.accent}
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
  card: { borderRadius: Radii.card, overflow: 'hidden' },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md,
  },
  summaryLabel: { fontSize: 15, flex: 1 },
  summaryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proChip: { fontSize: 12, marginRight: 2 },
  countChip: { fontSize: 13, marginRight: 2 },
  sheet: { flex: 1, padding: Spacing.screenPad },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  proBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10,
    padding: Spacing.sm, marginBottom: Spacing.md,
  },
  proBannerText: { fontSize: 13, flex: 1 },
  speciesRow: { paddingVertical: Spacing.sm },
  speciesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speciesName: { fontSize: 15, flex: 1 },
  sliderRow: { marginTop: 4 },
  sliderLabel: { fontSize: 12, marginBottom: 2 },
  sliderValue: { fontWeight: '700' },
})
