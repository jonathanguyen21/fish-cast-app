# FishCast Phase A — Part 2: Remaining Components & Screens

> Continuation of `2026-05-04-fishcast-phase-a.md`. Complete Tasks 1–10 first.

---

## Task 11: WindDisplay & ConditionsGrid Components

**Files:** `features/wind/WindDisplay.tsx`, `features/conditions/ConditionsGrid.tsx`, `features/conditions/PressureCard.tsx`, `features/conditions/MoonCard.tsx`

- [ ] **Step 1: Create WindDisplay**

`features/wind/WindDisplay.tsx`:
```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { WindData } from '../../types/conditions'

interface Props { wind: WindData }

function windColor(speed: number): string {
  if (speed > 18) return Colors.danger
  if (speed > 12) return Colors.warning
  return Colors.success
}

export function WindDisplay({ wind }: Props) {
  const color = windColor(wind.speed)
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(`${wind.direction}deg`, { duration: 800 }) }],
  }))

  return (
    <View style={styles.card} testID="wind-display">
      <Text style={styles.label}>Wind</Text>
      <View style={styles.row}>
        <Animated.Text style={[styles.arrow, arrowStyle]}>↑</Animated.Text>
        <Text style={[styles.speed, { color }]}>{wind.speed}</Text>
        <Text style={styles.unit}>{wind.unit}</Text>
      </View>
      <Text style={styles.sub}>{wind.directionLabel} · Gusts {wind.gusts} {wind.unit}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  label: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  arrow: { fontSize: 20, color: Colors.accent, marginRight: 2 },
  speed: { fontSize: 24, fontWeight: '700' },
  unit: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  sub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
})
```

- [ ] **Step 2: Create PressureCard**

`features/conditions/PressureCard.tsx`:
```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { PressureData } from '../../types/conditions'

interface Props { pressure: PressureData }

const trendArrow = { rising: '↗', falling: '↘', stable: '→' } as const

export function PressureCard({ pressure }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Pressure</Text>
      <Text style={styles.value}>{pressure.value.toFixed(2)}</Text>
      <Text style={styles.sub}>{trendArrow[pressure.trend]} {pressure.trend}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  label: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  value: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
})
```

- [ ] **Step 3: Create MoonCard**

`features/conditions/MoonCard.tsx`:
```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { MoonData } from '../../types/conditions'

interface Props { moon: MoonData }

export function MoonCard({ moon }: Props) {
  const nextMajor = moon.majorPeriods[0]
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Moon</Text>
      <Text style={styles.value}>{Math.round(moon.illumination * 100)}%</Text>
      <Text style={styles.sub}>{moon.phase}</Text>
      {nextMajor && <Text style={styles.sub}>Major {nextMajor.start}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  label: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  value: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
})
```

- [ ] **Step 4: Create ConditionsGrid**

`features/conditions/ConditionsGrid.tsx`:
```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { PressureCard } from './PressureCard'
import { MoonCard } from './MoonCard'
import type { ConditionsData } from '../../types/conditions'

interface Props {
  conditions: Pick<ConditionsData, 'pressure' | 'swell' | 'air' | 'sky' | 'moon' | 'sun'>
}

export function ConditionsGrid({ conditions }: Props) {
  const { pressure, swell, air, sky, moon, sun } = conditions

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Conditions</Text>
      <View style={styles.row}>
        <PressureCard pressure={pressure} />
        <View style={styles.card}>
          <Text style={styles.label}>Swell</Text>
          {swell
            ? <><Text style={styles.value}>{swell.height} {swell.unit}</Text>
                <Text style={styles.sub}>{swell.period}s {swell.directionLabel}</Text></>
            : <Text style={styles.sub}>Unavailable</Text>}
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Air Temp</Text>
          <Text style={styles.value}>{air.temp}°</Text>
          <Text style={styles.sub}>H:{air.high}° L:{air.low}°</Text>
        </View>
      </View>
      <View style={[styles.row, { marginTop: Spacing.sm }]}>
        <View style={styles.card}>
          <Text style={styles.label}>Sky</Text>
          <Text style={styles.value}>{sky.rainChance}%</Text>
          <Text style={styles.sub}>{sky.condition}</Text>
        </View>
        <MoonCard moon={moon} />
        <View style={styles.card}>
          <Text style={styles.label}>Sun</Text>
          <Text style={styles.sub}>↑ {sun.sunrise}</Text>
          <Text style={styles.sub}>↓ {sun.sunset}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  card: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  label: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  value: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
})
```

- [ ] **Step 5: Commit**

```bash
git add features/wind/ features/conditions/
git commit -m "feat: add WindDisplay and ConditionsGrid components"
```

---

## Task 12: SpeciesCard Component

**Files:** `features/species/SpeciesCard.tsx`, `features/species/SpeciesDetail.tsx`

- [ ] **Step 1: Create SpeciesCard**

`features/species/SpeciesCard.tsx`:
```typescript
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import type { SpeciesScore } from '../../types/species'

interface Props {
  speciesScore: SpeciesScore
  isPro: boolean
  onPress: () => void
}

const statusColor: Record<string, string> = {
  'Peak Season': Colors.success,
  'Active': Colors.ocean,
  'Present': Colors.textSecondary,
  'Inactive': Colors.textTertiary,
}

export function SpeciesCard({ speciesScore, isPro, onPress }: Props) {
  const { species, score, status } = speciesScore
  const isLocked = species.tier === 'pro' && !isPro
  const color = scoreColor(score)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} testID={`species-card-${species.id}`}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.name, isLocked && styles.locked]}>
            {isLocked ? '🔒 Pro Species' : species.common_name}
          </Text>
          <Text style={[styles.status, { color: statusColor[status] ?? Colors.textSecondary }]}>
            {status}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[styles.badgeScore, { color }]}>{isLocked ? '?' : score}</Text>
        </View>
      </View>
      {isLocked && (
        <Text style={styles.upgradeHint}>Upgrade to Pro to see what's biting →</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  locked: { color: Colors.textTertiary },
  status: { fontSize: 12, marginTop: 2 },
  badge: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeScore: { fontSize: 15, fontWeight: '700' },
  upgradeHint: { fontSize: 12, color: Colors.accent, marginTop: Spacing.xs },
})
```

- [ ] **Step 2: Create SpeciesDetail content component**

`features/species/SpeciesDetail.tsx`:
```typescript
import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { Species } from '../../types/species'
import type { SpeciesScore } from '../../types/species'

interface Props {
  speciesScore: SpeciesScore
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function SpeciesDetail({ speciesScore }: Props) {
  const { species, score, waterTempMatch, tideMatch, timeMatch } = speciesScore

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.name}>{species.common_name}</Text>
      <Text style={styles.scientific}>{species.scientific_name}</Text>

      <Text style={styles.sectionTitle}>Activity by Month</Text>
      <View style={styles.monthBar}>
        {MONTHS.map((m, i) => {
          const month = i + 1
          const isPeak = species.months_peak.includes(month)
          const isPresent = species.months_present.includes(month)
          return (
            <View key={m} style={styles.monthItem}>
              <View style={[
                styles.monthDot,
                isPeak && { backgroundColor: Colors.success },
                !isPeak && isPresent && { backgroundColor: Colors.accent },
              ]} />
              <Text style={styles.monthLabel}>{m}</Text>
            </View>
          )
        })}
      </View>

      <Text style={styles.sectionTitle}>Current Match</Text>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Water Temp</Text><Text style={styles.matchValue}>{waterTempMatch}</Text></View>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Tide</Text><Text style={styles.matchValue}>{tideMatch}</Text></View>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Time of Day</Text><Text style={styles.matchValue}>{timeMatch}</Text></View>

      <Text style={styles.sectionTitle}>Fishing Tips</Text>
      <Text style={styles.tips}>{species.tips}</Text>

      <Text style={styles.sectionTitle}>Migration Notes</Text>
      <Text style={styles.tips}>{species.migration_notes}</Text>

      <Text style={styles.sectionTitle}>Preferred Conditions</Text>
      <Text style={styles.tips}>
        Water temp: {species.water_temp_f.min}–{species.water_temp_f.max}°F (peak: {species.water_temp_f.peak_min}–{species.water_temp_f.peak_max}°F){'\n'}
        Tide: {species.preferred_tide}{'\n'}
        Time: {species.preferred_time_of_day.join(', ')}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.screenPad },
  name: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  scientific: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  monthBar: { flexDirection: 'row', gap: 4 },
  monthItem: { alignItems: 'center', flex: 1 },
  monthDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.card, marginBottom: 4 },
  monthLabel: { fontSize: 9, color: Colors.textTertiary },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.surface },
  matchLabel: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  matchValue: { fontSize: 13, color: Colors.textPrimary, flex: 2, textAlign: 'right' },
  tips: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
})
```

- [ ] **Step 3: Commit**

```bash
git add features/species/
git commit -m "feat: add SpeciesCard and SpeciesDetail components with Pro gating"
```

---

## Task 13: ForecastStrip Component

**Files:** `features/forecast/ForecastStrip.tsx`

- [ ] **Step 1: Create ForecastStrip**

`features/forecast/ForecastStrip.tsx`:
```typescript
import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import type { DayForecast } from '../../types/conditions'

interface Props {
  forecast: DayForecast[]
  isPro: boolean
  onUpgrade: () => void
}

export function ForecastStrip({ forecast, isPro, onUpgrade }: Props) {
  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>7-Day Forecast</Text>
        <TouchableOpacity style={styles.upgradeCard} onPress={onUpgrade}>
          <Text style={styles.upgradeTitle}>Unlock 7-Day Fishing Forecast</Text>
          <Text style={styles.upgradeSub}>See peak scores for the next 7 days → Pro</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>7-Day Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {forecast.map((day) => {
          const color = scoreColor(day.peakScore)
          return (
            <View key={day.date} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              <View style={[styles.scoreBadge, { borderColor: color }]}>
                <Text style={[styles.scoreText, { color }]}>{day.peakScore}</Text>
              </View>
              <Text style={styles.window}>{day.peakWindow.start}</Text>
              <Text style={styles.window}>–{day.peakWindow.end}</Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  scroll: { gap: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.sm, alignItems: 'center', minWidth: 72,
  },
  dayLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  scoreBadge: { borderWidth: 1.5, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 15, fontWeight: '700' },
  window: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  upgradeCard: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, padding: Spacing.md, alignItems: 'center' },
  upgradeTitle: { fontSize: 15, fontWeight: '600', color: Colors.accent },
  upgradeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
})
```

- [ ] **Step 2: Commit**

```bash
git add features/forecast/
git commit -m "feat: add ForecastStrip component with Pro gate"
```

---

## Task 14: Expo Router Navigation Layout

**Files:** `app/_layout.tsx`, `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create root layout**

`app/_layout.tsx`:
```typescript
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Colors } from '../theme/colors'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        contentStyle: { backgroundColor: Colors.background },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="spot/new" options={{ title: 'Add Spot', presentation: 'modal' }} />
        <Stack.Screen name="species/[id]" options={{ title: 'Species Detail', presentation: 'modal' }} />
      </Stack>
    </>
  )
}
```

- [ ] **Step 2: Create tab layout**

`app/(tabs)/_layout.tsx`:
```typescript
import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { Colors } from '../../theme/colors'

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Dashboard: '🧭', Spots: '📍', Settings: '⚙️' }
  return <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.5 }}>{icons[label]}</Text>
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: Colors.background, borderTopColor: Colors.surface },
      tabBarActiveTintColor: Colors.accent,
      tabBarInactiveTintColor: Colors.textTertiary,
      headerStyle: { backgroundColor: Colors.background },
      headerTintColor: Colors.textPrimary,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="spots"
        options={{
          title: 'Spots',
          tabBarIcon: ({ focused }) => <TabIcon label="Spots" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx app/\(tabs\)/_layout.tsx
git commit -m "feat: configure Expo Router navigation with dark theme"
```

---

## Task 15: Dashboard Screen

**Files:** `app/(tabs)/index.tsx`

- [ ] **Step 1: Create quick stats row component inline**

`app/(tabs)/index.tsx`:
```typescript
import React from 'react'
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { useForecast } from '../../hooks/useForecast'
import { useSettingsStore } from '../../store/settingsStore'
import { ScoreDisplay } from '../../features/score/ScoreDisplay'
import { ScoreTimeline } from '../../features/score/ScoreTimeline'
import { TideChart } from '../../features/tide/TideChart'
import { WindDisplay } from '../../features/wind/WindDisplay'
import { ConditionsGrid } from '../../features/conditions/ConditionsGrid'
import { SpeciesCard } from '../../features/species/SpeciesCard'
import { ForecastStrip } from '../../features/forecast/ForecastStrip'
import { scoreSpecies } from '../../features/species/speciesScoring'
import { detectPhase } from '../../features/tide/tideUtils'
import { getSpeciesForRegion } from '../../data/species'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useRouter } from 'expo-router'

export default function DashboardScreen() {
  const router = useRouter()
  const { activeSpot, spots } = useSpots()
  const { data: conditions, isLoading, refetch } = useConditions(activeSpot)
  const { data: forecast } = useForecast(activeSpot)
  const isPro = useSettingsStore(s => s.isPro)

  if (!activeSpot || !conditions) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spot selected</Text>
        <Text style={styles.emptyHint}>Go to Spots tab to add your first fishing spot</Text>
      </View>
    )
  }

  const currentHour = new Date().getHours()
  const tidePhase = conditions.tide
    ? detectPhase(conditions.tide.hourlyCurve, currentHour)
    : 'slack'

  const allSpecies = getSpeciesForRegion(activeSpot.lat, activeSpot.lng)
  const scoredSpecies = allSpecies
    .map(sp => scoreSpecies(sp, {
      month: new Date().getMonth() + 1,
      waterTemp: conditions.water.temp,
      tidePhase,
      currentHour,
    }))
    .sort((a, b) => {
      // Pro species sorted together at bottom if locked
      if (!isPro && a.species.tier === 'pro' && b.species.tier !== 'pro') return 1
      if (!isPro && b.species.tier === 'pro' && a.species.tier !== 'pro') return -1
      return b.score - a.score
    })

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.spotName}>{activeSpot.name}</Text>
        {spots.length > 1 && (
          <Text style={styles.switchHint} onPress={() => router.push('/spots')}>Switch ›</Text>
        )}
      </View>

      <ScoreDisplay
        score={conditions.fishingScore}
        label={conditions.scoreLabel}
        bestWindow={conditions.bestWindow}
      />

      <ScoreTimeline hourlyScores={conditions.hourlyScores} />

      {/* Quick stats row */}
      <View style={styles.quickStats}>
        <WindDisplay wind={conditions.wind} />
        {conditions.tide && (
          <View style={styles.quickCard}>
            <Text style={styles.quickLabel}>Tide</Text>
            <Text style={styles.quickValue}>{conditions.tide.current.height} ft</Text>
            <Text style={styles.quickSub}>{conditions.tide.current.rising ? '▲ Rising' : '▼ Falling'}</Text>
          </View>
        )}
        <View style={styles.quickCard}>
          <Text style={styles.quickLabel}>Water</Text>
          <Text style={styles.quickValue}>{conditions.water.temp}°</Text>
          <Text style={styles.quickSub}>{conditions.water.unit}</Text>
        </View>
      </View>

      {conditions.tide && (
        <TideChart tide={conditions.tide} currentHour={currentHour} />
      )}

      <ConditionsGrid conditions={conditions} />

      {/* What's Biting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's Biting</Text>
        {scoredSpecies.map(ss => (
          <SpeciesCard
            key={ss.species.id}
            speciesScore={ss}
            isPro={isPro}
            onPress={() => {
              if (ss.species.tier === 'pro' && !isPro) return
              router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss) } })
            }}
          />
        ))}
      </View>

      <ForecastStrip
        forecast={forecast}
        isPro={isPro}
        onUpgrade={() => router.push('/settings')}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingTop: 56, paddingBottom: Spacing.sm,
  },
  spotName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  switchHint: { fontSize: 14, color: Colors.accent },
  quickStats: {
    flexDirection: 'row', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  quickCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  quickLabel: { fontSize: 11, color: Colors.textTertiary },
  quickValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  quickSub: { fontSize: 11, color: Colors.textSecondary },
  section: {
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
})
```

- [ ] **Step 2: Test on device via Expo Go**

```bash
npx expo start
```

Scan QR, navigate to Dashboard. Verify: score displays, tide chart renders, conditions grid shows, species cards visible with Pro lock icons on pro-tier species.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: build Dashboard screen with full mock data assembly"
```

---

## Task 16: Spots List Screen

**Files:** `app/(tabs)/spots.tsx`

- [ ] **Step 1: Create Spots screen**

`app/(tabs)/spots.tsx`:
```typescript
import React from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../../features/score/scoringEngine'
import type { Spot } from '../../types/spot'

function SpotRow({ spot, isActive, onPress, onDelete }: {
  spot: Spot; isActive: boolean; onPress: () => void; onDelete: () => void
}) {
  const { data } = useConditions(spot)
  const score = data?.fishingScore ?? null
  const color = score !== null ? scoreColor(score) : Colors.textTertiary

  return (
    <TouchableOpacity
      style={[styles.row, isActive && styles.activeRow]}
      onPress={onPress}
      onLongPress={() => Alert.alert('Delete Spot', `Remove "${spot.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ])}
    >
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{spot.name}</Text>
        <Text style={styles.rowType}>{spot.type}</Text>
      </View>
      {score !== null && (
        <View style={[styles.scoreBadge, { borderColor: color }]}>
          <Text style={[styles.scoreText, { color }]}>{score}</Text>
        </View>
      )}
      {isActive && <Text style={styles.activeLabel}>Active</Text>}
    </TouchableOpacity>
  )
}

export default function SpotsScreen() {
  const router = useRouter()
  const { spots, activeSpotId, setActiveSpot, removeSpot } = useSpots()

  return (
    <View style={styles.screen}>
      <FlatList
        data={spots}
        keyExtractor={s => s.id}
        contentContainerStyle={spots.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No spots yet</Text>
            <Text style={styles.emptyHint}>Tap + to add your first fishing spot</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SpotRow
            spot={item}
            isActive={item.id === activeSpotId}
            onPress={() => {
              setActiveSpot(item.id)
              router.push('/(tabs)/')
            }}
            onDelete={() => removeSpot(item.id)}
          />
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/spot/new')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.screenPad, gap: Spacing.sm },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius, padding: Spacing.md,
  },
  activeRow: { borderWidth: 1.5, borderColor: Colors.accent },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  rowType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scoreBadge: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  scoreText: { fontSize: 15, fontWeight: '700' },
  activeLabel: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  fab: {
    position: 'absolute', right: Spacing.screenPad, bottom: 28,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  fabText: { fontSize: 28, color: Colors.background, lineHeight: 32 },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/spots.tsx
git commit -m "feat: add Spots list screen with active spot indicator"
```

---

## Task 17: Add Spot Screen

**Files:** `app/spot/new.tsx`

- [ ] **Step 1: Create Add Spot screen**

`app/spot/new.tsx`:
```typescript
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { detectRegion } from '../../data/species'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { Spot } from '../../types/spot'
import type { SpotType } from '../../types/spot'

export default function AddSpotScreen() {
  const router = useRouter()
  const { spots, addSpot } = useSpots()
  const isPro = false  // Phase A: always false; Phase B: read from settingsStore

  const [name, setName] = useState('')
  const [type, setType] = useState<SpotType>('saltwater')
  const [coords, setCoords] = useState({ lat: 38.33, lng: -123.05 })

  const isFreeAndHasSpot = !isPro && spots.length >= 1

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this spot.')
      return
    }
    if (isFreeAndHasSpot) {
      Alert.alert('Upgrade to Pro', 'Free accounts can save 1 spot. Upgrade to Pro for unlimited spots.')
      return
    }
    const spot: Spot = {
      id: `spot_${Date.now()}`,
      name: name.trim(),
      lat: coords.lat,
      lng: coords.lng,
      type,
      stationId: null,  // Phase B: resolve nearest NOAA station here
      region: detectRegion(coords.lat, coords.lng),
    }
    addSpot(spot)
    router.back()
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
                {t === 'saltwater' ? '🌊 Saltwater' : '🏞 Freshwater'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isFreeAndHasSpot && (
          <Text style={styles.proHint}>Free accounts can save 1 spot. Upgrade to Pro for unlimited spots.</Text>
        )}

        <TouchableOpacity
          style={[styles.saveButton, isFreeAndHasSpot && styles.saveDisabled]}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>{isFreeAndHasSpot ? 'Upgrade to Save More' : 'Save Spot'}</Text>
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
  saveButton: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  saveDisabled: { backgroundColor: Colors.textTertiary },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/spot/new.tsx
git commit -m "feat: add AddSpot screen with map picker and free/pro spot limit"
```

---

## Task 18: Species Detail Screen

**Files:** `app/species/[id].tsx`

- [ ] **Step 1: Create Species Detail screen**

`app/species/[id].tsx`:
```typescript
import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { SpeciesDetail } from '../../features/species/SpeciesDetail'
import type { SpeciesScore } from '../../types/species'

export default function SpeciesDetailScreen() {
  const { data } = useLocalSearchParams<{ id: string; data: string }>()

  if (!data) return null

  const speciesScore: SpeciesScore = JSON.parse(data)

  return <SpeciesDetail speciesScore={speciesScore} />
}
```

- [ ] **Step 2: Commit**

```bash
git add app/species/
git commit -m "feat: add Species Detail screen"
```

---

## Task 19: Settings Screen

**Files:** `app/(tabs)/settings.tsx`

- [ ] **Step 1: Create Settings screen**

`app/(tabs)/settings.tsx`:
```typescript
import React from 'react'
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import Slider from '@react-native-community/slider'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowControl}>{children}</View>
    </View>
  )
}

function TogglePair<T extends string>({
  value, options, onChange,
}: { value: T; options: [T, T]; onChange: (v: T) => void }) {
  return (
    <View style={styles.togglePair}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[styles.toggleOption, value === opt && styles.toggleActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.toggleText, value === opt && styles.toggleTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function SettingsScreen() {
  const {
    tempUnit, setTempUnit,
    speedUnit, setSpeedUnit,
    lengthUnit, setLengthUnit,
    alertThreshold, setAlertThreshold,
    alertsEnabled, setAlertsEnabled,
    isPro,
  } = useSettingsStore()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Units</Text>
      <View style={styles.card}>
        <Row label="Temperature"><TogglePair value={tempUnit} options={['F', 'C']} onChange={setTempUnit} /></Row>
        <Row label="Wind Speed"><TogglePair value={speedUnit} options={['mph', 'kts']} onChange={setSpeedUnit} /></Row>
        <Row label="Height/Distance"><TogglePair value={lengthUnit} options={['ft', 'm']} onChange={setLengthUnit} /></Row>
      </View>

      <Text style={styles.sectionHeader}>Alerts</Text>
      <View style={styles.card}>
        <Row label="Score Alerts">
          <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} trackColor={{ true: Colors.accent }} />
        </Row>
        {alertsEnabled && (
          <View style={styles.sliderRow}>
            <Text style={styles.rowLabel}>Notify when score ≥ {alertThreshold}</Text>
            <Slider
              style={{ width: '100%' }}
              minimumValue={40} maximumValue={90} step={5}
              value={alertThreshold} onValueChange={setAlertThreshold}
              minimumTrackTintColor={Colors.accent}
              maximumTrackTintColor={Colors.card}
              thumbTintColor={Colors.accent}
            />
          </View>
        )}
      </View>

      <Text style={styles.sectionHeader}>Subscription</Text>
      <View style={styles.card}>
        <View style={styles.proStatus}>
          <Text style={styles.proLabel}>{isPro ? '✓ FishCast Pro' : 'Free Plan'}</Text>
          {!isPro && (
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </View>
        {isPro && <Text style={styles.manageLink}>Manage Subscription</Text>}
      </View>

      <Text style={styles.version}>FishCast v1.0.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPad, paddingBottom: Spacing.xl },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  rowControl: { alignItems: 'flex-end' },
  togglePair: { flexDirection: 'row', gap: 4 },
  toggleOption: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: 6, backgroundColor: Colors.surface,
  },
  toggleActive: { backgroundColor: Colors.accent + '33', borderWidth: 1, borderColor: Colors.accent },
  toggleText: { fontSize: 13, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.accent, fontWeight: '600' },
  sliderRow: { padding: Spacing.md },
  proStatus: { padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proLabel: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  upgradeButton: { backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  upgradeText: { color: Colors.background, fontWeight: '700', fontSize: 14 },
  manageLink: { padding: Spacing.md, color: Colors.ocean, fontSize: 14 },
  version: { textAlign: 'center', color: Colors.textTertiary, fontSize: 12, marginTop: Spacing.xl },
})
```

> Note: `@react-native-community/slider` needs installing: `npx expo install @react-native-community/slider`

- [ ] **Step 2: Install slider**

```bash
npx expo install @react-native-community/slider
```

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat: add Settings screen with units, alerts, and Pro status"
```

---

## Task 20: Service Stubs & Final Verification

**Files:** `services/noaaService.ts`, `services/nwsService.ts`, `services/marineService.ts`, `services/solunarService.ts`, `services/scoringService.ts`, `services/forecastService.ts`

- [ ] **Step 1: Create service stubs**

Each stub exports the same interface Phase B will implement, so Phase B is a drop-in replacement.

`services/noaaService.ts`:
```typescript
import type { TideData, WindData, PressureData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface NoaaData {
  tide: TideData | null
  wind: WindData
  waterTemp: number
  pressure: PressureData
  airTemp: number
}

// Phase B: implement real NOAA CO-OPS API calls
export async function fetchNoaaData(_spot: Spot): Promise<NoaaData> {
  throw new Error('noaaService not yet implemented — Phase B')
}
```

`services/nwsService.ts`:
```typescript
import type { AirData, SkyData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface NwsData {
  air: AirData
  sky: SkyData
  hourlyForecast: { hour: number; windSpeed: number; cloudCover: number; rainChance: number }[]
}

export async function fetchNwsData(_spot: Spot): Promise<NwsData> {
  throw new Error('nwsService not yet implemented — Phase B')
}
```

`services/marineService.ts`:
```typescript
import type { SwellData } from '../types/conditions'
import type { Spot } from '../types/spot'

export async function fetchMarineData(_spot: Spot): Promise<SwellData | null> {
  throw new Error('marineService not yet implemented — Phase B')
}
```

`services/solunarService.ts`:
```typescript
import type { MoonData, SunData } from '../types/conditions'

export interface SolunarData {
  moon: MoonData
  sun: SunData
  inMajorPeriod: boolean
  inMinorPeriod: boolean
  withinHourOfPeriod: boolean
  isMajorMoonDay: boolean
}

export function calculateSolunar(_lat: number, _lng: number, _date: Date): SolunarData {
  throw new Error('solunarService not yet implemented — Phase B')
}
```

`services/scoringService.ts`:
```typescript
import type { ConditionsData } from '../types/conditions'
import type { Spot } from '../types/spot'

export async function fetchConditions(_spot: Spot): Promise<ConditionsData> {
  throw new Error('scoringService not yet implemented — Phase B')
}
```

`services/forecastService.ts`:
```typescript
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

export async function fetchForecast(_spot: Spot): Promise<DayForecast[]> {
  throw new Error('forecastService not yet implemented — Phase B')
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass. No failures.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Final Expo Go test**

```bash
npx expo start
```

Walk through every screen on a real device:
- Dashboard: score, timeline, tide chart, conditions grid, species cards (free/locked), forecast gate
- Spots: empty state → add spot → map → save → spot appears → tap to switch
- Settings: toggle units, slider for alert threshold, Pro status shows Free
- Species detail: tap a free species card → detail screen opens

- [ ] **Step 5: Final commit**

```bash
git add services/
git commit -m "feat: add Phase B service stubs — Phase A complete"
```

---

## Self-Review Fixes

Three issues found and corrected here:

### Fix 1: MoonCard illumination display bug
In `features/conditions/MoonCard.tsx`, `moon.illumination` is already a percentage (78, not 0.78). Replace the value line:
```typescript
// Wrong (was): <Text style={styles.value}>{Math.round(moon.illumination * 100)}%</Text>
// Correct:
<Text style={styles.value}>{moon.illumination}%</Text>
```

### Fix 2: Missing QueryClientProvider in root layout
`app/_layout.tsx` installs TanStack Query but never wraps the app in `QueryClientProvider`. Phase B hooks will crash without it. Replace `app/_layout.tsx` with:

```typescript
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Colors } from '../theme/colors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 60 * 1000, retry: 2 },
  },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        contentStyle: { backgroundColor: Colors.background },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="spot/new" options={{ title: 'Add Spot', presentation: 'modal' }} />
        <Stack.Screen name="species/[id]" options={{ title: 'Species Detail', presentation: 'modal' }} />
      </Stack>
    </QueryClientProvider>
  )
}
```

### Fix 3: Push notification permission flow missing from Settings
The spec calls for notification permission UI in Phase A. Add to the Settings screen, inside the Alerts card, below the Switch row:

```typescript
import * as Notifications from 'expo-notifications'
import { useEffect, useState } from 'react'

// Inside SettingsScreen component:
const [permissionStatus, setPermissionStatus] = useState<string>('undetermined')

useEffect(() => {
  Notifications.getPermissionsAsync().then(p => setPermissionStatus(p.status))
}, [])

async function requestPermission() {
  const { status } = await Notifications.requestPermissionsAsync()
  setPermissionStatus(status)
}

// Add this inside the Alerts card, below the Switch row:
{alertsEnabled && permissionStatus !== 'granted' && (
  <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
    <Text style={styles.permText}>Enable Notifications →</Text>
  </TouchableOpacity>
)}
{alertsEnabled && permissionStatus === 'granted' && (
  <Text style={styles.permGranted}>✓ Notifications enabled</Text>
)}

// Add to StyleSheet:
permButton: { padding: Spacing.md, backgroundColor: Colors.accent + '22' },
permText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
permGranted: { padding: Spacing.md, color: Colors.success, fontSize: 13 },
```

---

## Phase A Complete

All screens and components are built with mock data. The app runs fully in Expo Go. Proceed to `2026-05-04-fishcast-phase-b.md` for real API integration.
