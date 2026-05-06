import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { detectRegion } from '../../data/species'
import { resolveNearestStation } from '../../services/noaaStationService'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { Spot } from '../../types/spot'
import type { SpotType } from '../../types/spot'

export default function AddSpotScreen() {
  const router = useRouter()
  const { spots, addSpot } = useSpots()
  const isPro = false

  const [name, setName] = useState('')
  const [type, setType] = useState<SpotType>('saltwater')
  const [coords, setCoords] = useState({ lat: 38.33, lng: -123.05 })
  const [isSaving, setIsSaving] = useState(false)

  const isFreeAndHasSpot = !isPro && spots.length >= 1

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this spot.')
      return
    }
    if (isFreeAndHasSpot) {
      Alert.alert('Upgrade to Pro', 'Free accounts can save 1 spot. Upgrade to Pro for unlimited spots.')
      return
    }

    setIsSaving(true)
    try {
      const stationId = type === 'saltwater'
        ? await resolveNearestStation(coords.lat, coords.lng)
        : null

      const spot: Spot = {
        id: `spot_${Date.now()}`,
        name: name.trim(),
        lat: coords.lat,
        lng: coords.lng,
        type,
        stationId,
        region: detectRegion(coords.lat, coords.lng),
      }
      addSpot(spot)
      router.back()
    } catch {
      Alert.alert('Error', 'Could not save spot. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <MapView
        style={styles.map}
        initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
        onPress={e => {
          const { latitude, longitude } = e.nativeEvent.coordinate
          setCoords({ lat: latitude, lng: longitude })
          if (!name) setName(`Spot at ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
        }}
      >
        <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} pinColor={Colors.accent} />
      </MapView>

      <View style={styles.form}>
        <Text style={styles.label}>Spot Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Bodega Bay Jetty"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.label}>Water Type</Text>
        <View style={styles.toggle}>
          {(['saltwater', 'freshwater'] as SpotType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleOption, type === t && styles.toggleActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.toggleText, type === t && styles.toggleTextActive]}>
                {t === 'saltwater' ? 'Saltwater' : 'Freshwater'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isFreeAndHasSpot && (
          <Text style={styles.proHint}>Free accounts can save 1 spot. Upgrade to Pro for unlimited spots.</Text>
        )}

        {isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.savingText}>Finding nearest tide station…</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (isFreeAndHasSpot || isSaving) && styles.saveDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveText}>
            {isSaving ? 'Saving…' : isFreeAndHasSpot ? 'Upgrade to Save More' : 'Save Spot'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  map: { height: 280 },
  form: { padding: Spacing.screenPad },
  label: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 16,
  },
  toggle: { flexDirection: 'row', gap: Spacing.sm },
  toggleOption: {
    flex: 1, padding: Spacing.md, borderRadius: Spacing.cardRadius,
    backgroundColor: Colors.card, alignItems: 'center',
  },
  toggleActive: { backgroundColor: Colors.accent + '33', borderWidth: 1.5, borderColor: Colors.accent },
  toggleText: { fontSize: 14, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.accent, fontWeight: '600' },
  proHint: { fontSize: 13, color: Colors.warning, marginTop: Spacing.md },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  savingText: { fontSize: 13, color: Colors.textSecondary },
  saveButton: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  saveDisabled: { backgroundColor: Colors.textTertiary },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
