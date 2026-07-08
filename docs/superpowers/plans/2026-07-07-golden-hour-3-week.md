# Golden Hour Redesign — Plan 3: Week screen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Week tab with the Golden Hour Week screen — seven day cards wearing per-day mini-skies, a best-day callout, a Pro teaser gate, and taps that deep-link into Today's `?date=` param.

**Architecture:** One new presentational component (`features/forecast/WeekDayCard.tsx` — dumb card, all strings/themes computed by the screen) plus a rebuilt `app/(tabs)/week.tsx` on the living sky. Mini-skies come from the existing pure pipeline: `resolveSkyDate(day.date, day.peakWindow.start, now)` → `getSkyTheme(...)` with the day's forecast `skyIcon`. `useForecast` gains a `refetch` passthrough. The old `ForecastStrip` loses its last consumer and is deleted along with its test.

**Tech Stack:** Expo SDK 54, TypeScript strict, `expo-linear-gradient`, Plan 1–2 modules (`theme/skyTheme.ts`, `theme/tokens.ts`, `hooks/useSkyTheme.ts` incl. exported `resolveSkyDate`, `features/sky/SkyBackground.tsx`).

**Spec:** `docs/superpowers/specs/2026-07-07-golden-hour-redesign-design.md` (Week section). One deliberate narrowing, per the user-approved mockup: day cards stay in **chronological order** with the best day marked by an amber ring + BEST tag and named in the header callout — no reordering/pinning.

## Global Constraints

- Branch: `golden-hour-3` off current master (contains merged Plans 1–2). Verify `hooks/useSkyTheme.ts` exists before starting; if missing, STOP.
- Run `npx jest --no-coverage` AND `npx tsc --noEmit` before every commit. Only pre-existing TS error allowed is the `app/(tabs)/spots.tsx` route-typing error.
- No new npm dependencies. Locked cards use opacity + a lock icon, NOT a blur (expo-blur is not installed).
- Copy (user-facing strings) must match this plan exactly. No 11px-uppercase-gray labels.
- Pro teaser gate: `FREE_DAYS = 2` (today + tomorrow free; later days locked, tap pushes `/settings`).

---

### Task 1: WeekDayCard component

**Files:**
- Create: `features/forecast/WeekDayCard.tsx`
- Test: `__tests__/WeekDayCard.test.tsx`

**Interfaces:**
- Consumes: `SkyTheme` from `theme/skyTheme.ts`; `Glass/Radii/Type/Accent` tokens; `scoreColor` from `features/score/scoringEngine.ts`; `expo-linear-gradient`.
- Produces (Task 2 renders a list of these):

```ts
WeekDayCard({
  dayLabel: string        // 'Today' | 'Wed' ...
  skyWord: string         // 'clear' | 'partly cloudy' | ...
  windowLabel: string     // 'Best 6:00 PM–8:00 PM'
  note: string            // 'High 72° · 20% rain' (already unit-converted by the screen)
  score: number
  miniSky: SkyTheme       // per-day theme for the swatch
  isBest: boolean
  locked: boolean
  textTint: string        // screen sky's text tint
  onPress: () => void     // ignored when locked (screen passes the upgrade push)
})
```

- [ ] **Step 1: Write the failing test**

Create `__tests__/WeekDayCard.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { WeekDayCard } from '../features/forecast/WeekDayCard'
import { getSkyTheme } from '../theme/skyTheme'

const MINI = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear')

const BASE = {
  dayLabel: 'Wed',
  skyWord: 'clear',
  windowLabel: 'Best 5:00 PM–7:00 PM',
  note: 'High 72° · 10% rain',
  score: 84,
  miniSky: MINI,
  isBest: false,
  locked: false,
  textTint: '#FFF8F0',
}

describe('WeekDayCard', () => {
  it('renders day, sky word, window, note, score, and the mini-sky swatch', () => {
    const { getByText, getByTestId } = render(<WeekDayCard {...BASE} onPress={() => {}} />)
    expect(getByText(/Wed/)).toBeTruthy()
    expect(getByText(/clear/)).toBeTruthy()
    expect(getByText(/Best 5:00 PM–7:00 PM/)).toBeTruthy()
    expect(getByText(/High 72° · 10% rain/)).toBeTruthy()
    expect(getByText('84')).toBeTruthy()
    expect(getByTestId('week-day-minisky')).toBeTruthy()
  })

  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<WeekDayCard {...BASE} onPress={onPress} />)
    fireEvent.press(getByTestId('week-day-card'))
    expect(onPress).toHaveBeenCalled()
  })

  it('shows the BEST tag only when isBest', () => {
    const { queryByText, rerender, getByText } = render(<WeekDayCard {...BASE} onPress={() => {}} />)
    expect(queryByText('BEST')).toBeNull()
    rerender(<WeekDayCard {...BASE} isBest onPress={() => {}} />)
    expect(getByText('BEST')).toBeTruthy()
  })

  it('locked card hides details, shows the Pro lock, and still fires onPress (upgrade)', () => {
    const onPress = jest.fn()
    const { getByText, queryByText, getByTestId } = render(
      <WeekDayCard {...BASE} locked onPress={onPress} />
    )
    expect(getByText(/Wed/)).toBeTruthy()
    expect(getByText('Unlock with Pro')).toBeTruthy()
    expect(queryByText('84')).toBeNull()
    expect(queryByText(/Best 5:00 PM/)).toBeNull()
    fireEvent.press(getByTestId('week-day-card'))
    expect(onPress).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/WeekDayCard.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `features/forecast/WeekDayCard.tsx`:

```tsx
import React from 'react'
import { Pressable, View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Glass, Radii, Type, Accent } from '../../theme/tokens'
import { scoreColor } from '../score/scoringEngine'
import type { SkyTheme } from '../../theme/skyTheme'

interface Props {
  dayLabel: string
  skyWord: string
  windowLabel: string
  note: string
  score: number
  miniSky: SkyTheme
  isBest: boolean
  locked: boolean
  textTint: string
  onPress: () => void
}

export function WeekDayCard({
  dayLabel, skyWord, windowLabel, note, score, miniSky, isBest, locked, textTint, onPress,
}: Props) {
  return (
    <Pressable
      testID="week-day-card"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isBest && styles.best,
        locked && styles.locked,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {isBest && !locked && (
        <View style={styles.bestTag}>
          <Text style={styles.bestTagText}>BEST</Text>
        </View>
      )}
      {locked ? (
        <View style={[styles.mini, styles.miniLocked]} />
      ) : (
        <LinearGradient
          testID="week-day-minisky"
          colors={miniSky.gradientStops as [string, string, ...string[]]}
          style={styles.mini}
        />
      )}
      <View style={styles.body}>
        <Text style={[Type.title, { color: textTint, fontSize: 14 }, locked && styles.dim]}>
          {dayLabel}
          {!locked && <Text style={{ opacity: 0.65 }}> · {skyWord}</Text>}
        </Text>
        <Text style={[Type.secondary, { color: textTint, opacity: locked ? 0.4 : 0.75 }]}>
          {locked ? 'Unlock with Pro' : `${windowLabel} · ${note}`}
        </Text>
      </View>
      {locked ? (
        <Ionicons name="lock-closed" size={16} color={Accent.warm} />
      ) : (
        <Text style={[Type.dataLg, { color: scoreColor(score) }]}>{score}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  best: { borderColor: Glass.strokeStrong, borderWidth: 1.5 },
  locked: { opacity: 0.75 },
  dim: { opacity: 0.5 },
  mini: { width: 44, height: 44, borderRadius: 12 },
  miniLocked: { backgroundColor: 'rgba(255,255,255,0.08)' },
  body: { flex: 1 },
  bestTag: {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: Accent.warm,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  bestTagText: { fontSize: 9, fontWeight: '800', color: '#3A2A16' },
})
```

- [ ] **Step 4: Run tests to verify they pass, then the full suite**

Run: `npx jest __tests__/WeekDayCard.test.tsx --no-coverage` → PASS (4 tests).
Run: `npx jest --no-coverage && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add features/forecast/WeekDayCard.tsx __tests__/WeekDayCard.test.tsx
git commit -m "feat: WeekDayCard — mini-sky day card with best tag and Pro lock"
```

---

### Task 2: Week screen on the living sky

**Files:**
- Modify: `hooks/useForecast.ts` (add `refetch` passthrough)
- Rewrite: `app/(tabs)/week.tsx`
- Delete: `features/forecast/ForecastStrip.tsx`, `__tests__/ForecastStrip.test.tsx`

**Interfaces:**
- Consumes: `useForecast` (now `{ data, isLoading, isError, refetch }`), `useSkyTheme` + exported `resolveSkyDate`, `getSkyTheme`, `SkyBackground`, `WeekDayCard`, `useSettingsStore` (`isPro`, `tempUnit`), `DayForecast` (`{ date, dayLabel, peakScore, scoreLabel, peakWindow, skyIcon?, highTemp?, rainChance? }`).
- Produces: the Week tab. Day taps push `{ pathname: '/(tabs)/', params: { date: day.date } }` (cast `as never` — repo pattern); locked taps push `/settings`.

- [ ] **Step 1: Add `refetch` to `useForecast`**

In `hooks/useForecast.ts`, add `refetch: () => void` to `UseForecastResult` and `refetch: query.refetch` to the returned object. (The dashboard destructures only `data` — additive, safe.)

- [ ] **Step 2: Rewrite `app/(tabs)/week.tsx` entirely with:**

```tsx
import React from 'react'
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSpots } from '../../hooks/useSpots'
import { useForecast } from '../../hooks/useForecast'
import { useSettingsStore } from '../../store/settingsStore'
import { useSkyTheme, resolveSkyDate } from '../../hooks/useSkyTheme'
import { getSkyTheme } from '../../theme/skyTheme'
import { SkyBackground } from '../../features/sky/SkyBackground'
import { WeekDayCard } from '../../features/forecast/WeekDayCard'
import { Glass, Radii, Type, Accent } from '../../theme/tokens'
import { Colors } from '../../theme/colors'
import type { SkyIcon } from '../../theme/skyTheme'

const FREE_DAYS = 2

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

export default function WeekScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { activeSpot } = useSpots()
  const isPro = useSettingsStore(s => s.isPro)
  const tempUnit = useSettingsStore(s => s.tempUnit)
  const { data: forecast, isLoading, isError, refetch } = useForecast(activeSpot)

  const todayKey = localDateKey(new Date())
  const skyTheme = useSkyTheme(
    activeSpot ? { lat: activeSpot.lat, lng: activeSpot.lng } : null,
    forecast?.[0]?.skyIcon,
    todayKey,
  )
  const tint = skyTheme.textTint

  const best = forecast && forecast.length > 0
    ? forecast.reduce((a, b) => (b.peakScore > a.peakScore ? b : a))
    : null

  const formatTemp = (f: number) => (tempUnit === 'C' ? Math.round((f - 32) * 5 / 9) : f)

  return (
    <SkyBackground theme={skyTheme}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={!!forecast && isLoading} onRefresh={refetch} tintColor={Colors.accent} />}
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

        {activeSpot && isError && !forecast && (
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

        {activeSpot && forecast && forecast.map((day, i) => {
          const locked = !isPro && i >= FREE_DAYS
          const miniAt = resolveSkyDate(day.date, day.peakWindow.start, new Date())
          const miniSky = getSkyTheme(miniAt, activeSpot.lat, activeSpot.lng, day.skyIcon as SkyIcon | undefined)
          const noteParts: string[] = []
          if (day.highTemp != null) noteParts.push(`High ${formatTemp(day.highTemp)}°`)
          if (day.rainChance != null) noteParts.push(`${day.rainChance}% rain`)
          return (
            <WeekDayCard
              key={day.date}
              dayLabel={day.dayLabel}
              skyWord={SKY_WORD[day.skyIcon ?? ''] ?? 'mixed sky'}
              windowLabel={`Best ${day.peakWindow.start}–${day.peakWindow.end}`}
              note={noteParts.join(' · ') || day.scoreLabel}
              score={day.peakScore}
              miniSky={miniSky}
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

        {activeSpot && forecast && !isPro && forecast.length > FREE_DAYS && (
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
```

- [ ] **Step 3: Delete the ForecastStrip**

`git rm features/forecast/ForecastStrip.tsx __tests__/ForecastStrip.test.tsx`
Then verify nothing references it: `grep -rn "ForecastStrip" app features hooks services __tests__ --include="*.ts*"` → expected: no output. If anything appears, STOP and report it instead of force-deleting.

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS (ForecastStrip suite removed; totals drop accordingly — that is expected, note old/new totals in your report).

- [ ] **Step 5: Commit**

```bash
git add -A hooks/useForecast.ts "app/(tabs)/week.tsx" features/forecast __tests__
git commit -m "feat: Week screen — mini-sky day cards, best-day callout, Pro teaser gate"
```

---

### Task 3: Document Plan 3 in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update**

1. File Map: replace the `week.tsx` placeholder line with `week.tsx — Week tab: WeekDayCard list with per-day mini-skies, best-day callout, FREE_DAYS=2 teaser gate, taps deep-link Today ?date=`; under `features/forecast/`, remove the `ForecastStrip.tsx` line and add `WeekDayCard.tsx`.
2. If a "Teaser gate" bullet exists under Key Patterns, update it to describe the Week screen's `FREE_DAYS = 2` gate (locked taps push `/settings`); if it references `ProWaitlistSheet` or `ForecastStrip`, correct it — neither exists anymore.
3. Golden Hour What's Next note: "Plans 1–3 are live (foundation, Today + nav, Week); Plan 4 (Species/Spots restyle + Conditions consolidation) remains, then the dynamic species roster."

- [ ] **Step 2: Final check and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit` → PASS.

```bash
git add CLAUDE.md
git commit -m "docs: document Week screen and retire ForecastStrip"
```
