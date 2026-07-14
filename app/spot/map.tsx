import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { scoreColor } from '../../features/score/scoringEngine'
import { regionForSpots } from '../../features/spots/mapRegion'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Fonts, Radii } from '../../theme/tokens'
import type { Spot } from '../../types/spot'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function SpotMarker({ spot, isActive, onSelect }: { spot: Spot; isActive: boolean; onSelect: () => void }) {
  const { data } = useConditions(spot, localDateKey(new Date()))
  const score = data?.fishingScore ?? null
  const color = score !== null ? scoreColor(score) : Colors.textTertiary

  return (
    <Marker coordinate={{ latitude: spot.lat, longitude: spot.lng }} onCalloutPress={onSelect}>
      <View style={[styles.pin, { borderColor: color, backgroundColor: color + '30' }, isActive && styles.pinActive]}>
        <Text style={[styles.pinText, { color }]}>{score ?? '–'}</Text>
      </View>
      <Callout tooltip={false} style={styles.callout}>
        <Text style={styles.calloutName}>{spot.name}</Text>
        <Text style={styles.calloutHint}>{isActive ? 'Active spot' : 'Tap to make active'}</Text>
      </Callout>
    </Marker>
  )
}

export default function SpotsMapScreen() {
  const router = useRouter()
  const { spots, activeSpotId, setActiveSpot } = useSpots()

  function selectSpot(id: string) {
    setActiveSpot(id)
    router.push('/(tabs)/')
  }

  return (
    <View style={styles.screen}>
      <MapView style={styles.map} initialRegion={regionForSpots(spots)}>
        {spots.map(spot => (
          <SpotMarker
            key={spot.id}
            spot={spot}
            isActive={spot.id === activeSpotId}
            onSelect={() => selectSpot(spot.id)}
          />
        ))}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  pin: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  pinActive: { borderWidth: 3 },
  pinText: { fontSize: 13, fontFamily: Fonts.bold },
  callout: { minWidth: 140, padding: Spacing.sm, borderRadius: Radii.card },
  calloutName: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.textPrimary },
  calloutHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
})
