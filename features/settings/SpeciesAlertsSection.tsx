import React from 'react'
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native'
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
  const isPro = useSettingsStore(s => s.isPro)
  const speciesAlerts = useSettingsStore(s => s.speciesAlerts)
  const alertThreshold = useSettingsStore(s => s.alertThreshold)
  const setSpeciesAlert = useSettingsStore(s => s.setSpeciesAlert)

  if (species.length === 0) return null

  return (
    <View>
      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Per-Species Alerts</Text>
      <View style={styles.card}>
        {species.map((sp, i) => {
          const alert = speciesAlerts[sp.id]
          const threshold = alert?.threshold ?? alertThreshold
          const enabled = alert?.enabled ?? false
          return (
            <View key={sp.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <View style={styles.rowHeader}>
                <Text style={styles.name}>{sp.common_name}</Text>
                <Switch
                  testID={`species-alert-toggle-${sp.id}`}
                  value={enabled}
                  onValueChange={(v) => setSpeciesAlert(sp.id, { enabled: v })}
                  trackColor={{ true: Colors.accent }}
                  disabled={!isPro}
                />
              </View>
              {enabled && isPro && (
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>Notify when score ≥ <Text style={styles.sliderValue}>{threshold}</Text></Text>
                  <Slider
                    style={{ width: '100%' }}
                    minimumValue={40} maximumValue={90} step={5}
                    value={threshold}
                    onValueChange={(v) => setSpeciesAlert(sp.id, { threshold: v })}
                    minimumTrackTintColor={Colors.accent}
                    maximumTrackTintColor={Colors.surface}
                    thumbTintColor={Colors.accent}
                  />
                </View>
              )}
            </View>
          )
        })}
        {!isPro && (
          <TouchableOpacity style={styles.lockedOverlay}>
            <Text style={styles.lockedText}>🔒 Pro feature</Text>
            <Text style={styles.lockedSub}>Get alerts when YOUR species are biting</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionSpacer: { marginTop: Spacing.lg },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden', position: 'relative' },
  row: { padding: Spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  sliderRow: { marginTop: Spacing.sm },
  sliderLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  sliderValue: { color: Colors.textPrimary, fontWeight: '700' },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockedText: { fontSize: 15, fontWeight: '700', color: Colors.accent },
  lockedSub: { fontSize: 12, color: Colors.textSecondary },
})
