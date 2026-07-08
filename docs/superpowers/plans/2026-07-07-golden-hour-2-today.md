# Golden Hour Redesign — Plan 2: Today screen & navigation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the verdict-first Today screen on the living sky, and restructure navigation to Today · Week · Species · Spots (settings behind a gear, catch log shelved).

**Architecture:** New `useSkyTheme` hook feeds `SkyBackground` (Plan 1). New `VerdictHero` (verdict + count-up score + Bite/Comfort chips + free expandable breakdown) and `BiteCurve` (24h SVG sparkline) components replace `ScoreDisplay`/summary-card/solunar-banner on the dashboard. The dashboard keeps its date-aware `useConditions(spot, selectedDate)` machinery — the calendar UI is removed, but `selectedDate` now comes from a route param so Plan 3's Week tab can deep-link into Today for any day. TideChart, ConditionsGrid, and ScoreTimeline remain below the fold unrestyled (accepted transitional mix) until the Conditions-consolidation plan.

**Tech Stack:** Expo SDK 54, expo-router v6 Tabs, TypeScript strict, reanimated, react-native-svg, Plan 1 modules (`theme/skyTheme.ts`, `theme/tokens.ts`, `features/score/verdict.ts`, `features/sky/SkyBackground.tsx`).

**Spec:** `docs/superpowers/specs/2026-07-07-golden-hour-redesign-design.md`

## Global Constraints

- Branch: `golden-hour-2` off current master (which contains merged PR #11 foundation). Verify `theme/skyTheme.ts` exists before starting; if missing, STOP — foundation not merged.
- Run `npx jest --no-coverage` AND `npx tsc --noEmit` before every commit. Only pre-existing TS error allowed is the `app/(tabs)/spots.tsx` route-typing error.
- No new npm dependencies.
- Copy (user-facing strings) must match this plan exactly.
- The 11px-uppercase-gray-label pattern is banned in new code (13px sentence case secondary text instead).
- Shelve, don't delete: `app/(tabs)/catchlog.tsx` and `app/(tabs)/settings.tsx` files stay; they leave the tab bar via `href: null`.

---

### Task 1: Navigation restructure + Week placeholder

**Files:**
- Rewrite: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/week.tsx`

**Interfaces:**
- Consumes: existing screens; `useForecast`, `ForecastStrip`, `useSettingsStore`, `useSpots` (all existing).
- Produces: tab order Today (`index`) · Week (`week`) · Species (`species`) · Spots (`spots`); `settings` and `catchlog` routes remain pushable but hidden (`href: null`). Plan 3 replaces `week.tsx`'s body entirely — keep it minimal.

- [ ] **Step 1: Rewrite `app/(tabs)/_layout.tsx` entirely with:**

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

type TabName = 'Today' | 'Week' | 'Species' | 'Spots';

const ICONS: Record<TabName, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Today: { focused: 'sunny', default: 'sunny-outline' },
  Week: { focused: 'calendar', default: 'calendar-outline' },
  Species: { focused: 'fish', default: 'fish-outline' },
  Spots: { focused: 'location', default: 'location-outline' },
};

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const icon = focused ? ICONS[name].focused : ICONS[name].default;
  return (
    <Ionicons
      name={icon}
      size={24}
      color={focused ? Colors.accent : Colors.textTertiary}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.background, borderTopColor: Colors.surface },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'Week',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Week" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="species"
        options={{
          title: 'Species',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Species" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="spots"
        options={{
          title: 'Spots',
          tabBarIcon: ({ focused }) => <TabIcon name="Spots" focused={focused} />,
        }}
      />
      {/* Shelved routes: reachable via router.push, hidden from the tab bar */}
      <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
      <Tabs.Screen name="catchlog" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Create `app/(tabs)/week.tsx` (placeholder — Plan 3 replaces the body):**

```tsx
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
```

- [ ] **Step 3: Remove the ForecastStrip from the dashboard**

In `app/(tabs)/index.tsx`: delete the `<ForecastStrip ... />` element (search for `ForecastStrip forecast=`) and the `import { ForecastStrip }` line. Keep the `useForecast` import and its hook call — Task 5 uses `forecast` for the better-day handoff. If `forecastLoading`/`forecastError` become unused, drop them from the destructuring.

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS (no tests target the tab layout; screen tests don't render the router).

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/_layout.tsx" "app/(tabs)/week.tsx" "app/(tabs)/index.tsx"
git commit -m "feat: 4-tab navigation (Today/Week/Species/Spots); shelve catch log and settings tabs"
```

---

### Task 2: useSkyTheme hook

**Files:**
- Create: `hooks/useSkyTheme.ts`
- Test: `__tests__/useSkyTheme.test.ts`

**Interfaces:**
- Consumes: `getSkyTheme`, `SkyTheme`, `SkyIcon` from `theme/skyTheme.ts`.
- Produces (Today/Week/Species/Spots screens use these):

```ts
export function resolveSkyDate(dateStr: string, repTime: string | undefined, now: Date): Date
export function useSkyTheme(
  spot: { lat: number; lng: number } | null,
  icon: SkyIcon | undefined,
  dateStr: string,          // 'YYYY-MM-DD' being viewed
  repTime?: string,          // representative time for non-today dates, e.g. bestWindow.start '6:00 PM'
): SkyTheme
```

Behavior: viewing today → live clock (re-renders each minute so the sky drifts in real time); other dates → fixed representative moment (`repTime` parsed, default noon). No spot → falls back to lat 39, lng -98 (US centroid) so the hook still returns a valid theme.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/useSkyTheme.test.ts`:

```ts
import { renderHook } from '@testing-library/react-native'
import { resolveSkyDate, useSkyTheme } from '../hooks/useSkyTheme'

describe('resolveSkyDate', () => {
  const NOW = new Date('2026-07-07T20:15:00Z')

  it('returns now when viewing today (local date of now)', () => {
    const todayStr = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}-${String(NOW.getDate()).padStart(2, '0')}`
    expect(resolveSkyDate(todayStr, '6:00 PM', NOW).getTime()).toBe(NOW.getTime())
  })

  it('uses the representative time for other dates', () => {
    const d = resolveSkyDate('2026-07-10', '6:00 PM', NOW)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(18)
  })

  it('handles 12 AM and 12 PM correctly', () => {
    expect(resolveSkyDate('2026-07-10', '12:00 AM', NOW).getHours()).toBe(0)
    expect(resolveSkyDate('2026-07-10', '12:00 PM', NOW).getHours()).toBe(12)
  })

  it('defaults to noon when no representative time is given', () => {
    expect(resolveSkyDate('2026-07-10', undefined, NOW).getHours()).toBe(12)
  })
})

describe('useSkyTheme', () => {
  it('returns a valid theme without a spot', () => {
    const { result } = renderHook(() => useSkyTheme(null, 'clear', '2026-07-10', '6:00 PM'))
    expect(result.current.gradientStops.length).toBeGreaterThanOrEqual(3)
    expect(result.current.tintedDark.background).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('returns a theme for a spot and icon', () => {
    const { result } = renderHook(() => useSkyTheme({ lat: 38.33, lng: -123.05 }, 'overcast', '2026-07-10', '6:00 PM'))
    expect(result.current.state).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/useSkyTheme.test.ts --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `hooks/useSkyTheme.ts`:

```ts
import { useEffect, useMemo, useState } from 'react'
import { getSkyTheme } from '../theme/skyTheme'
import type { SkyTheme, SkyIcon } from '../theme/skyTheme'

// US centroid fallback so the hook always returns a usable theme pre-spot.
const FALLBACK_LAT = 39
const FALLBACK_LNG = -98

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseHour(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 12
  let h = parseInt(m[1], 10)
  if (/pm/i.test(m[3]) && h !== 12) h += 12
  if (/am/i.test(m[3]) && h === 12) h = 0
  return h
}

export function resolveSkyDate(dateStr: string, repTime: string | undefined, now: Date): Date {
  if (dateStr === localDateKey(now)) return now
  const d = new Date(`${dateStr}T12:00:00`)
  d.setHours(repTime ? parseHour(repTime) : 12, 0, 0, 0)
  return d
}

export function useSkyTheme(
  spot: { lat: number; lng: number } | null,
  icon: SkyIcon | undefined,
  dateStr: string,
  repTime?: string,
): SkyTheme {
  const [now, setNow] = useState(() => new Date())
  const isToday = dateStr === localDateKey(now)

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [isToday])

  return useMemo(() => {
    const at = resolveSkyDate(dateStr, repTime, now)
    return getSkyTheme(at, spot?.lat ?? FALLBACK_LAT, spot?.lng ?? FALLBACK_LNG, icon)
  }, [spot?.lat, spot?.lng, icon, dateStr, repTime, now])
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/useSkyTheme.test.ts --no-coverage`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full suite and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add hooks/useSkyTheme.ts __tests__/useSkyTheme.test.ts
git commit -m "feat: useSkyTheme hook — live sky for today, representative moment for other days"
```

---

### Task 3: pickBetterDay helper + VerdictHero component

**Files:**
- Modify: `features/score/verdict.ts` (append `pickBetterDay`)
- Create: `features/score/VerdictHero.tsx`
- Test: `__tests__/verdict.test.ts` (append), `__tests__/VerdictHero.test.tsx`

**Interfaces:**
- Consumes: `computeAxes`, `getVerdict` (Plan 1); `scoreColor` from `features/score/scoringEngine.ts`; `Glass`, `Type` from `theme/tokens.ts`; `SkyTheme`; `expo-haptics`.
- Produces:

```ts
export function pickBetterDay(
  days: { date: string; dayLabel: string; peakScore: number }[] | undefined,
  todayScore: number,
  todayKey: string,
): { label: string; score: number } | null
// VerdictHero({ score, breakdown, spotType, skyTheme, summary, betterDay })
```

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/verdict.test.ts`:

```ts
import { pickBetterDay } from '../features/score/verdict'

describe('pickBetterDay', () => {
  const DAYS = [
    { date: '2026-07-07', dayLabel: 'Today', peakScore: 40 },
    { date: '2026-07-08', dayLabel: 'Wed', peakScore: 84 },
    { date: '2026-07-09', dayLabel: 'Thu', peakScore: 60 },
  ]

  it('returns the best future day when it beats today by 10+', () => {
    expect(pickBetterDay(DAYS, 40, '2026-07-07')).toEqual({ label: 'Wed', score: 84 })
  })

  it('returns null when no future day beats today by 10+', () => {
    expect(pickBetterDay(DAYS, 80, '2026-07-07')).toBeNull()
  })

  it('returns null for undefined or empty input', () => {
    expect(pickBetterDay(undefined, 40, '2026-07-07')).toBeNull()
    expect(pickBetterDay([], 40, '2026-07-07')).toBeNull()
  })
})
```

Create `__tests__/VerdictHero.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { VerdictHero } from '../features/score/VerdictHero'
import { getSkyTheme } from '../theme/skyTheme'
import type { ScoreBreakdown } from '../types/conditions'

const SKY = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear') // goldenPM
const GOOD: ScoreBreakdown = { pressure: 22, solunar: 18, tide: 16, wind: 12, waterTemp: 8, sky: 8 }

describe('VerdictHero', () => {
  it('renders the verdict phrase and bite/comfort chips', async () => {
    const { getByText, findByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY}
        summary="Falling pressure and a rising tide" betterDay={null} />
    )
    expect(getByText('Go — golden hour feed')).toBeTruthy()
    // bite = round(64/75*100) = 85, comfort = round(20/25*100) = 80
    expect(getByText('Bite 85')).toBeTruthy()
    expect(getByText('Comfort 80')).toBeTruthy()
    await findByText('84') // count-up settles on the real score
  })

  it('tapping the score toggles the free breakdown panel', async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY}
        summary="s" betterDay={null} />
    )
    expect(queryByTestId('hero-breakdown')).toBeNull()
    fireEvent.press(getByTestId('hero-score'))
    expect(getByTestId('hero-breakdown')).toBeTruthy()
    expect(getByText('Pressure')).toBeTruthy()
    expect(getByText('22 / 25')).toBeTruthy()
  })

  it('shows the better-day handoff when today is poor', () => {
    const POOR: ScoreBreakdown = { pressure: 5, solunar: 4, tide: 4, wind: 12, waterTemp: 4, sky: 8 }
    const { getByText } = render(
      <VerdictHero score={30} breakdown={POOR} spotType="saltwater" skyTheme={SKY}
        summary="s" betterDay={{ label: 'Wed', score: 84 }} />
    )
    expect(getByText('Save it for tomorrow')).toBeTruthy()
    expect(getByText('Wed looks great — 84')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/verdict.test.ts __tests__/VerdictHero.test.tsx --no-coverage`
Expected: FAIL — `pickBetterDay` not exported; VerdictHero module not found. (If the suite instead fails on the `expo-haptics` import under jest, add to `jest.setup.ts`: `jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(() => Promise.resolve()), ImpactFeedbackStyle: { Light: 'light' } }))` and note it in your report — sanctioned.)

- [ ] **Step 3: Append `pickBetterDay` to `features/score/verdict.ts`**

```ts
export function pickBetterDay(
  days: { date: string; dayLabel: string; peakScore: number }[] | undefined,
  todayScore: number,
  todayKey: string,
): { label: string; score: number } | null {
  if (!days || days.length === 0) return null
  let best: { label: string; score: number } | null = null
  for (const d of days) {
    if (d.date <= todayKey) continue
    if (!best || d.peakScore > best.score) best = { label: d.dayLabel, score: d.peakScore }
  }
  return best && best.score >= todayScore + 10 ? best : null
}
```

- [ ] **Step 4: Create `features/score/VerdictHero.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { computeAxes, getVerdict } from './verdict'
import { scoreColor } from './scoringEngine'
import { Glass, Radii, Type } from '../../theme/tokens'
import type { ScoreBreakdown } from '../../types/conditions'
import type { SkyTheme } from '../../theme/skyTheme'

interface Props {
  score: number                     // capped overall (conditions.fishingScore)
  breakdown: ScoreBreakdown
  spotType: 'saltwater' | 'freshwater'
  skyTheme: SkyTheme
  summary: string                   // one-line reason (buildConditionsSummary)
  betterDay: { label: string; score: number } | null
}

const FACTORS: { key: keyof ScoreBreakdown; label: string; max: number }[] = [
  { key: 'pressure', label: 'Pressure', max: 25 },
  { key: 'solunar', label: 'Solunar', max: 20 },
  { key: 'tide', label: 'Tide', max: 20 },
  { key: 'wind', label: 'Wind', max: 15 },
  { key: 'waterTemp', label: 'Water temp', max: 10 },
  { key: 'sky', label: 'Sky', max: 10 },
]

const COUNT_UP_MS = 600

export function VerdictHero({ score, breakdown, spotType, skyTheme, summary, betterDay }: Props) {
  const [display, setDisplay] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const start = Date.now()
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / COUNT_UP_MS)
      setDisplay(Math.round(score * t))
      if (t < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      }
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [score])

  const { bite, comfort } = computeAxes(breakdown, spotType)
  const verdict = getVerdict({ bite, comfort, overall: score, skyState: skyTheme.state, betterDay })

  return (
    <View style={styles.wrap}>
      <Text style={[Type.verdict, { color: skyTheme.accent }]}>{verdict.phrase}</Text>
      <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.85, marginTop: 4 }]}>
        {summary}
      </Text>

      <Pressable testID="hero-score" accessibilityRole="button" onPress={() => setExpanded(e => !e)}>
        <Text style={[Type.hero, { color: skyTheme.textTint, marginTop: 8 }]}>{display}</Text>
      </Pressable>

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={[Type.chip, { color: scoreColor(bite) }]}>Bite {bite}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={[Type.chip, { color: scoreColor(comfort) }]}>Comfort {comfort}</Text>
        </View>
      </View>

      {verdict.sub && (
        <Text style={[Type.secondary, { color: skyTheme.accent, marginTop: 8 }]}>{verdict.sub}</Text>
      )}

      {expanded && (
        <View testID="hero-breakdown" style={styles.panel}>
          {FACTORS.map(f => {
            const pts = breakdown[f.key]
            const ratio = Math.min(1, pts / f.max)
            return (
              <View key={f.key} style={styles.row}>
                <Text style={[Type.secondary, { color: skyTheme.textTint, width: 92 }]}>{f.label}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: scoreColor(ratio * 100) }]} />
                </View>
                <Text style={[Type.chip, { color: skyTheme.textTint, width: 52, textAlign: 'right' }]}>
                  {pts} / {f.max}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.6, marginTop: 6 }]}>
        {expanded ? 'Tap score to collapse' : 'Tap score to see why'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 20 },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chip: {
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  panel: {
    alignSelf: 'stretch',
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/verdict.test.ts __tests__/VerdictHero.test.tsx --no-coverage`
Expected: PASS.

- [ ] **Step 6: Run the full suite and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add features/score/verdict.ts features/score/VerdictHero.tsx __tests__/verdict.test.ts __tests__/VerdictHero.test.tsx jest.setup.ts
git commit -m "feat: VerdictHero — verdict, count-up score, bite/comfort chips, free breakdown"
```

(Omit `jest.setup.ts` if the haptics mock wasn't needed.)

---

### Task 4: BiteCurve component

**Files:**
- Create: `features/score/BiteCurve.tsx`
- Test: `__tests__/BiteCurve.test.tsx`

**Interfaces:**
- Consumes: `HourlyScore` (has `hourIndex` 0-23), `ConditionsData['bestWindow']` (`{ start, end, score, passed? }`, times like `'6:00 PM'`), `SkyTheme`; `react-native-svg`; reanimated.
- Produces: `BiteCurve({ hourlyScores, bestWindow, currentHour, skyTheme })` — glass card with smoothed 24h curve, best-window band (hidden when `passed`), NOW dot when `currentHour` is non-null.

- [ ] **Step 1: Write the failing test**

Create `__tests__/BiteCurve.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { BiteCurve } from '../features/score/BiteCurve'
import { getSkyTheme } from '../theme/skyTheme'
import type { HourlyScore } from '../types/conditions'

const SKY = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear')
const HOURS: HourlyScore[] = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'AM' : 'PM'}`,
  hourIndex: h,
  score: 40 + (h % 6) * 8,
}))
const WINDOW = { start: '6:00 PM', end: '8:00 PM', score: 80 }

describe('BiteCurve', () => {
  it('renders the curve, best-window band, and label', () => {
    const { getByTestId, getByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={WINDOW} currentHour={14} skyTheme={SKY} />
    )
    expect(getByTestId('bite-curve-path')).toBeTruthy()
    expect(getByTestId('bite-curve-band')).toBeTruthy()
    expect(getByText("Today's bite")).toBeTruthy()
    expect(getByText('Best 6:00 PM–8:00 PM')).toBeTruthy()
    expect(getByTestId('bite-curve-now')).toBeTruthy()
  })

  it('hides the band when the window has passed and the NOW dot when currentHour is null', () => {
    const { queryByTestId, getByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={{ ...WINDOW, passed: true }} currentHour={null} skyTheme={SKY} />
    )
    expect(queryByTestId('bite-curve-band')).toBeNull()
    expect(queryByTestId('bite-curve-now')).toBeNull()
    expect(getByText('Peak was 6:00 PM–8:00 PM')).toBeTruthy()
  })

  it('renders nothing with fewer than 2 points', () => {
    const { toJSON } = render(
      <BiteCurve hourlyScores={[]} bestWindow={WINDOW} currentHour={null} skyTheme={SKY} />
    )
    expect(toJSON()).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/BiteCurve.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `features/score/BiteCurve.tsx`:

```tsx
import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Rect, Circle } from 'react-native-svg'
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated'
import { Glass, Radii, Type } from '../../theme/tokens'
import type { HourlyScore, ConditionsData } from '../../types/conditions'
import type { SkyTheme } from '../../theme/skyTheme'

const AnimatedPath = Animated.createAnimatedComponent(Path)

interface Props {
  hourlyScores: HourlyScore[]
  bestWindow: ConditionsData['bestWindow']
  currentHour: number | null
  skyTheme: SkyTheme
}

const W = 320
const H = 84
const PAD = 6
// Estimated path length for the draw-in dash animation; longer than any real
// curve at this viewBox so the full path is always revealed.
const EST_LEN = 900

function parseHour(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1], 10)
  if (/pm/i.test(m[3]) && h !== 12) h += 12
  if (/am/i.test(m[3]) && h === 12) h = 0
  return h
}

function xFor(hour: number, n: number): number {
  return PAD + (hour / (n - 1)) * (W - PAD * 2)
}

function buildPath(scores: number[]): string {
  const n = scores.length
  const y = (s: number) => H - PAD - (s / 100) * (H - PAD * 2)
  let d = `M ${xFor(0, n).toFixed(1)} ${y(scores[0]).toFixed(1)}`
  for (let i = 1; i < n; i++) {
    const x = xFor(i, n)
    const px = xFor(i - 1, n)
    const cx = ((px + x) / 2).toFixed(1)
    d += ` C ${cx} ${y(scores[i - 1]).toFixed(1)}, ${cx} ${y(scores[i]).toFixed(1)}, ${x.toFixed(1)} ${y(scores[i]).toFixed(1)}`
  }
  return d
}

export function BiteCurve({ hourlyScores, bestWindow, currentHour, skyTheme }: Props) {
  const dash = useSharedValue(EST_LEN)

  useEffect(() => {
    dash.value = EST_LEN
    dash.value = withTiming(0, { duration: 900 })
  }, [dash])

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }))

  if (hourlyScores.length < 2) return null

  const n = hourlyScores.length
  const scores = hourlyScores.map(h => h.score)
  const path = buildPath(scores)
  const yFor = (s: number) => H - PAD - (s / 100) * (H - PAD * 2)

  const startH = parseHour(bestWindow.start)
  const endH = parseHour(bestWindow.end)
  const showBand = !bestWindow.passed && startH >= 0 && endH >= startH
  const bandX = xFor(startH, n)
  const bandW = Math.max(8, xFor(Math.min(endH + 1, n - 1), n) - bandX)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.85 }]}>Today's bite</Text>
        <Text style={[Type.chip, { color: skyTheme.accent }]}>
          {bestWindow.passed ? `Peak was ${bestWindow.start}–${bestWindow.end}` : `Best ${bestWindow.start}–${bestWindow.end}`}
        </Text>
      </View>
      <Svg viewBox={`0 0 ${W} ${H}`} style={styles.svg}>
        {showBand && (
          <Rect
            testID="bite-curve-band"
            x={bandX} y={2} width={bandW} height={H - 4} rx={6}
            fill={skyTheme.accent} opacity={0.16}
          />
        )}
        <AnimatedPath
          testID="bite-curve-path"
          d={path}
          fill="none"
          stroke={skyTheme.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${EST_LEN} ${EST_LEN}`}
          animatedProps={animatedProps}
        />
        {currentHour !== null && currentHour >= 0 && currentHour < n && (
          <Circle
            testID="bite-curve-now"
            cx={xFor(currentHour, n)} cy={yFor(scores[currentHour])} r={4}
            fill={skyTheme.textTint}
          />
        )}
      </Svg>
      <View style={styles.axisRow}>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12A</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>6A</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12P</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>6P</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12A</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  svg: { width: '100%', aspectRatio: W / H },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axis: { fontSize: 10, opacity: 0.55 },
})
```

- [ ] **Step 4: Run tests to verify they pass, then the full suite**

Run: `npx jest __tests__/BiteCurve.test.tsx --no-coverage` → PASS.
Run: `npx jest --no-coverage && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add features/score/BiteCurve.tsx __tests__/BiteCurve.test.tsx
git commit -m "feat: BiteCurve — 24h bite sparkline with best-window band and NOW dot"
```

---

### Task 5: Rebuild the Today screen

**Files:**
- Modify: `app/(tabs)/index.tsx` (major restructure of the render tree; keep the data plumbing)

**Interfaces:**
- Consumes: everything above, plus existing `useConditions(spot, selectedDate)`, `useForecast`, `buildConditionsSummary`, `TideChart`, `ConditionsGrid`, `ScoreTimeline`, skeletons, `tideTurnCountdown` (already in the file).
- Produces: the Today screen. `selectedDate` now reads `useLocalSearchParams<{ date?: string }>()` (default = today) so Plan 3's Week cards can `router.push({ pathname: '/(tabs)/', params: { date } })`. Keep the exported helpers/behavior tests rely on.

This task is careful surgery, not a paste-over. Work through these changes:

- [ ] **Step 1: Replace the calendar/date-chip state with a route param**

Remove the `showCalendar` state, the date-chip `TouchableOpacity`, and the `<DayCalendar ... />` block plus its import. Replace the `selectedDate` state with:

```ts
  const params = useLocalSearchParams<{ date?: string }>()
  const selectedDate = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : localDateKey(new Date())
```

(`useLocalSearchParams` comes from `expo-router`; add it to the existing import.) Delete `setSelectedDate` usages — day switching now happens via navigation params. Keep `formatDateChip` (used in the header).

- [ ] **Step 2: Wire the sky + verdict data**

Add imports:

```ts
import { useSkyTheme } from '../../hooks/useSkyTheme'
import { SkyBackground } from '../../features/sky/SkyBackground'
import { VerdictHero } from '../../features/score/VerdictHero'
import { BiteCurve } from '../../features/score/BiteCurve'
import { pickBetterDay } from '../../features/score/verdict'
```

Inside the component, after `useConditions`/`useForecast`:

```ts
  const skyTheme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    conditions?.sky.icon,
    selectedDate,
    conditions?.bestWindow.start,
  )
  const todayKey = localDateKey(new Date())
  const betterDay = conditions
    ? pickBetterDay(forecast, conditions.fishingScore, todayKey)
    : null
```

- [ ] **Step 3: Rebuild the render tree**

Wrap the whole screen in `SkyBackground`:

```tsx
  return (
    <SkyBackground theme={skyTheme}>
      <ScrollView ... existing refreshControl ...>
        {/* header */}
        {/* hero */}
        {/* curve */}
        {/* chips */}
        {/* kept sections */}
      </ScrollView>
    </SkyBackground>
  )
```

Header (replaces the old header + date chip):

```tsx
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View>
            <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.75 }]}>
              {formatDateChip(selectedDate)}
            </Text>
            <Text style={[Type.title, { color: skyTheme.textTint, fontSize: 18 }]}>
              {activeSpot?.name ?? 'FishCast'}
            </Text>
          </View>
          <TouchableOpacity
            testID="settings-gear"
            accessibilityRole="button"
            onPress={() => router.push('/settings')}
            style={styles.gear}
          >
            <Ionicons name="settings-outline" size={20} color={skyTheme.textTint} />
          </TouchableOpacity>
        </View>
```

When `conditions` is present, render in order:

```tsx
            <VerdictHero
              score={conditions.fishingScore}
              breakdown={conditions.scoreBreakdown}
              spotType={activeSpot.type}
              skyTheme={skyTheme}
              summary={buildConditionsSummary(conditions)}
              betterDay={betterDay}
            />
            <BiteCurve
              hourlyScores={conditions.hourlyScores}
              bestWindow={conditions.bestWindow}
              currentHour={selectedDate === todayKey ? new Date().getHours() : null}
              skyTheme={skyTheme}
            />
            <View style={styles.chipsRow}>
              {conditions.tide && (
                <View style={styles.conditionChip}>
                  <Text style={[Type.chip, { color: skyTheme.textTint }]}>
                    {conditions.tide.current.rising ? 'Tide rising' : 'Tide falling'}
                  </Text>
                  <Text style={[styles.chipSub, { color: skyTheme.textTint }]}>
                    {tideTurnCountdown(conditions.tide)}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.conditionChip}
                onPress={/* copy the existing WindDisplay onPress push to /detail/wind with its exact params object from the current file */}
              >
                <Text style={[Type.chip, { color: skyTheme.textTint }]}>
                  Wind {conditions.wind.speed} mph
                </Text>
                <Text style={[styles.chipSub, { color: skyTheme.textTint }]}>
                  {conditions.wind.directionLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.conditionChip} onPress={() => router.push('/(tabs)/species' as never)}>
                <Text style={[Type.chip, { color: skyTheme.accent }]}>What's biting</Text>
                <Text style={[styles.chipSub, { color: skyTheme.textTint }]}>
                  {conditions.water.estimated ? '~' : ''}{conditions.water.temp}° water
                </Text>
              </TouchableOpacity>
            </View>
```

Then the kept sections exactly as they exist today (transitional until the Conditions plan): `ScoreTimeline`, `TideChart`, `ConditionsGrid` with their current props. REMOVE from the render tree and imports: `ScoreDisplay`, the solunar banner block (and its `solunarNow` computation if now unused), the summary card `View`, the `WindDisplay`/quick-stats row, `ActiveRightNow` (species chip replaces it; the Species tab keeps the full component), `DayCalendar`, and (from Task 1) `ForecastStrip`.

New styles (add; delete styles that are no longer referenced — verify with a grep for each `styles.X` you remove):

```ts
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 4 },
  gear: { width: 34, height: 34, borderRadius: 17, backgroundColor: Glass.fill, borderWidth: 1, borderColor: Glass.stroke, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  conditionChip: { flex: 1, backgroundColor: Glass.fill, borderWidth: 1, borderColor: Glass.stroke, borderRadius: Radii.chip, padding: 10, alignItems: 'center' },
  chipSub: { fontSize: 11, opacity: 0.7, marginTop: 2 },
```

(Import `Glass`, `Radii`, `Type` from `../../theme/tokens`.) Loading/empty/error states keep their current logic but render inside the `SkyBackground` (empty state's copy unchanged).

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS. If any existing test imported something you removed from index.tsx, investigate — screen internals aren't directly tested on master, so failures here mean a real wiring mistake.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: verdict-first Today screen on the living sky"
```

---

### Task 6: Document Plan 2 in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the stale bits**

1. File Map: under `hooks/`, add `useSkyTheme.ts — live SkyTheme for today, fixed moment for other dates`; under `features/score/`, add `VerdictHero.tsx` and `BiteCurve.tsx` lines describing them; under `app/(tabs)/`, update `index.tsx`'s description to `Today screen — verdict hero, bite curve, condition chips on SkyBackground (date via ?date= param)` and add `week.tsx — Week tab (placeholder until Golden Hour Plan 3)`.
2. Update the tab list wherever CLAUDE.md describes navigation: tabs are now Today · Week · Species · Spots; settings/catchlog shelved behind `href: null`, settings reached via the Today header gear.
3. In the Golden Hour "What's Next" note, change "Until Plan 2 lands, no screen renders the new system." to "Plans 1–2 are live (Today + nav); Plan 3 (Week) and Plan 4 (working screens + Conditions consolidation) remain."

- [ ] **Step 2: Final check and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add CLAUDE.md
git commit -m "docs: document Today screen, useSkyTheme, and 4-tab navigation"
```
