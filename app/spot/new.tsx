import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import MapView, { Marker, MapPressEvent } from 'react-native-maps'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { detectRegion } from '../../data/species'
import { resolveNearestStation, getNearbyStations, NearbyStation } from '../../services/noaaStationService'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { Spot, SpotType } from '../../types/spot'

const DEFAULT_COORDS = { lat: 38.33, lng: -123.05 }
const DEFAULT_DELTA = { latitudeDelta: 0.5, longitudeDelta: 0.5 }
const STATION_DELTA = { latitudeDelta: 0.3, longitudeDelta: 0.3 }

export default function AddSpotScreen() {
  const router = useRouter()
  const { spots, addSpot } = useSpots()
  const isPro = false
  const mapRef = useRef<MapView>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<SpotType>('saltwater')
  const [coords, setCoords] = useState(DEFAULT_COORDS)
  const [isSaving, setIsSaving] = useState(false)
  const [stations, setStations] = useState<NearbyStation[]>([])
  const [loadingStations, setLoadingStations] = useState(false)

  const isFreeAndHasSpot = !isPro && spots.length >= 1

  useEffect(() => {
    async function init() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      let centerLat = DEFAULT_COORDS.lat
      let centerLng = DEFAULT_COORDS.lng

      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          centerLat = loc.coords.latitude
          centerLng = loc.coords.longitude
          setCoords({ lat: centerLat, lng: centerLng })
          mapRef.current?.animateToRegion({
            latitude: centerLat,
            longitude: centerLng,
            ...STATION_DELTA,
          }, 500)
        } catch {
          // GPS unavailable — stay at default
        }
      }

      setLoadingStations(true)
      try {
        const nearby = await getNearbyStations(centerLat, centerLng, 150)
        setStations(nearby)
      } finally {
        setLoadingStations(false)
      }
    }
    init()
  }, [])

  function handleMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate
    setCoords({ lat: latitude, lng: longitude })
    if (!name) setName(`Spot at ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
  }

  function handleStationPress(station: NearbyStation) {
    setCoords({ lat: station.lat, lng: station.lng })
    if (!name) setName(station.name)
    mapRef.current?.animateToRegion({
      latitude: station.lat,
      longitude: station.lng,
      ...STATION_DELTA,
    }, 300)
  }

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
    let saved = false
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
      saved = true
    } catch {
      Alert.alert('Error', 'Could not save spot. Please try again.')
    } finally {
      setIsSaving(false)
    }
    if (saved) router.back()
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: DEFAULT_COORDS.lat,
          longitude: DEFAULT_COORDS.lng,
          ...DEFAULT_DELTA,
        }}
        onPress={handleMapPress}
      >
        <Marker
          coordinate={{ latitude: coords.lat, longitude: coords.lng }}
          pinColor={Colors.accent}
        />
        {stations.map(s => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            pinColor={Colors.ocean}
            title={s.name}
            description="Tap to use this station"
            onPress={() => handleStationPress(s)}
          />
        ))}
      </MapView>

      <View style={styles.form}>
        {loadingStations && (
          <View style={styles.stationRow}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.stationText}>Loading nearby stations…</Text>
          </View>
        )}
        {stations.length > 0 && !loadingStations && (
          <Text style={styles.hint}>
            {stations.length} NOAA stations nearby — tap a blue marker to use one
          </Text>
        )}

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

        {isSaving && type === 'saltwater' && (
          <View style={styles.stationRow}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.stationText}>Finding nearest tide station…</Text>
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
  hint: { fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.sm },
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
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  stationText: { fontSize: 13, color: Colors.textSecondary },
  saveButton: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  saveDisabled: { backgroundColor: Colors.textTertiary },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
