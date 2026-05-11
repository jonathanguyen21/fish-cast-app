# FishCast UI Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a circle fishing score dial, tappable wind/pressure detail modals, an interactive tide chart cursor, GPS-centered spot picker with NOAA station markers, and wire settings unit conversions throughout all display components.

**Architecture:** Data layer changes come first (extend types → extend services → wire through buildConditionsData) so downstream UI tasks have the types they need. UI tasks are then independent of each other. Two new expo-router modal screens (`app/detail/wind.tsx`, `app/detail/pressure.tsx`) follow the existing `species/[id].tsx` modal pattern. Unit conversions are added by reading from `useSettingsStore` inside each affected component — no prop drilling.

**Tech Stack:** React Native, Expo SDK 54, expo-router v6, react-native-svg (already installed), react-native-reanimated (already installed), expo-location (already installed ~19.0.8), PanResponder (React Native core — no new deps), Zustand, TanStack Query.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `types/conditions.ts` | Modify | Add `windHourly` to `ConditionsData`, `readings` to `PressureData` |
| `services/nwsService.ts` | Modify | Add `windDirection: string` to each `hourlyForecast` item |
| `services/noaaService.ts` | Modify | Add `readings: number[]` to `parsePressure` output |
| `services/scoringService.ts` | Modify | Wire `windHourly` and `pressure.readings` into `buildConditionsData` output |
| `features/score/ScoreDisplay.tsx` | Rewrite | Animated SVG gradient arc with score inside |
| `app/(tabs)/_layout.tsx` | Modify | Rename Dashboard tab → Forecast |
| `app/(tabs)/index.tsx` | Modify | Rename fn, stat card hi/lo, unit-aware water card, onPress wiring |
| `features/wind/WindDisplay.tsx` | Modify | `speedUnit` conversion, `peakSpeed` prop, `onPress` prop |
| `features/tide/TideChart.tsx` | Modify | PanResponder touch cursor, `lengthUnit` conversion |
| `features/conditions/PressureCard.tsx` | Modify | `onPress` prop |
| `features/conditions/ConditionsGrid.tsx` | Modify | `onPressPressure` prop passed through to PressureCard |
| `features/score/ScoreTimeline.tsx` | Modify | Pro lock tooltip on bar tap |
| `app/_layout.tsx` | Modify | Register `/detail/wind` and `/detail/pressure` modal routes |
| `app/detail/wind.tsx` | Create | Wind hourly bar chart modal with scrub interaction |
| `app/detail/pressure.tsx` | Create | Pressure line chart modal with scrub interaction |
| `services/noaaStationService.ts` | Modify | Add `getNearbyStations()` returning nearby stations with names |
| `app/spot/new.tsx` | Modify | GPS centering on mount, NOAA station markers, tap-to-prefill |

---

### Task 1: Extend types for hourly wind and pressure readings

**Files:**
- Modify: `types/conditions.ts`

- [ ] **Step 1: Add `readings` to `PressureData` and `windHourly` to `ConditionsData`**

Replace the existing interfaces in `types/conditions.ts`:

```typescript
// PressureData — add readings array (oldest → newest, up to 8 values)
export interface PressureData {
  value: number
  trend: 'rising' | 'falling' | 'stable'
  rate: 'slow' | 'fast' | 'normal'
  unit: string
  readings: number[]
}

// ConditionsData — add windHourly
export interface ConditionsData {
  fishingScore: number
  scoreLabel: string
  bestWindow: { start: string; end: string; score: number }
  wind: WindData
  windHourly: { hour: number; speed: number; directionLabel: string }[]
  tide: TideData | null
  water: { temp: number; unit: string }
  air: AirData
  pressure: PressureData
  swell: SwellData | null
  sky: SkyData
  sun: SunData
  moon: MoonData
  hourlyScores: HourlyScore[]
}
```

- [ ] **Step 2: Run type check — expect errors in noaaService and scoringService**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: errors in `noaaService.ts` (parsePressure missing `readings`) and `scoringService.ts` (NEUTRAL_PRESSURE missing `readings`, buildConditionsData missing `windHourly`). These are fixed in Tasks 2 and 3.

- [ ] **Step 3: Commit**

```bash
git add types/conditions.ts
git commit -m "feat: add windHourly and pressure.readings to ConditionsData types"
```

---

### Task 2: Parse hourly wind direction and pressure readings in services

**Files:**
- Modify: `services/nwsService.ts`
- Modify: `services/noaaService.ts`
- Test: `__tests__/nwsService.test.ts`
- Test: `__tests__/noaaService.test.ts`

- [ ] **Step 1: Write failing test for `windDirection` in NWS hourly forecast**

In `__tests__/nwsService.test.ts`, add at the end of the `describe` block:

```typescript
it('includes windDirection in each hourlyForecast item', async () => {
  const pointsFixture = require('./fixtures/nwsPoints.json')
  const hourlyFixture = require('./fixtures/nwsHourlyForecast.json')
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => pointsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => hourlyFixture })
  const result = await fetchNwsData(SPOT)
  expect(result.hourlyForecast[0]).toHaveProperty('windDirection')
  expect(typeof result.hourlyForecast[0].windDirection).toBe('string')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/nwsService.test.ts --no-coverage
```

Expected: FAIL — `windDirection` property does not exist on hourlyForecast items.

- [ ] **Step 3: Add `windDirection` to `NwsData.hourlyForecast` and parse it**

In `services/nwsService.ts`, update the `NwsData` interface:

```typescript
export interface NwsData {
  air: AirData
  sky: SkyData
  wind: WindData
  hourlyForecast: {
    hour: number
    windSpeed: number
    cloudCover: number
    rainChance: number
    windDirection: string
  }[]
}
```

Update the `hourlyForecast` map in `fetchNwsData` (replace the existing map):

```typescript
const hourlyForecast = periods.map((p: any) => ({
  hour: new Date(p.startTime).getHours(),
  windSpeed: parseWindSpeed(p.windSpeed),
  cloudCover: p.shortForecast.toLowerCase().includes('cloud') ? 70 : 20,
  rainChance: p.probabilityOfPrecipitation?.value ?? 0,
  windDirection: (p.windDirection as string) ?? 'N',
}))
```

- [ ] **Step 4: Write failing test for `pressure.readings` array**

In `__tests__/noaaService.test.ts`, add at the end of the `describe` block:

```typescript
it('includes readings array on pressure (oldest to newest)', async () => {
  mockAllProducts()
  const result = await fetchNoaaData(SPOT)
  expect(Array.isArray(result.pressure?.readings)).toBe(true)
  expect(result.pressure!.readings.length).toBeGreaterThan(0)
  // oldest first: 30.18 comes before 30.02 in the fixture
  const readings = result.pressure!.readings
  expect(readings[0]).toBeCloseTo(30.18, 2)
  expect(readings[readings.length - 1]).toBeCloseTo(30.02, 2)
})
```

- [ ] **Step 5: Add `readings` to `parsePressure` in `services/noaaService.ts`**

Replace the `parsePressure` function:

```typescript
function parsePressure(data: any): PressureData | null {
  if (!data?.data?.length) return null
  const readings = data.data
    .map((d: any) => parseFloat(d.v))
    .filter((v: number) => !isNaN(v))
  if (readings.length === 0) return null

  // data arrives newest-first; reverse so index 0 = oldest (left of chart)
  const orderedReadings = [...readings].reverse()

  const current = readings[0]
  const threeHrAgo = readings[Math.min(3, readings.length - 1)]
  const delta = current - threeHrAgo
  const abs = Math.abs(delta)

  const trend: PressureData['trend'] =
    delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable'
  const rate: PressureData['rate'] =
    abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast'

  return { value: current, trend, rate, unit: 'inHg', readings: orderedReadings }
}
```

- [ ] **Step 6: Run all tests**

```bash
npx jest __tests__/nwsService.test.ts __tests__/noaaService.test.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add services/nwsService.ts services/noaaService.ts __tests__/nwsService.test.ts __tests__/noaaService.test.ts
git commit -m "feat: parse per-hour wind direction in NWS and pressure readings array in NOAA"
```

---

### Task 3: Wire windHourly and pressure.readings through buildConditionsData

**Files:**
- Modify: `services/scoringService.ts`
- Test: `__tests__/scoringService.test.ts`

- [ ] **Step 1: Write failing test for `windHourly` on ConditionsData output**

In `__tests__/scoringService.test.ts`, add to the `describe` block (check existing test structure for setup — the file uses `buildConditionsData` with mock inputs):

```typescript
it('includes windHourly derived from NWS hourlyForecast', () => {
  const result = buildConditionsData(mockNoaa, mockNws, null, mockSolunar, mockSpot, new Date())
  expect(Array.isArray(result.windHourly)).toBe(true)
  // mockNws should have hourlyForecast entries — windHourly should map them
  expect(result.windHourly.length).toBe(mockNws!.hourlyForecast.length)
  expect(result.windHourly[0]).toHaveProperty('hour')
  expect(result.windHourly[0]).toHaveProperty('speed')
  expect(result.windHourly[0]).toHaveProperty('directionLabel')
})

it('returns empty windHourly when NWS unavailable', () => {
  const result = buildConditionsData(mockNoaa, null, null, mockSolunar, mockSpot, new Date())
  expect(result.windHourly).toEqual([])
})

it('passes through pressure.readings from NOAA data', () => {
  const result = buildConditionsData(mockNoaa, mockNws, null, mockSolunar, mockSpot, new Date())
  expect(result.pressure.readings).toEqual(mockNoaa!.pressure!.readings)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/scoringService.test.ts --no-coverage
```

Expected: FAIL — `windHourly` does not exist on result.

- [ ] **Step 3: Update `NEUTRAL_PRESSURE` and `buildConditionsData` in `services/scoringService.ts`**

Update the `NEUTRAL_PRESSURE` constant:

```typescript
const NEUTRAL_PRESSURE: PressureData = {
  value: 29.92, trend: 'stable', rate: 'normal', unit: 'inHg', readings: [],
}
```

In `buildConditionsData`, update the return statement to add `windHourly`:

```typescript
return {
  fishingScore: currentScore,
  scoreLabel: scoreLabel(currentScore),
  bestWindow,
  wind,
  windHourly: nws?.hourlyForecast.map(h => ({
    hour: h.hour,
    speed: h.windSpeed,
    directionLabel: h.windDirection,
  })) ?? [],
  tide,
  water: { temp: waterTempValue, unit: '°F' },
  air: nws?.air ?? { temp: 65, high: 70, low: 58, humidity: 70, unit: '°F' },
  pressure,
  swell: marine,
  sky,
  sun: solunar.sun,
  moon: solunar.moon,
  hourlyScores,
}
```

- [ ] **Step 4: Run all tests**

```bash
npx jest --no-coverage 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: all suites pass.

- [ ] **Step 5: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no errors (other than the known spots.tsx error).

- [ ] **Step 6: Commit**

```bash
git add services/scoringService.ts __tests__/scoringService.test.ts
git commit -m "feat: wire windHourly and pressure.readings through buildConditionsData"
```

---

### Task 4: Rewrite ScoreDisplay with animated SVG circle arc

**Files:**
- Modify: `features/score/ScoreDisplay.tsx`
- Test: `__tests__/ScoreDisplay.test.tsx`

- [ ] **Step 1: Verify existing tests pass before touching the component**

```bash
npx jest __tests__/ScoreDisplay.test.tsx --no-coverage
```

Expected: 3 tests pass.

- [ ] **Step 2: Rewrite `features/score/ScoreDisplay.tsx`**

```typescript
import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const SIZE = 160
const RADIUS = 64
const STROKE_WIDTH = 12
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface Props {
  score: number
  label: string
  bestWindow: { start: string; end: string; score: number }
}

export function ScoreDisplay({ score, label, bestWindow }: Props) {
  const animatedOffset = useSharedValue(CIRCUMFERENCE)

  useEffect(() => {
    animatedOffset.value = withTiming(
      CIRCUMFERENCE * (1 - score / 100),
      { duration: 1200, easing: Easing.out(Easing.cubic) }
    )
  }, [score])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }))

  return (
    <View style={styles.container} testID="score-display">
      <View style={styles.circleWrapper}>
        {/* SVG rotated so arc starts at top */}
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Defs>
            <LinearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#0077b6" />
              <Stop offset="1" stopColor="#48cae4" />
            </LinearGradient>
          </Defs>
          {/* Background track */}
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={Colors.surface}
            strokeWidth={STROKE_WIDTH}
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke="url(#scoreGrad)"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
        {/* Text overlay — native Text nodes so tests can find them */}
        <View style={styles.textOverlay} pointerEvents="none">
          <Text style={styles.scoreNumber} testID="score-number">{score}</Text>
          <Text style={styles.scoreName}>FISHING SCORE</Text>
          <Text style={styles.scoreLabel}>{label}</Text>
        </View>
      </View>
      <Text style={styles.bestWindow}>
        Best window: {bestWindow.start}–{bestWindow.end} · Score {bestWindow.score}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
  },
  circleWrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  textOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 52,
  },
  scoreName: {
    fontSize: 9,
    color: '#48cae4',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  scoreLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  bestWindow: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
})
```

- [ ] **Step 3: Run existing tests**

```bash
npx jest __tests__/ScoreDisplay.test.tsx --no-coverage
```

Expected: all 3 tests pass (score number, label, and best window are still native Text nodes).

- [ ] **Step 4: Commit**

```bash
git add features/score/ScoreDisplay.tsx
git commit -m "feat: replace score number with animated SVG gradient arc circle"
```

---

### Task 5: Rename Dashboard tab to Forecast

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Update tab layout**

In `app/(tabs)/_layout.tsx`, make these changes:

```typescript
// Update the TabLabel type
type TabLabel = 'Forecast' | 'Spots' | 'Settings'

// Update the icons map inside TabIcon
const icons: Record<TabLabel, string> = { Forecast: '🧭', Spots: '📍', Settings: '⚙️' }

// Update the Tabs.Screen for index
<Tabs.Screen
  name="index"
  options={{
    title: 'Forecast',
    headerShown: false,
    tabBarIcon: ({ focused }) => <TabIcon label="Forecast" focused={focused} />,
  }}
/>
```

- [ ] **Step 2: Rename the exported function in `app/(tabs)/index.tsx`**

Change:
```typescript
export default function DashboardScreen() {
```
To:
```typescript
export default function ForecastScreen() {
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/index.tsx
git commit -m "feat: rename Dashboard tab to Forecast"
```

---

### Task 6: Settings unit conversions

**Files:**
- Modify: `features/wind/WindDisplay.tsx`
- Modify: `features/tide/TideChart.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add `speedUnit` conversion and `peakSpeed`/`onPress` props to `WindDisplay.tsx`**

Replace `features/wind/WindDisplay.tsx`:

```typescript
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useSettingsStore } from '../../store/settingsStore'
import type { WindData } from '../../types/conditions'

interface Props {
  wind: WindData
  peakSpeed?: number
  onPress?: () => void
}

function windColor(speed: number): string {
  if (speed > 18) return Colors.danger
  if (speed > 12) return Colors.warning
  return Colors.success
}

export function WindDisplay({ wind, peakSpeed, onPress }: Props) {
  const speedUnit = useSettingsStore(s => s.speedUnit)

  const convert = (mph: number) =>
    speedUnit === 'kts' ? Math.round(mph * 0.868) : mph
  const unitLabel = speedUnit === 'kts' ? 'kts' : 'mph'

  const displaySpeed = convert(wind.speed)
  const displayGusts = convert(wind.gusts)
  const displayPeak = peakSpeed !== undefined ? convert(peakSpeed) : undefined

  const color = windColor(wind.speed)
  const rotation = useSharedValue(wind.direction)

  useEffect(() => {
    rotation.value = withTiming(wind.direction, { duration: 800 })
  }, [wind.direction])

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const card = (
    <View style={styles.card} testID="wind-display">
      <Text style={styles.label}>Wind</Text>
      <View style={styles.row}>
        <Animated.Text style={[styles.arrow, arrowStyle]}>↑</Animated.Text>
        <Text style={[styles.speed, { color }]}>{displaySpeed}</Text>
        <Text style={styles.unit}>{unitLabel}</Text>
      </View>
      <Text style={styles.sub}>{wind.directionLabel} · Gusts {displayGusts} {unitLabel}</Text>
      {displayPeak !== undefined && (
        <Text style={styles.peak}>↑ {displayPeak} {unitLabel} max</Text>
      )}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity style={styles.touchWrapper} onPress={onPress} activeOpacity={0.75}>
        {card}
      </TouchableOpacity>
    )
  }
  return card
}

const styles = StyleSheet.create({
  touchWrapper: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    alignItems: 'center',
  },
  label: { fontSize: 11, color: Colors.textTertiary, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  arrow: { fontSize: 20, color: Colors.accent, marginRight: 2 },
  speed: { fontSize: 24, fontWeight: '700' },
  unit: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  sub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  peak: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
})
```

- [ ] **Step 2: Add `lengthUnit` conversion to `TideChart.tsx`**

At the top of `TideChart` component function body, add after existing state:

```typescript
const lengthUnit = useSettingsStore(s => s.lengthUnit)
const fmtHeight = (h: number) =>
  lengthUnit === 'm' ? (h * 0.3048).toFixed(1) : h.toFixed(1)
const heightUnit = lengthUnit === 'm' ? 'm' : 'ft'
```

Add the import at the top of the file:
```typescript
import { useSettingsStore } from '../../store/settingsStore'
```

Update the events rendering in the return (find the `hiLo.map` section):
```typescript
{hiLo.map((ev) => (
  <Text key={ev.time} style={styles.eventText}>
    {ev.type === 'high' ? '▲' : '▼'} {ev.time} {fmtHeight(ev.height)} {heightUnit}
  </Text>
))}
```

- [ ] **Step 3: Add `tempUnit` conversion to water card in `app/(tabs)/index.tsx`**

Add this import to `index.tsx` (it likely already has `useSettingsStore`):
```typescript
import { useSettingsStore } from '../../store/settingsStore'
```

Inside `ForecastScreen`, add:
```typescript
const { tempUnit } = useSettingsStore(s => ({ tempUnit: s.tempUnit }))
```

Update the water quickCard in the JSX (find the existing water card):
```typescript
<View style={styles.quickCard}>
  <Text style={styles.quickLabel}>Water</Text>
  <Text style={styles.quickValue}>
    {tempUnit === 'C'
      ? Math.round((conditions.water.temp - 32) * 5 / 9)
      : conditions.water.temp}°
  </Text>
  <Text style={styles.quickSub}>{tempUnit === 'C' ? '°C' : '°F'}</Text>
</View>
```

- [ ] **Step 4: Run type check and tests**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
npx jest --no-coverage 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: type check clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/wind/WindDisplay.tsx features/tide/TideChart.tsx app/(tabs)/index.tsx
git commit -m "feat: wire speedUnit, tempUnit, lengthUnit conversions through display components"
```

---

### Task 7: Stat card hi/lo additions

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Compute wind peak and tide next-high inline in `ForecastScreen`**

Inside `ForecastScreen`, add after the existing `currentHour` line:

```typescript
const windPeak = conditions?.windHourly?.length
  ? Math.max(...conditions.windHourly.map(h => h.speed))
  : undefined

const tideNextHigh = conditions?.tide?.events.find(e => e.type === 'high')
```

- [ ] **Step 2: Pass `peakSpeed` to `WindDisplay` and update tide quick card**

Find the `quickStats` section in the JSX. Update `WindDisplay`:

```typescript
<WindDisplay
  wind={conditions.wind}
  peakSpeed={windPeak}
  onPress={() => router.push({
    pathname: '/detail/wind',
    params: { data: JSON.stringify(conditions.windHourly) },
  })}
/>
```

Update the tide quickCard to show the next high tide event:

```typescript
{conditions.tide && (
  <View style={styles.quickCard}>
    <Text style={styles.quickLabel}>Tide</Text>
    <Text style={styles.quickValue}>{conditions.tide.current.height} ft</Text>
    <Text style={styles.quickSub}>{conditions.tide.current.rising ? '▲ Rising' : '▼ Falling'}</Text>
    {tideNextHigh && (
      <Text style={styles.quickPeak}>▲ {tideNextHigh.height.toFixed(1)} ft {tideNextHigh.time}</Text>
    )}
  </View>
)}
```

Add `quickPeak` style:
```typescript
quickPeak: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: show wind daily peak and next high tide on stat cards"
```

---

### Task 8: Interactive tide chart touch cursor

**Files:**
- Modify: `features/tide/TideChart.tsx`
- Test: `__tests__/TideChart.test.tsx`

- [ ] **Step 1: Run existing tests to confirm baseline**

```bash
npx jest __tests__/TideChart.test.tsx --no-coverage
```

Expected: 2 tests pass.

- [ ] **Step 2: Add PanResponder cursor to `TideChart.tsx`**

Add imports at top:
```typescript
import { PanResponder, PanResponderInstance } from 'react-native'
import { useState, useMemo, useRef } from 'react'
import { SvgText } from 'react-native-svg'
```

Wait — `react-native-svg` exports `Text` as `SvgText` when you rename. Actually, the existing TideChart doesn't use SvgText. To avoid naming collision with RN's `Text`, import it as:
```typescript
import { Svg, Path, Defs, LinearGradient, Stop, Line, Circle, Text as SvgText } from 'react-native-svg'
```

Inside the `TideChart` component, add state and PanResponder:

```typescript
const [cursorIndex, setCursorIndex] = useState<number | null>(null)
const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

const chartW = CHART_WIDTH - PADDING.left - PADDING.right

const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
  onStartShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponder: () => true,
  onPanResponderGrant: (e) => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    const rawIdx = (e.nativeEvent.locationX - PADDING.left) / chartW * (curve.length - 1)
    setCursorIndex(Math.max(0, Math.min(Math.round(rawIdx), curve.length - 1)))
  },
  onPanResponderMove: (e) => {
    const rawIdx = (e.nativeEvent.locationX - PADDING.left) / chartW * (curve.length - 1)
    setCursorIndex(Math.max(0, Math.min(Math.round(rawIdx), curve.length - 1)))
  },
  onPanResponderRelease: () => {
    fadeTimer.current = setTimeout(() => setCursorIndex(null), 2000)
  },
}), [curve.length, chartW])
```

Wrap the `<Svg>` in a `<View {...panResponder.panHandlers}>`:

```typescript
<View {...panResponder.panHandlers}>
  <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
    {/* ...existing content... */}

    {/* Cursor (only when active) */}
    {cursorIndex !== null && (() => {
      const cx = toX(cursorIndex)
      const cy = toY(curve[cursorIndex])
      const labelH = curve[cursorIndex]
      const h = useSettingsStore.getState().lengthUnit === 'm'
        ? (labelH * 0.3048).toFixed(1)
        : labelH.toFixed(1)
      const unit = useSettingsStore.getState().lengthUnit === 'm' ? 'm' : 'ft'
      return (
        <>
          <Line
            x1={cx} y1={PADDING.top}
            x2={cx} y2={CHART_HEIGHT - PADDING.bottom}
            stroke={Colors.accent} strokeWidth={1} strokeDasharray="3 2"
          />
          <Circle cx={cx} cy={cy} r={5} fill={Colors.accent} />
          <SvgText
            x={Math.min(cx + 6, CHART_WIDTH - 60)}
            y={Math.max(cy - 8, PADDING.top + 12)}
            fill={Colors.textPrimary}
            fontSize={11}
            fontWeight="600"
          >
            {h} {unit}
          </SvgText>
        </>
      )
    })()}
  </Svg>
</View>
```

Note: calling `useSettingsStore.getState()` (not the hook) is valid inside an IIFE in JSX since it reads the store state synchronously without subscribing. The component already subscribes to `lengthUnit` via the `useSettingsStore` hook added in Task 6.

Actually, it's cleaner to just use the already-declared `fmtHeight` and `heightUnit` variables from Task 6. Replace the cursor label text:

```typescript
<SvgText ...>
  {fmtHeight(curve[cursorIndex])} {heightUnit}
</SvgText>
```

- [ ] **Step 3: Run tests**

```bash
npx jest __tests__/TideChart.test.tsx --no-coverage
```

Expected: existing 2 tests still pass (touch cursor is additive, doesn't break existing render).

- [ ] **Step 4: Commit**

```bash
git add features/tide/TideChart.tsx
git commit -m "feat: add touch-drag cursor to tide chart showing height at touched hour"
```

---

### Task 9: Wind detail modal

**Files:**
- Create: `app/detail/wind.tsx`
- Modify: `app/_layout.tsx`
- Test: `__tests__/WindDetail.test.tsx` (new)

- [ ] **Step 1: Register the modal route in `app/_layout.tsx`**

Add inside the `<Stack>` (after the existing species route):

```typescript
<Stack.Screen
  name="detail/wind"
  options={{ title: 'Wind Detail', presentation: 'modal', headerShown: true }}
/>
```

- [ ] **Step 2: Write a smoke test for the wind detail screen**

Create `__tests__/WindDetail.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react-native'
import WindDetailScreen from '../app/detail/wind'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    data: JSON.stringify([
      { hour: 8, speed: 12, directionLabel: 'SW' },
      { hour: 9, speed: 15, directionLabel: 'W' },
      { hour: 10, speed: 18, directionLabel: 'NW' },
    ]),
  }),
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('../store/settingsStore', () => ({
  useSettingsStore: (sel: any) => sel({ speedUnit: 'mph' }),
}))

describe('WindDetailScreen', () => {
  it('renders without crashing', () => {
    render(<WindDetailScreen />)
    expect(screen.getByText('Wind Detail')).toBeTruthy()
  })

  it('shows peak wind line', () => {
    render(<WindDetailScreen />)
    expect(screen.getByText(/Peak:/)).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx jest __tests__/WindDetail.test.tsx --no-coverage
```

Expected: FAIL — module `../app/detail/wind` not found.

- [ ] **Step 4: Create `app/detail/wind.tsx`**

```typescript
import React, { useState, useMemo, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import { Svg, Rect, Line, Text as SvgText } from 'react-native-svg'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

type WindHourly = { hour: number; speed: number; directionLabel: string }

const CHART_HEIGHT = 160
const PADDING = { top: 16, bottom: 32, left: 8, right: 8 }
const BAR_GAP = 3

export default function WindDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const speedUnit = useSettingsStore(s => s.speedUnit)

  const windHourly: WindHourly[] = data ? JSON.parse(data) : []
  const convert = (mph: number) => speedUnit === 'kts' ? Math.round(mph * 0.868) : mph
  const unitLabel = speedUnit === 'kts' ? 'kts' : 'mph'

  const chartW = width - Spacing.screenPad * 2 - Spacing.md * 2
  const barW = windHourly.length > 0
    ? (chartW - PADDING.left - PADDING.right) / windHourly.length - BAR_GAP
    : 0
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const maxSpeed = windHourly.length > 0
    ? Math.max(...windHourly.map(h => h.speed), 1)
    : 1
  const peakEntry = windHourly.reduce<WindHourly | null>(
    (best, h) => (!best || h.speed > best.speed ? h : best), null
  )

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round(x / ((chartW - PADDING.left - PADDING.right) / (windHourly.length - 1 || 1)))
      setCursorIdx(Math.max(0, Math.min(idx, windHourly.length - 1)))
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round(x / ((chartW - PADDING.left - PADDING.right) / (windHourly.length - 1 || 1)))
      setCursorIdx(Math.max(0, Math.min(idx, windHourly.length - 1)))
    },
    onPanResponderRelease: () => {},
  }), [windHourly.length, chartW])

  const toBarX = (i: number) =>
    PADDING.left + i * ((chartW - PADDING.left - PADDING.right) / (windHourly.length || 1))
  const toBarH = (speed: number) => (speed / maxSpeed) * chartH

  function hourLabel(h: number) {
    const period = h < 12 ? 'AM' : 'PM'
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${display}${period}`
  }

  const cursor = cursorIdx !== null ? windHourly[cursorIdx] : null

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Wind Detail</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {cursor && (
        <View style={styles.cursorInfo}>
          <Text style={styles.cursorText}>
            {hourLabel(cursor.hour)} — {convert(cursor.speed)} {unitLabel} {cursor.directionLabel}
          </Text>
        </View>
      )}

      {windHourly.length > 0 ? (
        <View style={[styles.chartCard, { width: chartW + Spacing.md * 2 }]}>
          <View {...panResponder.panHandlers}>
            <Svg width={chartW} height={CHART_HEIGHT}>
              {windHourly.map((item, i) => {
                const bh = toBarH(item.speed)
                const bx = toBarX(i)
                const by = PADDING.top + chartH - bh
                const isActive = cursorIdx === i
                return (
                  <Rect
                    key={item.hour}
                    x={bx}
                    y={by}
                    width={Math.max(barW, 2)}
                    height={bh}
                    rx={2}
                    fill={isActive ? Colors.accent : Colors.ocean}
                    opacity={isActive ? 1 : 0.6}
                  />
                )
              })}
              {/* Hour labels every 4 hours */}
              {windHourly.filter((_, i) => i % 4 === 0).map((item, i) => (
                <SvgText
                  key={item.hour}
                  x={toBarX(i * 4)}
                  y={CHART_HEIGHT - 4}
                  fill={Colors.textTertiary}
                  fontSize={9}
                >
                  {hourLabel(item.hour)}
                </SvgText>
              ))}
            </Svg>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>No hourly wind data available</Text>
      )}

      {peakEntry && (
        <Text style={styles.peakLine}>
          Peak: {convert(peakEntry.speed)} {unitLabel} at {hourLabel(peakEntry.hour)} ({peakEntry.directionLabel})
        </Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPad, paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  close: { fontSize: 14, color: Colors.accent },
  cursorInfo: {
    backgroundColor: Colors.card, borderRadius: 8, padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cursorText: { fontSize: 13, color: Colors.textPrimary, textAlign: 'center' },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  peakLine: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
```

- [ ] **Step 5: Run test**

```bash
npx jest __tests__/WindDetail.test.tsx --no-coverage
```

Expected: both tests pass.

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add app/detail/wind.tsx app/_layout.tsx __tests__/WindDetail.test.tsx
git commit -m "feat: add wind detail modal with hourly bar chart and scrub interaction"
```

---

### Task 10: Pressure detail modal

**Files:**
- Modify: `features/conditions/PressureCard.tsx`
- Modify: `features/conditions/ConditionsGrid.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/_layout.tsx`
- Create: `app/detail/pressure.tsx`
- Test: `__tests__/PressureDetail.test.tsx` (new)

- [ ] **Step 1: Add `onPress` prop to `PressureCard.tsx`**

Replace `features/conditions/PressureCard.tsx`:

```typescript
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { cardStyles } from '../../theme/cardStyles'
import type { PressureData } from '../../types/conditions'

interface Props {
  pressure: PressureData
  onPress?: () => void
}

const trendArrow = { rising: '↗', falling: '↘', stable: '→' } as const

export function PressureCard({ pressure, onPress }: Props) {
  const content = (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>Pressure</Text>
      <Text style={cardStyles.value}>{pressure.value.toFixed(2)}</Text>
      <Text style={cardStyles.sub}>{trendArrow[pressure.trend]} {pressure.trend}</Text>
    </View>
  )
  if (onPress) {
    return (
      <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    )
  }
  return content
}
```

- [ ] **Step 2: Add `onPressPressure` prop to `ConditionsGrid.tsx`**

Update the `Props` interface:

```typescript
interface Props {
  conditions: Pick<ConditionsData, 'pressure' | 'swell' | 'air' | 'sky' | 'moon' | 'sun'>
  onPressPressure?: () => void
}
```

Update the function signature and PressureCard usage:

```typescript
export function ConditionsGrid({ conditions, onPressPressure }: Props) {
  // ...existing destructuring...
  return (
    // ...existing JSX, update only PressureCard:
    <PressureCard pressure={pressure} onPress={onPressPressure} />
```

- [ ] **Step 3: Wire `onPressPressure` in `app/(tabs)/index.tsx`**

Find `<ConditionsGrid conditions={conditions} />` and update:

```typescript
<ConditionsGrid
  conditions={conditions}
  onPressPressure={() => router.push({
    pathname: '/detail/pressure',
    params: { data: JSON.stringify(conditions.pressure) },
  })}
/>
```

- [ ] **Step 4: Register the pressure modal route in `app/_layout.tsx`**

Add inside the `<Stack>` (after the wind route added in Task 9):

```typescript
<Stack.Screen
  name="detail/pressure"
  options={{ title: 'Pressure Detail', presentation: 'modal', headerShown: true }}
/>
```

- [ ] **Step 5: Write smoke test**

Create `__tests__/PressureDetail.test.tsx`:

```typescript
import React from 'react'
import { render, screen } from '@testing-library/react-native'
import PressureDetailScreen from '../app/detail/pressure'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    data: JSON.stringify({
      value: 29.95,
      trend: 'falling',
      rate: 'slow',
      unit: 'inHg',
      readings: [30.10, 30.08, 30.05, 30.02, 29.95],
    }),
  }),
  useRouter: () => ({ back: jest.fn() }),
}))

describe('PressureDetailScreen', () => {
  it('renders without crashing', () => {
    render(<PressureDetailScreen />)
    expect(screen.getByText('Pressure Detail')).toBeTruthy()
  })

  it('shows trend sentence', () => {
    render(<PressureDetailScreen />)
    expect(screen.getByText(/Falling slowly/i)).toBeTruthy()
  })
})
```

- [ ] **Step 6: Run smoke test — expect fail**

```bash
npx jest __tests__/PressureDetail.test.tsx --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 7: Create `app/detail/pressure.tsx`**

```typescript
import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import { Svg, Polyline, Circle, Text as SvgText, Line } from 'react-native-svg'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { PressureData } from '../../types/conditions'

const CHART_HEIGHT = 160
const PADDING = { top: 20, bottom: 28, left: 16, right: 16 }

const TREND_SENTENCES: Record<string, Record<string, string>> = {
  falling: {
    slow: 'Falling slowly — barometric drop often triggers feeding activity',
    normal: 'Falling steadily — fish may be more active as pressure drops',
    fast: 'Falling fast — fish can become unpredictable; best to get out early',
  },
  rising: {
    slow: 'Rising slowly — conditions stabilising, good sustained bite likely',
    normal: 'Rising steadily — fish often go deep; try bottom presentations',
    fast: 'Rising fast — fish tend to go deep and feed less aggressively',
  },
  stable: {
    slow: 'Stable — consistent pressure supports predictable fish behavior',
    normal: 'Stable — consistent pressure supports predictable fish behavior',
    fast: 'Stable — consistent pressure supports predictable fish behavior',
  },
}

export default function PressureDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()

  const pressure: PressureData | null = data ? JSON.parse(data) : null
  const readings = pressure?.readings ?? []
  const chartW = width - Spacing.screenPad * 2 - Spacing.md * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const minR = readings.length ? Math.min(...readings) - 0.05 : 29.8
  const maxR = readings.length ? Math.max(...readings) + 0.05 : 30.2
  const range = maxR - minR || 0.1

  const toX = (i: number) =>
    PADDING.left + (i / Math.max(readings.length - 1, 1)) * innerW
  const toY = (v: number) =>
    PADDING.top + innerH - ((v - minR) / range) * innerH

  const points = readings.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (readings.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, readings.length - 1)))
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (readings.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, readings.length - 1)))
    },
    onPanResponderRelease: () => {},
  }), [readings.length, innerW])

  const trendSentence = pressure
    ? (TREND_SENTENCES[pressure.trend]?.[pressure.rate] ?? '')
    : ''

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Pressure Detail</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {cursorIdx !== null && readings[cursorIdx] !== undefined && (
        <View style={styles.cursorInfo}>
          <Text style={styles.cursorText}>
            {readings[cursorIdx].toFixed(2)} inHg
          </Text>
        </View>
      )}

      {readings.length >= 2 ? (
        <View style={[styles.chartCard, { width: chartW + Spacing.md * 2 }]}>
          <View {...panResponder.panHandlers}>
            <Svg width={chartW} height={CHART_HEIGHT}>
              <Polyline
                points={points}
                fill="none"
                stroke={Colors.ocean}
                strokeWidth={2}
              />
              {readings.map((v, i) => (
                <Circle
                  key={i}
                  cx={toX(i)} cy={toY(v)} r={cursorIdx === i ? 6 : 3}
                  fill={cursorIdx === i ? Colors.accent : Colors.ocean}
                />
              ))}
              {/* Baseline label */}
              <SvgText x={PADDING.left} y={CHART_HEIGHT - 4} fill={Colors.textTertiary} fontSize={9}>
                {readings.length} readings
              </SvgText>
            </Svg>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>Not enough pressure readings available</Text>
      )}

      {pressure && (
        <View style={styles.trendCard}>
          <Text style={styles.trendValue}>{pressure.value.toFixed(2)} inHg</Text>
          <Text style={styles.trendSentence}>{trendSentence}</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPad, paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  close: { fontSize: 14, color: Colors.accent },
  cursorInfo: {
    backgroundColor: Colors.card, borderRadius: 8, padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cursorText: { fontSize: 14, color: Colors.textPrimary, textAlign: 'center', fontWeight: '600' },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  trendCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  trendValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  trendSentence: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
```

- [ ] **Step 8: Run tests**

```bash
npx jest __tests__/PressureDetail.test.tsx --no-coverage
```

Expected: both tests pass.

- [ ] **Step 9: Run full test suite and type check**

```bash
npx jest --no-coverage 2>&1 | grep -E "PASS|FAIL|Tests:"
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: all clean.

- [ ] **Step 10: Commit**

```bash
git add app/detail/pressure.tsx app/_layout.tsx features/conditions/PressureCard.tsx features/conditions/ConditionsGrid.tsx app/(tabs)/index.tsx __tests__/PressureDetail.test.tsx
git commit -m "feat: add pressure detail modal with line chart and trend sentence"
```

---

### Task 11: Score timeline Pro lock on bar tap

**Files:**
- Modify: `features/score/ScoreTimeline.tsx`

- [ ] **Step 1: Add Pro lock tooltip to `ScoreTimeline.tsx`**

Add imports:
```typescript
import { TouchableOpacity, Modal, Pressable } from 'react-native'
import { useSettingsStore } from '../../store/settingsStore'
```

Inside `ScoreTimeline`, add state:
```typescript
const isPro = useSettingsStore(s => s.isPro)
const [tooltipVisible, setTooltipVisible] = useState(false)
```

Wrap each bar in a `TouchableOpacity` and add tooltip modal. Replace the `return` block of the existing map:

```typescript
{hourlyScores.map((item) => {
  const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
  const isPeak = item.score === maxScore
  const color = scoreColor(item.score)
  return (
    <TouchableOpacity
      key={item.hour}
      style={styles.barWrapper}
      onPress={() => { if (!isPro) setTooltipVisible(true) }}
      activeOpacity={isPro ? 1 : 0.7}
    >
      <Text style={styles.scoreLabel}>{isPeak ? item.score : ''}</Text>
      <View style={styles.barTrack}>
        <View style={[
          styles.bar,
          { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.7 },
        ]} />
      </View>
      <Text style={styles.hourLabel}>{item.hour}</Text>
    </TouchableOpacity>
  )
})}
```

Add a simple modal below the `ScrollView`, inside the container `View`:
```typescript
<Modal transparent visible={tooltipVisible} onRequestClose={() => setTooltipVisible(false)}>
  <Pressable style={styles.overlay} onPress={() => setTooltipVisible(false)}>
    <View style={styles.tooltip}>
      <Text style={styles.tooltipTitle}>Score Breakdown</Text>
      <Text style={styles.tooltipBody}>Detailed hourly score breakdown is a Pro feature.</Text>
      <Text style={styles.tooltipHint}>Tap anywhere to dismiss</Text>
    </View>
  </Pressable>
</Modal>
```

Add styles:
```typescript
overlay: {
  flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
  alignItems: 'center', justifyContent: 'center',
},
tooltip: {
  backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
  padding: Spacing.lg, margin: Spacing.xl, alignItems: 'center',
},
tooltipTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
tooltipBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
tooltipHint: { fontSize: 12, color: Colors.textTertiary, marginTop: Spacing.md },
```

- [ ] **Step 2: Run all tests**

```bash
npx jest --no-coverage 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add features/score/ScoreTimeline.tsx
git commit -m "feat: show Pro lock tooltip when tapping hourly score bars"
```

---

### Task 12: Add `getNearbyStations` to noaaStationService

**Files:**
- Modify: `services/noaaStationService.ts`
- Test: `__tests__/noaaStationService.test.ts`

- [ ] **Step 1: Write failing test**

In `__tests__/noaaStationService.test.ts`, add at the end of the file:

```typescript
const stationsFixture = require('./fixtures/noaaStations.json')

describe('getNearbyStations', () => {
  beforeEach(() => { global.fetch = jest.fn() })
  afterEach(() => { jest.resetAllMocks() })

  it('returns stations sorted by distance within radius', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => stationsFixture,
    })
    // San Francisco coords — nearby stations in the fixture should be within 150km
    const results = await getNearbyStations(37.8, -122.4, 150)
    expect(Array.isArray(results)).toBe(true)
    // All results should have required fields
    results.forEach(s => {
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('name')
      expect(s).toHaveProperty('lat')
      expect(s).toHaveProperty('lng')
    })
    // Results should be sorted by distance (ascending)
    if (results.length >= 2) {
      const d0 = haversineKm(37.8, -122.4, results[0].lat, results[0].lng)
      const d1 = haversineKm(37.8, -122.4, results[1].lat, results[1].lng)
      expect(d0).toBeLessThanOrEqual(d1)
    }
  })

  it('caps results at 20 stations', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => stationsFixture,
    })
    const results = await getNearbyStations(37.8, -122.4, 10000) // huge radius
    expect(results.length).toBeLessThanOrEqual(20)
  })

  it('returns empty array on fetch failure', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'))
    const results = await getNearbyStations(37.8, -122.4)
    expect(results).toEqual([])
  })
})
```

Also add the import at the top of the test file:
```typescript
import { resolveNearestStation, getNearbyStations, haversineKm } from '../services/noaaStationService'
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/noaaStationService.test.ts --no-coverage
```

Expected: FAIL — `getNearbyStations` not exported.

- [ ] **Step 3: Add `getNearbyStations` to `services/noaaStationService.ts`**

Add after the existing `resolveNearestStation` function:

```typescript
export interface NearbyStation {
  id: string
  name: string
  lat: number
  lng: number
}

export async function getNearbyStations(
  lat: number,
  lng: number,
  radiusKm = 150
): Promise<NearbyStation[]> {
  try {
    const res = await fetch(STATION_LIST_URL)
    if (!res.ok) return []
    const { stations } = await res.json()
    if (!stations?.length) return []

    const nearby: Array<NearbyStation & { dist: number }> = []

    for (const s of stations) {
      const sLat = parseFloat(s.lat)
      const sLng = parseFloat(s.lng)
      if (isNaN(sLat) || isNaN(sLng) || !s.id || !s.name) continue
      const dist = haversineKm(lat, lng, sLat, sLng)
      if (dist <= radiusKm) {
        nearby.push({ id: s.id, name: s.name, lat: sLat, lng: sLng, dist })
      }
    }

    return nearby
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 20)
      .map(({ dist: _dist, ...station }) => station)
  } catch {
    return []
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/noaaStationService.test.ts --no-coverage
```

Expected: all tests pass (including the existing 6 tests).

- [ ] **Step 5: Commit**

```bash
git add services/noaaStationService.ts __tests__/noaaStationService.test.ts
git commit -m "feat: add getNearbyStations to noaaStationService"
```

---

### Task 13: GPS centering and NOAA station markers on Add Spot

**Files:**
- Modify: `app/spot/new.tsx`

- [ ] **Step 1: Rewrite `app/spot/new.tsx` with GPS and station markers**

Replace the full file contents:

```typescript
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

  // Request GPS and load nearby stations on mount
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
        {/* User's selected pin */}
        <Marker
          coordinate={{ latitude: coords.lat, longitude: coords.lng }}
          pinColor={Colors.accent}
        />
        {/* NOAA station markers */}
        {stations.map(s => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            pinColor={Colors.ocean}
            title={s.name}
            description="Tap to use this station"
            onCalloutPress={() => handleStationPress(s)}
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
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/spot/new.tsx
git commit -m "feat: GPS centering and NOAA station markers on Add Spot screen"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|-----------------|------|
| Circle fishing score (gradient arc, score inside, animated) | Task 4 |
| "Fishing Score" label inside ring | Task 4 |
| Tab renamed Dashboard → Forecast | Task 5 |
| Wind stat card shows daily peak | Task 6 + 7 |
| Tide stat card shows next high event | Task 7 |
| Water card unit-aware (°C/°F) | Task 6 |
| Tide chart touch cursor showing height | Task 8 |
| Tide heights respect lengthUnit setting | Task 6 |
| Wind card tappable → wind detail modal | Tasks 6 + 9 |
| Wind modal: hourly bar chart with scrub | Task 9 |
| Wind modal: peak line | Task 9 |
| Wind speed unit-aware in modal | Task 9 |
| Pressure card tappable → pressure modal | Task 10 |
| Pressure modal: line chart with scrub | Task 10 |
| Pressure modal: trend sentence | Task 10 |
| Score bars: Pro lock tooltip | Task 11 |
| getNearbyStations returns sorted nearby stations | Task 12 |
| Add Spot: GPS centering on mount | Task 13 |
| Add Spot: NOAA station markers on map | Task 13 |
| Tap station marker → pre-fills name + coords | Task 13 |
| speedUnit conversion in WindDisplay | Task 6 |
| All services/types plumbed before UI tasks | Tasks 1–3 before Tasks 4–13 |
