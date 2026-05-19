import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import MapView, { Marker, MapPressEvent } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { useSettingsStore } from '../../store/settingsStore'
import { detectRegion } from '../../data/species'
import { POPULAR_SPOTS } from '../../data/defaultSpots'
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
  const isPro = useSettingsStore(s => s.isPro)
  const mapRef = useRef<MapView>(null)
  const scrollRef = useRef<ScrollView>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState<SpotType>('saltwater')
  const [coords, setCoords] = useState(DEFAULT_COORDS)
  const [isSaving, setIsSaving] = useState(false)
  const [stations, setStations] = useState<NearbyStation[]>([])
  const [loadingStations, setLoadingStations] = useState(false)
  const [quickAddName, setQuickAddName] = useState<string | null>(null)
  const allPopularSpots = Object.values(POPULAR_SPOTS).flat()

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
    setQuickAddName(null)
    const nearest = stations.length > 0
      ? stations.reduce((best, s) => {
          const d = (s.lat - latitude) ** 2 + (s.lng - longitude) ** 2
          const bd = (best.lat - latitude) ** 2 + (best.lng - longitude) ** 2
          return d < bd ? s : best
        })
      : null
    setName(nearest ? nearest.name : `Spot at ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
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
    <ScrollView ref={scrollRef} style={styles.screen} keyboardShouldPersistTaps="handled">
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
        >
          <View style={styles.markerAccent} />
        </Marker>
        {stations.map(s => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={s.name}
            description="Tap to use this station"
            onPress={() => handleStationPress(s)}
          >
            <View style={styles.markerOcean} />
          </Marker>
        ))}
        {allPopularSpots.map(spot => (
          <Marker
            key={spot.name}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            title={spot.name}
            description="Tap to select this spot"
            onPress={() => {
              setName(spot.name)
              setType(spot.type)
              setCoords({ lat: spot.lat, lng: spot.lng })
              setQuickAddName(spot.name)
              mapRef.current?.animateToRegion({
                latitude: spot.lat, longitude: spot.lng,
                latitudeDelta: 0.15, longitudeDelta: 0.15,
              }, 400)
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 450)
            }}
          >
            <View style={styles.markerPopular} />
          </Marker>
        ))}
      </MapView>

      <View style={styles.form}>
        {quickAddName && (
          <View style={styles.quickAddBanner}>
            <Ionicons name="location" size={16} color={Colors.accent} />
            <Text style={styles.quickAddText} numberOfLines={1}>{quickAddName} selected</Text>
            <TouchableOpacity onPress={() => { setQuickAddName(null); setName('') }}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
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

        <Text style={styles.label}>Name</Text>
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
              <Ionicons
                name={t === 'saltwater' ? 'water-outline' : 'leaf-outline'}
                size={16}
                color={type === t ? Colors.accent : Colors.textTertiary}
              />
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
    flexDirection: 'row', justifyContent: 'center', gap: 6,
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
  markerAccent: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.accent, borderWidth: 2, borderColor: '#fff',
  },
  markerOcean: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.ocean, borderWidth: 2, borderColor: '#fff',
  },
  markerPopular: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.warning, borderWidth: 2, borderColor: '#fff',
  },
  quickAddBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent + '18', borderRadius: 10,
    padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  quickAddText: { flex: 1, fontSize: 14, color: Colors.accent, fontWeight: '600' },
})
