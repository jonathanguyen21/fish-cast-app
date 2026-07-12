import React from 'react'
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useSpots } from '../../hooks/useSpots'
import { useForecast } from '../../hooks/useForecast'
import { useSettingsStore } from '../../store/settingsStore'
import { useSkyTheme, resolveSkyDate } from '../../hooks/useSkyTheme'
import { getSkyTheme } from '../../theme/skyTheme'
import { weatherIconFor } from '../../theme/weatherIcon'
import { SkyBackground } from '../../features/sky/SkyBackground'
import { WeekDayCard } from '../../features/forecast/WeekDayCard'
import { Glass, Radii, Type, Accent } from '../../theme/tokens'
import { Colors } from '../../theme/colors'
import type { SkyIcon } from '../../theme/skyTheme'
import type { DayForecast } from '../../types/conditions'

type TempUnit = 'F' | 'C'

function formatTemp(f: number, tempUnit: TempUnit): number {
  return tempUnit === 'C' ? Math.round((f - 32) * 5 / 9) : f
}

export function computeDayNote(day: DayForecast, tempUnit: TempUnit): string {
  if (day.rainChance != null && day.rainChance >= 20) {
    return `${day.rainChance}% rain`
  }
  if (day.highTemp != null) {
    return `High ${formatTemp(day.highTemp, tempUnit)}°`
  }
  return day.scoreLabel
}

const SKY_WORD: Record<string, string> = {
  'clear': 'clear',
  'partly-cloudy': 'partly cloudy',
  'overcast': 'overcast',
  'light-rain': 'light rain',
  'heavy-rain': 'heavy rain',
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nextDayKey(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return localDateKey(d)
}

export default function WeekScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const tabBarHeight = useBottomTabBarHeight()
  const { activeSpot } = useSpots()
  const isPro = useSettingsStore(s => s.isPro)
  const tempUnit = useSettingsStore(s => s.tempUnit)
  const { data: forecast, isLoading, isError, isRefetching, refetch } = useForecast(activeSpot)

  const todayKey = localDateKey(new Date())
  const tomorrowKey = nextDayKey(todayKey)
  const skyTheme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    forecast?.find(d => d.date === todayKey)?.skyIcon,
    todayKey,
  )
  const tint = skyTheme.textTint

  const best = forecast && forecast.length > 0
    ? forecast.reduce((a, b) => (b.peakScore > a.peakScore ? b : a))
    : null

  return (
    <SkyBackground theme={skyTheme}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 + tabBarHeight }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={[Type.secondary, { color: tint, opacity: 0.75 }]}>This week</Text>
          <Text style={[Type.verdict, { color: tint }]}>When should you go?</Text>
          {best && (
            <Text style={[Type.secondary, { color: tint, opacity: 0.85, marginTop: 4 }]}>
              Best day: <Text style={{ color: skyTheme.accent, fontWeight: '800' }}>{best.dayLabel} · {best.peakScore}</Text>
            </Text>
          )}
        </View>

        {!activeSpot && (
          <View style={styles.stateBox}>
            <Text style={[Type.body, { color: tint, opacity: 0.85 }]}>Add a spot to see the week ahead</Text>
          </View>
        )}

        {activeSpot && !isLoading && (isError || (forecast != null && forecast.length === 0)) && (
          <View style={styles.stateBox}>
            <Text style={[Type.body, { color: tint, opacity: 0.85 }]}>Could not load the forecast</Text>
            <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
              <Text style={[Type.chip, { color: Accent.warm }]}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSpot && isLoading && !forecast && (
          <View>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.skeleton} testID="week-skeleton" />
            ))}
          </View>
        )}

        {activeSpot && forecast && forecast.length > 0 && forecast.map((day) => {
          const locked = !isPro && day.date > tomorrowKey
          const miniAt = resolveSkyDate(day.date, day.peakWindow.start, new Date())
          const miniSky = getSkyTheme(miniAt, activeSpot.lat, activeSpot.lng, day.skyIcon as SkyIcon | undefined)
          const weatherIcon = weatherIconFor(day.skyIcon, miniSky.isLight)
          const note = computeDayNote(day, tempUnit)
          return (
            <WeekDayCard
              key={day.date}
              dayLabel={day.dayLabel}
              skyWord={SKY_WORD[day.skyIcon ?? ''] ?? 'mixed sky'}
              windowLabel={`Best ${day.peakWindow.start}–${day.peakWindow.end}`}
              note={note}
              score={day.peakScore}
              miniSky={miniSky}
              weatherIcon={weatherIcon}
              isBest={!locked && best != null && day.date === best.date}
              locked={locked}
              textTint={tint}
              onPress={() =>
                locked
                  ? router.push('/settings')
                  : router.push({ pathname: '/(tabs)/', params: { date: day.date } } as never)
              }
            />
          )
        })}

        {activeSpot && forecast && !isPro && forecast.some(d => d.date > tomorrowKey) && (
          <Text style={[Type.secondary, { color: tint, opacity: 0.6, textAlign: 'center', marginTop: 12 }]}>
            Free shows today and tomorrow — Pro unlocks the full week
          </Text>
        )}
      </ScrollView>
    </SkyBackground>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  stateBox: { alignItems: 'center', padding: 32, gap: 12 },
  retry: {
    backgroundColor: Glass.fill, borderColor: Glass.stroke, borderWidth: 1,
    borderRadius: Radii.pill, paddingVertical: 8, paddingHorizontal: 18,
  },
  skeleton: {
    height: 68, borderRadius: Radii.card, marginHorizontal: 16, marginTop: 8,
    backgroundColor: Glass.fill, borderColor: Glass.stroke, borderWidth: 1,
  },
})
