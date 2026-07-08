import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSpots } from '../../hooks/useSpots'
import { useForecast } from '../../hooks/useForecast'
import { useSettingsStore } from '../../store/settingsStore'
import { ForecastStrip } from '../../features/forecast/ForecastStrip'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

// Placeholder Week tab: hosts the existing 7-day strip until the full
// Golden Hour Week screen (day cards with mini-skies) replaces this file.
export default function WeekScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { activeSpot } = useSpots()
  const isPro = useSettingsStore(s => s.isPro)
  const { data: forecast, isLoading, isError } = useForecast(activeSpot)

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>This Week</Text>
      {activeSpot ? (
        <ScrollView>
          <ForecastStrip
            forecast={forecast}
            isPro={isPro}
            isLoading={isLoading}
            isError={isError}
            onUpgrade={() => router.push('/settings')}
          />
        </ScrollView>
      ) : (
        <Text style={styles.empty}>Add a spot to see the week ahead</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, margin: Spacing.md },
  empty: { fontSize: 13, color: Colors.textSecondary, margin: Spacing.md },
})
