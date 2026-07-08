import React, { useRef, useCallback } from 'react'
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSpots } from '../hooks/useSpots'
import { useConditions } from '../hooks/useConditions'
import { useSkyTheme } from '../hooks/useSkyTheme'
import { Type, Fonts } from '../theme/tokens'
import { TideSection } from '../features/conditions/sections/TideSection'
import { WindSection } from '../features/conditions/sections/WindSection'
import { PressureSection } from '../features/conditions/sections/PressureSection'
import { SunMoonSection } from '../features/conditions/sections/SunMoonSection'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const SECTIONS: { key: string; title: string; Component: React.ComponentType<any> }[] = [
  { key: 'tide', title: 'Tide', Component: TideSection },
  { key: 'wind', title: 'Wind', Component: WindSection },
  { key: 'pressure', title: 'Pressure', Component: PressureSection },
  { key: 'sun', title: 'Sun & moon', Component: SunMoonSection },
]

export default function ConditionsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { activeSpot } = useSpots()
  const { section } = useLocalSearchParams<{ section?: string }>()
  const todayKey = localDateKey(new Date())
  const { data: conditions } = useConditions(activeSpot, todayKey)
  const theme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    conditions?.sky.icon,
    todayKey,
  )
  const scrollRef = useRef<ScrollView>(null)
  const sectionY = useRef<Record<string, number>>({})
  const scrolled = useRef(false)

  const onSectionLayout = useCallback((key: string, y: number) => {
    sectionY.current[key] = y
    if (!scrolled.current && section && key === section) {
      scrolled.current = true
      // Defer one frame so layout settles before scrolling
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: false }))
    }
  }, [section])

  return (
    <View style={[styles.screen, { backgroundColor: theme.tintedDark.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: theme.textTint }]}>Conditions</Text>
        <TouchableOpacity testID="conditions-close" accessibilityRole="button" onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={22} color={theme.textTint} />
        </TouchableOpacity>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {conditions ? SECTIONS.map(({ key, title, Component }) => (
          <View key={key} testID={`section-${key}`} onLayout={e => onSectionLayout(key, e.nativeEvent.layout.y)}>
            <Text style={[Type.secondary, styles.sectionTitle, { color: theme.textTint }]}>{title}</Text>
            <Component conditions={conditions} theme={theme} />
          </View>
        )) : (
          <Text style={[Type.body, { color: theme.textTint, opacity: 0.7, padding: 20 }]}>Loading conditions…</Text>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontFamily: Fonts.extraBold, fontSize: 24 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  content: { paddingBottom: 40 },
  sectionTitle: { opacity: 0.7, marginHorizontal: 20, marginTop: 18, marginBottom: 4 },
})
