import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { scoreColor } from '../../features/score/scoringEngine'
import { regionForSpots, isZoomedOut } from '../../features/spots/mapRegion'
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

function SpotMarker({ spot, isActive, onSelect, zoomedOut }: {
  spot: Spot; isActive: boolean; onSelect: () => void; zoomedOut: boolean
}) {
  const { data } = useConditions(spot, localDateKey(new Date()))
  const score = data?.fishingScore ?? null
  const color = score !== null ? scoreColor(score) : Colors.textTertiary

  return (
    <Marker coordinate={{ latitude: spot.lat, longitude: spot.lng }} onCalloutPress={onSelect}>
      {zoomedOut ? (
        // Zoomed out far enough that full score badges would overlap and
        // become unreadable — a small color-coded dot still shows "how good
        // is this spot" at a glance without the illegible crowding.
        <View style={[styles.dot, { backgroundColor: color }, isActive && styles.dotActive]} />
      ) : (
        <View style={[styles.pin, { borderColor: color, backgroundColor: color + '30' }, isActive && styles.pinActive]}>
          <Text style={[styles.pinText, { color }]}>{score ?? '–'}</Text>
        </View>
      )}
      {/* tooltip: fully custom bubble instead of the native default (a
          white balloon on both iOS and Android) — this app's near-white
          text color was unreadable against that default background. Always
          shows the score here (not just when the on-map pin is a dot),
          since that's the one place a zoomed-out dot's score is otherwise
          not visible at all until the user zooms back in. */}
      <Callout tooltip>
        <View style={styles.calloutBubble}>
          <View style={styles.calloutHeader}>
            <Text style={styles.calloutName}>{spot.name}</Text>
            {score !== null && <Text style={[styles.calloutScore, { color }]}>{score}</Text>}
          </View>
          <Text style={styles.calloutHint}>{isActive ? 'Active spot' : 'Tap to make active'}</Text>
        </View>
      </Callout>
    </Marker>
  )
}

export default function SpotsMapScreen() {
  const router = useRouter()
  const { spots, activeSpotId, setActiveSpot } = useSpots()
  const initialRegion = regionForSpots(spots)
  const [zoomedOut, setZoomedOut] = useState(isZoomedOut(initialRegion.latitudeDelta))

  function selectSpot(id: string) {
    setActiveSpot(id)
    // This screen is a stack modal pushed on top of the tabs navigator, not
    // a tab itself — router.push('/(tabs)/') would push a whole second tabs
    // instance on top of this modal instead of returning to the existing
    // one, and repeating that (map -> pick a spot -> back to map -> pick
    // another) stacks a fresh tabs instance every time. Closing the modal
    // instead just reveals the existing screen underneath, where the newly
    // active spot is already visible.
    router.back()
  }

  return (
    <View style={styles.screen}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={(region) => setZoomedOut(isZoomedOut(region.latitudeDelta))}
      >
        {spots.map(spot => (
          <SpotMarker
            key={`${spot.id}-${zoomedOut}`}
            spot={spot}
            isActive={spot.id === activeSpotId}
            onSelect={() => selectSpot(spot.id)}
            zoomedOut={zoomedOut}
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
  dot: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.background,
  },
  dotActive: { borderColor: Colors.textPrimary, borderWidth: 2.5 },
  calloutBubble: {
    minWidth: 150, padding: Spacing.sm, borderRadius: Radii.card,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  calloutName: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.textPrimary },
  calloutScore: { fontSize: 15, fontFamily: Fonts.bold },
  calloutHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
})
