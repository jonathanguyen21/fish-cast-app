# FishCast UX Overhaul — Phase 3: Score Explainability, Species Coverage, Onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the score explainable (free factor-breakdown sheet), make "What's Biting" work everywhere in the US (northeast, southeast/Gulf, freshwater species data + fixed region routing), and give first-time users a direct path to their first spot.

**Architecture:** `calculateScoreBreakdown()` becomes the single source of truth in the scoring engine (`calculateScore` delegates to it), breakdowns ride along on `HourlyScore`, and a reusable bottom sheet renders them. Species data files follow the exact `westCoast.ts` pattern. **The species arrays in Tasks 5–7 are authored content — transcribe them exactly; do not invent, "improve", or extend the biology.**

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript strict, Jest + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-01-ux-overhaul-design.md` (Phase 3 section).

**Prerequisite:** Phase 1 and Phase 2 plans fully merged (relies on `HourlyScore.hourIndex`, 24-hour scoring, `ScoreTimeline` `currentHour`/`title` props, `ConditionsData.water.estimated`).

## Global Constraints

- Run `npx jest --no-coverage` AND `npx tsc --noEmit` before every commit. Both must be clean.
- Known pre-existing TS error `app/(tabs)/spots.tsx(63,27)` is expected — do NOT fix it, do NOT introduce new errors.
- No new npm dependencies.
- Dark theme only; use `Colors.*` / `Spacing.*` constants.
- Copy (user-facing strings) must match this plan exactly.
- Species data: transcribe the arrays in Tasks 5–7 verbatim. If a value looks wrong to you, transcribe it anyway and note it in your report — do not change fish biology unilaterally.

---

### Task 1: `calculateScoreBreakdown` in the scoring engine

**Files:**
- Modify: `types/conditions.ts` (new types)
- Modify: `features/score/scoringEngine.ts`
- Test: `__tests__/scoringEngine.test.ts`

**Interfaces:**
- Produces (exact — Tasks 2–3 depend on every name):

```ts
// in types/conditions.ts
export interface ScoreFactor {
  key: 'pressure' | 'solunar' | 'tide' | 'wind' | 'waterTemp' | 'sky'
  label: string
  points: number
  max: number
  note: string
}
export interface ScoreBreakdown {
  total: number
  factors: ScoreFactor[]
  scaled: boolean          // true for freshwater (80-pt base scaled to 100)
  capNote: string | null   // set when a severe-condition cap lowered the total
}
```

```ts
// in scoringEngine.ts
export function calculateScoreBreakdown(inputs: ScoringInputs): ScoreBreakdown
// calculateScore(inputs) now returns calculateScoreBreakdown(inputs).total — all existing tests must keep passing unchanged
```

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/scoringEngine.test.ts` (do not modify any existing test — they are the regression guard; copy the file's existing helper for building `ScoringInputs` if one exists, otherwise use this baseline):

```ts
import { calculateScore, calculateScoreBreakdown } from '../features/score/scoringEngine'
import type { ScoringInputs } from '../features/score/scoringEngine'

const BASE: ScoringInputs = {
  pressure: { value: 29.95, trend: 'falling', rate: 'slow' },
  solunar: { inMajorPeriod: true, inMinorPeriod: false, withinHourOfPeriod: false, isMajorMoonDay: false },
  tide: { phase: 'incoming', hoursFromTurn: 4 },
  wind: { speed: 8 },
  waterTemp: { value: 60, spotType: 'saltwater' },
  sky: { condition: 'overcast' },
  spotType: 'saltwater',
}

describe('calculateScoreBreakdown', () => {
  it('total equals calculateScore for identical inputs', () => {
    expect(calculateScoreBreakdown(BASE).total).toBe(calculateScore(BASE))
  })

  it('saltwater factors sum to the total when no cap applies', () => {
    const b = calculateScoreBreakdown(BASE)
    expect(b.scaled).toBe(false)
    expect(b.capNote).toBeNull()
    expect(b.factors.map(f => f.key)).toEqual(['pressure', 'solunar', 'tide', 'wind', 'waterTemp', 'sky'])
    const sum = b.factors.reduce((s, f) => s + f.points, 0)
    expect(sum).toBe(b.total)
  })

  it('freshwater breakdown omits tide and marks scaled', () => {
    const fresh: ScoringInputs = { ...BASE, tide: null, spotType: 'freshwater', waterTemp: { value: 65, spotType: 'freshwater' } }
    const b = calculateScoreBreakdown(fresh)
    expect(b.scaled).toBe(true)
    expect(b.factors.find(f => f.key === 'tide')).toBeUndefined()
    const sum = b.factors.reduce((s, f) => s + f.points, 0)
    expect(b.total).toBe(Math.min(100, Math.round(sum * (100 / 80))))
  })

  it('dangerous wind caps the total and sets capNote', () => {
    const windy: ScoringInputs = { ...BASE, wind: { speed: 30 } }
    const b = calculateScoreBreakdown(windy)
    expect(b.total).toBeLessThanOrEqual(35)
    expect(b.capNote).toBe('Dangerous wind caps the score at 35')
  })

  it('every factor carries a plain-English note', () => {
    for (const f of calculateScoreBreakdown(BASE).factors) {
      expect(f.note.length).toBeGreaterThan(10)
      expect(f.max).toBeGreaterThan(0)
      expect(f.points).toBeLessThanOrEqual(f.max)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/scoringEngine.test.ts --no-coverage`
Expected: FAIL — `calculateScoreBreakdown` not exported.

- [ ] **Step 3: Add the types**

In `types/conditions.ts`, add above `HourlyScore`:

```ts
export interface ScoreFactor {
  key: 'pressure' | 'solunar' | 'tide' | 'wind' | 'waterTemp' | 'sky'
  label: string
  points: number
  max: number
  note: string
}

export interface ScoreBreakdown {
  total: number
  factors: ScoreFactor[]
  scaled: boolean
  capNote: string | null
}
```

- [ ] **Step 4: Implement in `features/score/scoringEngine.ts`**

Add at the top:

```ts
import type { ScoreBreakdown, ScoreFactor } from '../../types/conditions'
```

Add these note helpers after the existing point functions:

```ts
function pressureNote(p: ScoringInputs['pressure']): string {
  if (p.trend === 'falling' && p.rate === 'slow') return 'Falling slowly — prime feeding trigger'
  if (p.trend === 'falling' && p.rate === 'fast') return 'Falling fast — storm close, short bite window'
  if (p.trend === 'falling') return 'Falling — fish feed ahead of weather'
  if (p.trend === 'stable' && p.value > 30.10) return 'High and steady — settled conditions'
  if (p.trend === 'stable') return 'Steady — neutral effect'
  if (p.rate === 'slow') return 'Rising slowly — post-front recovery'
  if (p.rate === 'fast') return 'Rising fast — toughest pressure pattern'
  return 'Rising — fish adjusting, slower bite'
}

function solunarNote(s: ScoringInputs['solunar']): string {
  if (s.inMajorPeriod) return 'Major solunar period — peak moon-driven activity'
  if (s.inMinorPeriod) return 'Minor solunar period — elevated activity'
  if (s.withinHourOfPeriod) return 'Within an hour of a solunar period'
  return 'No solunar period near this hour'
}

function tideNote(t: NonNullable<ScoringInputs['tide']>): string {
  if (t.phase === 'slack') return 'Slack tide — little water movement'
  if (t.phase === 'incoming') {
    if (t.hoursFromTurn <= 1) return 'Tide just turned in — current building'
    if (t.hoursFromTurn >= 4) return 'Late incoming — strong water movement'
    return 'Mid-incoming — good water movement'
  }
  if (t.hoursFromTurn <= 2) return 'Early outgoing — bait flushing out'
  return 'Late outgoing — current slowing'
}

function windNote(speed: number): string {
  if (speed > 25) return 'Dangerous wind — stay off the water'
  if (speed > 18) return 'Strong wind — tough conditions'
  if (speed > 12) return 'Breezy — manageable'
  if (speed >= 5) return 'Light chop — ideal'
  return 'Flat calm — fish get spooky'
}

function waterTempNote(wt: ScoringInputs['waterTemp']): string {
  const [min, max] = wt.spotType === 'saltwater' ? [52, 72] : [58, 78]
  if (wt.value >= min && wt.value <= max) return 'In the productive temperature range'
  if (wt.value >= min - 5 && wt.value <= max + 5) return 'Slightly outside the ideal temperature range'
  return 'Well outside the ideal temperature range'
}

function skyNote(c: ScoringInputs['sky']['condition']): string {
  switch (c) {
    case 'overcast': return 'Overcast — low light keeps fish shallow'
    case 'partly-cloudy': return 'Partly cloudy — decent light conditions'
    case 'light-rain': return 'Light rain — often improves the bite'
    case 'clear': return 'Bright sun — fish hold deeper'
    case 'heavy-rain': return 'Heavy rain — hard on visibility and safety'
  }
}
```

Then replace the existing `calculateScore` function with:

```ts
export function calculateScoreBreakdown(inputs: ScoringInputs): ScoreBreakdown {
  const hasTide = inputs.tide !== null && inputs.spotType === 'saltwater'

  const factors: ScoreFactor[] = [
    { key: 'pressure', label: 'Pressure', points: pressurePoints(inputs.pressure), max: 25, note: pressureNote(inputs.pressure) },
    { key: 'solunar', label: 'Solunar', points: solunarPoints(inputs.solunar), max: 20, note: solunarNote(inputs.solunar) },
    ...(hasTide
      ? [{ key: 'tide' as const, label: 'Tide', points: tidePoints(inputs.tide!), max: 20, note: tideNote(inputs.tide!) }]
      : []),
    { key: 'wind', label: 'Wind', points: windPoints(inputs.wind.speed), max: 15, note: windNote(inputs.wind.speed) },
    { key: 'waterTemp', label: 'Water Temp', points: waterTempPoints(inputs.waterTemp), max: 10, note: waterTempNote(inputs.waterTemp) },
    { key: 'sky', label: 'Sky', points: skyPoints(inputs.sky.condition), max: 10, note: skyNote(inputs.sky.condition) },
  ]

  const base = factors.reduce((sum, f) => sum + f.points, 0)

  // Freshwater: no tide (20pts missing) — scale up to 100
  let total = hasTide ? base : Math.round(base * (100 / 80))

  // Apply severe-condition penalties: dangerous wind or heavy rain cap the score
  let capNote: string | null = null
  if (inputs.wind.speed > 25 && total > 35) {
    total = 35
    capNote = 'Dangerous wind caps the score at 35'
  }
  if (inputs.sky.condition === 'heavy-rain' && total > 45) {
    total = 45
    capNote = capNote ?? 'Heavy rain caps the score at 45'
  }
  total = Math.min(100, Math.max(0, total))

  return { total, factors, scaled: !hasTide, capNote }
}

export function calculateScore(inputs: ScoringInputs): number {
  return calculateScoreBreakdown(inputs).total
}
```

- [ ] **Step 5: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS — including every pre-existing `scoringEngine.test.ts` test, unchanged.

- [ ] **Step 6: Commit**

```bash
git add types/conditions.ts features/score/scoringEngine.ts __tests__/scoringEngine.test.ts
git commit -m "feat: calculateScoreBreakdown exposes per-factor points and notes"
```

---

### Task 2: Attach breakdowns to conditions data

**Files:**
- Modify: `types/conditions.ts` (`HourlyScore.breakdown?`, `ConditionsData.currentBreakdown`)
- Modify: `services/scoringService.ts`
- Modify: `services/forecastService.ts`
- Modify: `data/mockData.ts`
- Test: `__tests__/scoringService.test.ts`

**Interfaces:**
- Consumes: `calculateScoreBreakdown` (Task 1).
- Produces:
  - `HourlyScore` gains optional `breakdown?: ScoreBreakdown`
  - `ConditionsData` gains required `currentBreakdown: ScoreBreakdown`
  - `buildConditionsData` and `buildForecastDays` populate `breakdown` on every hourly entry.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/scoringService.test.ts`:

```ts
  it('attaches a breakdown to the current score and every hourly score', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.currentBreakdown.total).toBe(result.fishingScore)
    expect(result.currentBreakdown.factors.length).toBeGreaterThanOrEqual(5)
    for (const h of result.hourlyScores) {
      expect(h.breakdown).toBeDefined()
      expect(h.breakdown!.total).toBe(h.score)
    }
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/scoringService.test.ts --no-coverage`
Expected: FAIL.

- [ ] **Step 3: Update types**

In `types/conditions.ts`:

```ts
export interface HourlyScore {
  hour: string
  hourIndex: number
  score: number
  breakdown?: ScoreBreakdown
}
```

and add to `ConditionsData` (after `scoreLabel`):

```ts
  currentBreakdown: ScoreBreakdown
```

- [ ] **Step 4: Populate in `services/scoringService.ts`**

1. Change the scoringEngine import line to include the new function:

```ts
import { calculateScore, calculateScoreBreakdown, scoreLabel } from '../features/score/scoringEngine'
```

2. Replace the `const currentScore = calculateScore({ ... })` block with:

```ts
  const currentBreakdown = calculateScoreBreakdown({
    ...baseInputs,
    solunar: solunar,
    wind: { speed: wind.speed },
    sky: { condition: sky.icon },
  })
  const currentScore = currentBreakdown.total
```

3. In the 24-hour loop, replace the `hourlyScores.push({...})` call so each entry computes one breakdown:

```ts
    const hourBreakdown = calculateScoreBreakdown({
      pressure: { value: pressure.value, trend: pressure.trend, rate: pressure.rate },
      tide: hourTide,
      waterTemp: { value: waterTempValue, spotType: spot.type },
      spotType: spot.type,
      solunar: hourSolunar,
      wind: { speed: hourWind.speed },
      sky: { condition: hourSky.icon },
    })
    hourlyScores.push({
      hour: formatHourLabel(h),
      hourIndex: h,
      score: hourBreakdown.total,
      breakdown: hourBreakdown,
    })
```

4. Add `currentBreakdown,` to the returned object (next to `fishingScore`).

- [ ] **Step 5: Populate in `services/forecastService.ts`**

Change the scoringEngine import to `calculateScoreBreakdown` (drop `calculateScore` if now unused) and replace the `hourlyScores.push({ ... score: calculateScore({...}) })` block with:

```ts
      const hourBreakdown = calculateScoreBreakdown({
        pressure: { value: NEUTRAL_PRESSURE.value, trend: NEUTRAL_PRESSURE.trend, rate: NEUTRAL_PRESSURE.rate },
        tide: curve
          ? { phase: detectPhase(curve, h), hoursFromTurn: hoursFromLastTurn(curve, h) }
          : null,
        waterTemp: { value: spot.type === 'saltwater' ? 65 : 68, spotType: spot.type },
        spotType: spot.type,
        solunar: getHourlySolunar(solunar, h),
        wind: { speed: period ? period.windSpeed : NEUTRAL_WIND.speed },
        sky: { condition: period ? skyIconFor(period.cloudCover, period.rainChance) : 'partly-cloudy' },
      })
      hourlyScores.push({
        hour: formatHourLabel(h),
        hourIndex: h,
        score: hourBreakdown.total,
        breakdown: hourBreakdown,
      })
```

- [ ] **Step 6: Fix `data/mockData.ts`**

`ConditionsData` now requires `currentBreakdown`. Add after `scoreLabel`:

```ts
  currentBreakdown: {
    total: 82,
    scaled: false,
    capNote: null,
    factors: [
      { key: 'pressure', label: 'Pressure', points: 25, max: 25, note: 'Falling slowly — prime feeding trigger' },
      { key: 'solunar', label: 'Solunar', points: 14, max: 20, note: 'Minor solunar period — elevated activity' },
      { key: 'tide', label: 'Tide', points: 15, max: 20, note: 'Mid-incoming — good water movement' },
      { key: 'wind', label: 'Wind', points: 15, max: 15, note: 'Light chop — ideal' },
      { key: 'waterTemp', label: 'Water Temp', points: 10, max: 10, note: 'In the productive temperature range' },
      { key: 'sky', label: 'Sky', points: 8, max: 10, note: 'Partly cloudy — decent light conditions' },
    ],
  },
```

- [ ] **Step 7: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add types/conditions.ts services/scoringService.ts services/forecastService.ts data/mockData.ts __tests__/scoringService.test.ts
git commit -m "feat: attach score breakdowns to current and hourly scores"
```

---

### Task 3: ScoreBreakdownSheet — free for everyone

Replaces the Pro-lock tooltip. Tapping the score dial or any hourly bar shows the factor bars.

**Files:**
- Create: `features/score/ScoreBreakdownSheet.tsx`
- Modify: `features/score/ScoreTimeline.tsx` (replace tooltip with sheet, drop `isPro`)
- Modify: `features/score/ScoreDisplay.tsx` (tap dial opens sheet)
- Modify: `app/(tabs)/index.tsx` (pass `currentBreakdown`)
- Create: `__tests__/ScoreBreakdownSheet.test.tsx`

**Interfaces:**
- Consumes: `ScoreBreakdown`, `HourlyScore.breakdown` (Task 2).
- Produces: `ScoreBreakdownSheet({ visible, onClose, title, breakdown }: { visible: boolean; onClose: () => void; title: string; breakdown: ScoreBreakdown | null })`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/ScoreBreakdownSheet.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { ScoreBreakdownSheet } from '../features/score/ScoreBreakdownSheet'
import type { ScoreBreakdown } from '../types/conditions'

const BREAKDOWN: ScoreBreakdown = {
  total: 72,
  scaled: false,
  capNote: null,
  factors: [
    { key: 'pressure', label: 'Pressure', points: 25, max: 25, note: 'Falling slowly — prime feeding trigger' },
    { key: 'solunar', label: 'Solunar', points: 5, max: 20, note: 'No solunar period near this hour' },
    { key: 'tide', label: 'Tide', points: 20, max: 20, note: 'Late incoming — strong water movement' },
    { key: 'wind', label: 'Wind', points: 15, max: 15, note: 'Light chop — ideal' },
    { key: 'waterTemp', label: 'Water Temp', points: 10, max: 10, note: 'In the productive temperature range' },
    { key: 'sky', label: 'Sky', points: 5, max: 10, note: 'Bright sun — fish hold deeper' },
  ],
}

describe('ScoreBreakdownSheet', () => {
  it('renders a row per factor with points and note', () => {
    const { getAllByTestId, getByText } = render(
      <ScoreBreakdownSheet visible onClose={() => {}} title="Right now — Score 72" breakdown={BREAKDOWN} />
    )
    expect(getAllByTestId('factor-row')).toHaveLength(6)
    expect(getByText('Right now — Score 72')).toBeTruthy()
    expect(getByText('Falling slowly — prime feeding trigger')).toBeTruthy()
    expect(getByText('25/25')).toBeTruthy()
  })

  it('shows the cap note when present', () => {
    const capped = { ...BREAKDOWN, total: 35, capNote: 'Dangerous wind caps the score at 35' }
    const { getByText } = render(
      <ScoreBreakdownSheet visible onClose={() => {}} title="3PM — Score 35" breakdown={capped} />
    )
    expect(getByText('Dangerous wind caps the score at 35')).toBeTruthy()
  })

  it('renders nothing when breakdown is null', () => {
    const { queryAllByTestId } = render(
      <ScoreBreakdownSheet visible onClose={() => {}} title="" breakdown={null} />
    )
    expect(queryAllByTestId('factor-row')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/ScoreBreakdownSheet.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `features/score/ScoreBreakdownSheet.tsx`**

```tsx
import React from 'react'
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { ScoreBreakdown } from '../../types/conditions'

interface Props {
  visible: boolean
  onClose: () => void
  title: string
  breakdown: ScoreBreakdown | null
}

function barColor(ratio: number): string {
  if (ratio >= 0.7) return Colors.success
  if (ratio >= 0.4) return Colors.warning
  return Colors.danger
}

export function ScoreBreakdownSheet({ visible, onClose, title, breakdown }: Props) {
  if (!breakdown) return null
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {breakdown.factors.map(f => {
            const ratio = f.points / f.max
            return (
              <View key={f.key} style={styles.row} testID="factor-row">
                <View style={styles.rowHeader}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={styles.factorPoints}>{f.points}/{f.max}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor(ratio) }]} />
                </View>
                <Text style={styles.factorNote}>{f.note}</Text>
              </View>
            )
          })}
          {breakdown.scaled && (
            <Text style={styles.footnote}>Freshwater spot — no tide factor; score scaled from an 80-point base.</Text>
          )}
          {breakdown.capNote && (
            <Text style={styles.capNote}>{breakdown.capNote}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Spacing.cardRadius * 2,
    borderTopRightRadius: Spacing.cardRadius * 2,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  row: { marginBottom: Spacing.md },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  factorLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  factorPoints: { fontSize: 13, color: Colors.textSecondary },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.card, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  factorNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 3 },
  footnote: { fontSize: 11, color: Colors.textTertiary, marginTop: Spacing.xs },
  capNote: { fontSize: 12, color: Colors.warning, marginTop: Spacing.xs, fontWeight: '600' },
})
```

- [ ] **Step 4: Replace the Pro tooltip in `features/score/ScoreTimeline.tsx`**

1. Remove the `useSettingsStore` import and the `const isPro = ...` line, the `tooltipVisible` state, and the entire `<Modal ...>` tooltip block with its `overlay`/`tooltip`/`tooltipTitle`/`tooltipBody`/`tooltipHint` styles.
2. Add imports: `import { ScoreBreakdownSheet } from './ScoreBreakdownSheet'`.
3. Add state: `const [selected, setSelected] = useState<HourlyScore | null>(null)`.
4. Change each bar's `onPress` and `activeOpacity`:

```tsx
              onPress={() => { if (item.breakdown) setSelected(item) }}
              activeOpacity={0.7}
```

5. Render the sheet just before the closing `</View>` of the container:

```tsx
      <ScoreBreakdownSheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.hour} — Score ${selected.score}` : ''}
        breakdown={selected?.breakdown ?? null}
      />
```

6. Update `__tests__/ScoreTimeline.test.tsx`: remove nothing (its tests don't touch the tooltip), but add:

```tsx
  it('opens the breakdown sheet when a bar with breakdown is tapped', () => {
    const withBreakdown = HOURS.map(h => ({
      ...h,
      breakdown: {
        total: h.score, scaled: false, capNote: null,
        factors: [{ key: 'wind' as const, label: 'Wind', points: 15, max: 15, note: 'Light chop — ideal' }],
      },
    }))
    const { getAllByTestId, getByText } = render(
      <ScoreTimeline hourlyScores={withBreakdown} currentHour={14} />
    )
    fireEvent.press(getAllByTestId('timeline-bar')[3])
    expect(getByText('Light chop — ideal')).toBeTruthy()
  })
```

(add `fireEvent` to the testing-library import in that file.)

- [ ] **Step 5: Make the score dial tappable in `features/score/ScoreDisplay.tsx`**

1. Add to Props:

```ts
interface Props {
  score: number
  label: string
  bestWindow: { start: string; end: string; score: number; passed?: boolean }
  breakdown?: ScoreBreakdown | null
}
```

with `import type { ScoreBreakdown } from '../../types/conditions'` and `import { ScoreBreakdownSheet } from './ScoreBreakdownSheet'` and add `Pressable` to the react-native import.

2. In the component: `const [showBreakdown, setShowBreakdown] = useState(false)` (add `useState` to the React import).
3. Wrap the existing `<View style={styles.circleWrapper}>` in a Pressable:

```tsx
      <Pressable onPress={() => { if (breakdown) setShowBreakdown(true) }}>
        <View style={styles.circleWrapper}>
          {/* ...existing Svg + text overlay unchanged... */}
        </View>
      </Pressable>
```

4. Add below the best-window Text, inside the container:

```tsx
      {breakdown && (
        <Text style={styles.tapHint}>Tap the dial to see why</Text>
      )}
      <ScoreBreakdownSheet
        visible={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        title={`Right now — Score ${score}`}
        breakdown={breakdown ?? null}
      />
```

with style `tapHint: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 }`.

5. In `app/(tabs)/index.tsx`, pass the prop:

```tsx
            <ScoreDisplay
              score={conditions.fishingScore}
              label={conditions.scoreLabel}
              bestWindow={conditions.bestWindow}
              breakdown={conditions.currentBreakdown}
            />
```

- [ ] **Step 6: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS. (`ScoreDisplay.test.tsx` renders without the new optional prop — still valid.)

- [ ] **Step 7: Commit**

```bash
git add features/score/ScoreBreakdownSheet.tsx features/score/ScoreTimeline.tsx features/score/ScoreDisplay.tsx "app/(tabs)/index.tsx" __tests__/ScoreBreakdownSheet.test.tsx __tests__/ScoreTimeline.test.tsx
git commit -m "feat: free score breakdown sheet replaces Pro tooltip"
```

---

### Task 4: Species region routing fix + empty state

**Files:**
- Modify: `data/species/index.ts`
- Modify: `app/(tabs)/index.tsx` (call site + empty state)
- Create: `__tests__/speciesRegion.test.ts`

**Interfaces:**
- Consumes: `WaterType` from `types/species.ts`.
- Produces: `getSpeciesForRegion(lat: number, lng: number, spotType: WaterType): Species[]` — freshwater spots ALWAYS get the freshwater list; saltwater spots outside covered coasts get `[]`. `detectRegion(lat, lng)` signature unchanged (still used by `app/spot/new.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/speciesRegion.test.ts`:

```ts
import { detectRegion, getSpeciesForRegion } from '../data/species'
import { freshwaterSpecies } from '../data/species/freshwater'
import { westCoastSpecies } from '../data/species/westCoast'

describe('detectRegion', () => {
  it('classifies the Pacific coast as west_coast', () => {
    expect(detectRegion(37.8, -122.4)).toBe('west_coast')  // San Francisco
    expect(detectRegion(47.6, -122.3)).toBe('west_coast')  // Seattle
  })
  it('classifies the Gulf coast as southeast', () => {
    expect(detectRegion(29.3, -94.8)).toBe('southeast')    // Galveston TX
    expect(detectRegion(30.0, -90.1)).toBe('southeast')    // New Orleans
    expect(detectRegion(27.8, -82.6)).toBe('southeast')    // Tampa
  })
  it('classifies the Atlantic coast north of 35 as northeast', () => {
    expect(detectRegion(42.4, -71.0)).toBe('northeast')    // Boston
    expect(detectRegion(40.6, -74.0)).toBe('northeast')    // NY Harbor
  })
  it('classifies inland areas as freshwater', () => {
    expect(detectRegion(39.7, -105.0)).toBe('freshwater')  // Denver
    expect(detectRegion(36.1, -115.1)).toBe('freshwater')  // Las Vegas (NOT west_coast)
  })
})

describe('getSpeciesForRegion', () => {
  it('freshwater spot type always returns freshwater species regardless of location', () => {
    expect(getSpeciesForRegion(37.8, -122.4, 'freshwater')).toBe(freshwaterSpecies)
  })
  it('saltwater spot on the Pacific returns west coast species', () => {
    expect(getSpeciesForRegion(37.8, -122.4, 'saltwater')).toBe(westCoastSpecies)
  })
  it('saltwater spot in an uncovered area returns an empty list', () => {
    expect(getSpeciesForRegion(39.7, -105.0, 'saltwater')).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/speciesRegion.test.ts --no-coverage`
Expected: FAIL — Las Vegas classifies as `west_coast` (lng < -114) and `getSpeciesForRegion` takes 2 args.

- [ ] **Step 3: Implement**

Replace `data/species/index.ts` entirely with:

```ts
import type { Region } from '../../types/spot'
import type { Species, WaterType } from '../../types/species'
import { westCoastSpecies } from './westCoast'
import { northeastSpecies } from './northeast'
import { southeastSpecies } from './southeast'
import { freshwaterSpecies } from './freshwater'

export function getSpeciesForRegion(lat: number, lng: number, spotType: WaterType): Species[] {
  // Spot type wins over geography: a lake in California is still freshwater
  if (spotType === 'freshwater') return freshwaterSpecies
  const region = detectRegion(lat, lng)
  switch (region) {
    case 'west_coast': return westCoastSpecies
    case 'southeast': return southeastSpecies
    case 'northeast': return northeastSpecies
    case 'freshwater': return [] // saltwater spot outside covered coasts — no data yet
  }
}

export function detectRegion(lat: number, lng: number): Region {
  if (lng <= -117 && lat >= 32 && lat <= 49) return 'west_coast'
  // Gulf of Mexico + South Atlantic (Texas through the Carolinas)
  if (lat >= 24 && lat <= 35 && lng >= -98 && lng <= -75) return 'southeast'
  // Mid-Atlantic through Maine
  if (lat > 35 && lng >= -82) return 'northeast'
  return 'freshwater'
}
```

- [ ] **Step 4: Update the call site and add the empty state**

In `app/(tabs)/index.tsx`:

1. Inside the `scoredSpecies` memo, change the lookup line:

```ts
    return getSpeciesForRegion(activeSpot.lat, activeSpot.lng, activeSpot.type)
```

2. In the "What's Biting" section, wrap the species list:

```tsx
              {scoredSpecies.length === 0 ? (
                <Text style={styles.emptySpecies}>
                  No species data for this area yet — scores above still apply.
                </Text>
              ) : (
                scoredSpecies.map(ss => (
                  <SpeciesCard
                    key={ss.species.id}
                    speciesScore={ss}
                    isPro={isPro}
                    onPress={() => {
                      if (ss.species.tier === 'pro' && !isPro) return
                      router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss) } })
                    }}
                  />
                ))
              )}
```

3. Add style: `emptySpecies: { fontSize: 13, color: Colors.textTertiary, paddingVertical: Spacing.sm }`.

- [ ] **Step 5: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data/species/index.ts "app/(tabs)/index.tsx" __tests__/speciesRegion.test.ts
git commit -m "fix: spot type drives species list; Gulf coast maps to southeast"
```

---

### Task 5: Species schema test + northeast data

**Files:**
- Create: `__tests__/speciesData.test.ts`
- Rewrite: `data/species/northeast.ts`

**Interfaces:**
- Consumes: `Species` type.
- Produces: `export const northeastSpecies: Species[]` (11 entries). The schema test covers all four regional files and stays green as Tasks 6–7 fill the others (empty arrays pass trivially).

- [ ] **Step 1: Write the schema test (passes for empty arrays, guards all data)**

Create `__tests__/speciesData.test.ts`:

```ts
import { westCoastSpecies } from '../data/species/westCoast'
import { northeastSpecies } from '../data/species/northeast'
import { southeastSpecies } from '../data/species/southeast'
import { freshwaterSpecies } from '../data/species/freshwater'
import type { Species } from '../types/species'

const FILES: Array<[string, Species[]]> = [
  ['westCoast', westCoastSpecies],
  ['northeast', northeastSpecies],
  ['southeast', southeastSpecies],
  ['freshwater', freshwaterSpecies],
]

describe.each(FILES)('species data: %s', (_name, list) => {
  it('has unique ids', () => {
    const ids = list.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('months are valid and peak months are a subset of present months', () => {
    for (const s of list) {
      expect(s.months_present.length).toBeGreaterThan(0)
      for (const m of [...s.months_present, ...s.months_peak]) {
        expect(m).toBeGreaterThanOrEqual(1)
        expect(m).toBeLessThanOrEqual(12)
      }
      for (const m of s.months_peak) {
        expect(s.months_present).toContain(m)
      }
    }
  })

  it('temperature ranges are ordered min <= peak_min <= peak_max <= max', () => {
    for (const s of list) {
      const t = s.water_temp_f
      expect(t.min).toBeLessThanOrEqual(t.peak_min)
      expect(t.peak_min).toBeLessThanOrEqual(t.peak_max)
      expect(t.peak_max).toBeLessThanOrEqual(t.max)
    }
  })

  it('has non-empty notes, tips, and time-of-day preferences', () => {
    for (const s of list) {
      expect(s.migration_notes.length).toBeGreaterThan(20)
      expect(s.tips.length).toBeGreaterThan(20)
      expect(s.preferred_time_of_day.length).toBeGreaterThan(0)
    }
  })
})

it('all species ids are globally unique', () => {
  const all = FILES.flatMap(([, list]) => list.map(s => s.id))
  expect(new Set(all).size).toBe(all.length)
})
```

Run: `npx jest __tests__/speciesData.test.ts --no-coverage` — Expected: PASS (guards existing westCoast data; empty files pass trivially). If westCoast fails a rule, STOP and report — do not edit westCoast data.

- [ ] **Step 2: Fill `data/species/northeast.ts`** — replace the file entirely with (transcribe exactly):

```ts
import type { Species } from '../../types/species'

export const northeastSpecies: Species[] = [
  {
    id: 'striped_bass', common_name: 'Striped Bass', scientific_name: 'Morone saxatilis',
    region: 'northeast', type: 'saltwater', tier: 'free',
    months_present: [4,5,6,7,8,9,10,11], months_peak: [5,6,10,11],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','dusk','night'],
    migration_notes: 'Migrate north along the coast in spring, south in fall. Stage around river mouths, rips, and bait schools during both runs.',
    tips: 'Throw topwater at first light, drift live eels at night, and follow diving birds over bunker schools during the fall run.',
  },
  {
    id: 'bluefish', common_name: 'Bluefish', scientific_name: 'Pomatomus saltatrix',
    region: 'northeast', type: 'saltwater', tier: 'free',
    months_present: [5,6,7,8,9,10], months_peak: [6,7,8,9],
    water_temp_f: { min: 58, max: 75, peak_min: 64, peak_max: 72 },
    preferred_tide: 'any', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Arrive from the south when water passes ~58°F and blitz bait schools on beaches and rips all summer.',
    tips: 'Cast metal lures or poppers into surface blitzes. Use a wire leader — their teeth cut mono instantly.',
  },
  {
    id: 'summer_flounder', common_name: 'Summer Flounder (Fluke)', scientific_name: 'Paralichthys dentatus',
    region: 'northeast', type: 'saltwater', tier: 'free',
    months_present: [5,6,7,8,9], months_peak: [6,7,8],
    water_temp_f: { min: 56, max: 72, peak_min: 60, peak_max: 68 },
    preferred_tide: 'outgoing', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Move inshore to bays and channels in late spring, back to deeper ocean water by October. Hold on sandy bottom near structure edges.',
    tips: 'Drift squid-and-minnow combos or bucktails along channel edges with the moving tide. Bounce bottom continuously.',
  },
  {
    id: 'black_sea_bass', common_name: 'Black Sea Bass', scientific_name: 'Centropristis striata',
    region: 'northeast', type: 'saltwater', tier: 'pro',
    months_present: [5,6,7,8,9,10], months_peak: [6,7,8,9],
    water_temp_f: { min: 55, max: 72, peak_min: 59, peak_max: 68 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Move inshore to wrecks, reefs, and rock piles in late spring; offshore again in late fall. Structure-bound all season.',
    tips: 'Drop clam baits or diamond jigs straight onto wrecks and rock piles. The bigger fish hold tight to the structure.',
  },
  {
    id: 'tautog', common_name: 'Tautog (Blackfish)', scientific_name: 'Tautoga onitis',
    region: 'northeast', type: 'saltwater', tier: 'pro',
    months_present: [4,5,6,10,11,12], months_peak: [4,5,10,11],
    water_temp_f: { min: 45, max: 65, peak_min: 50, peak_max: 60 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Move to shallow rocky structure in spring and fall, deeper wrecks in summer heat and winter cold. Rarely far from rocks.',
    tips: 'Fish green crabs or Asian crabs tight to rocks and mussel beds. Set the hook on the second tap, not the first.',
  },
  {
    id: 'scup', common_name: 'Scup (Porgy)', scientific_name: 'Stenotomus chrysops',
    region: 'northeast', type: 'saltwater', tier: 'free',
    months_present: [5,6,7,8,9,10], months_peak: [6,7,8,9],
    water_temp_f: { min: 55, max: 72, peak_min: 60, peak_max: 68 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'School over hard bottom, mussel beds, and rock piles inshore all summer. Great numbers, steady action.',
    tips: 'Small hooks with clam or squid strips near the bottom. Where you catch one there are usually dozens.',
  },
  {
    id: 'weakfish', common_name: 'Weakfish', scientific_name: 'Cynoscion regalis',
    region: 'northeast', type: 'saltwater', tier: 'pro',
    months_present: [5,6,7,8,9,10], months_peak: [5,6],
    water_temp_f: { min: 58, max: 72, peak_min: 62, peak_max: 70 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','dusk','night'],
    migration_notes: 'Enter bays and estuaries in May to spawn, best fishing in the spring run. Soft-mouthed — hence the name.',
    tips: 'Drift pink or chartreuse soft plastics near channel edges at dusk. Set the hook gently and keep steady pressure.',
  },
  {
    id: 'false_albacore', common_name: 'False Albacore', scientific_name: 'Euthynnus alletteratus',
    region: 'northeast', type: 'saltwater', tier: 'pro',
    months_present: [8,9,10], months_peak: [9,10],
    water_temp_f: { min: 62, max: 74, peak_min: 65, peak_max: 72 },
    preferred_tide: 'any', preferred_time_of_day: ['dawn','morning'],
    migration_notes: 'Blitz inshore in late summer chasing bay anchovies, then vanish south with the first hard cold fronts.',
    tips: 'Run-and-gun to surface feeds, cast small epoxy jigs past the school, and retrieve as fast as you can crank.',
  },
  {
    id: 'winter_flounder', common_name: 'Winter Flounder', scientific_name: 'Pseudopleuronectes americanus',
    region: 'northeast', type: 'saltwater', tier: 'pro',
    months_present: [3,4,5,10,11], months_peak: [4,5],
    water_temp_f: { min: 42, max: 58, peak_min: 46, peak_max: 54 },
    preferred_tide: 'incoming', preferred_time_of_day: ['morning','midday'],
    migration_notes: 'Move into shallow muddy bays in early spring while water is still cold, out to deeper water by summer.',
    tips: 'Anchor over soft mud, chum with corn or clam bits, and fish tiny hooks with sandworms right on the bottom.',
  },
  {
    id: 'atlantic_bonito', common_name: 'Atlantic Bonito', scientific_name: 'Sarda sarda',
    region: 'northeast', type: 'saltwater', tier: 'pro',
    months_present: [7,8,9,10], months_peak: [8,9],
    water_temp_f: { min: 60, max: 72, peak_min: 64, peak_max: 70 },
    preferred_tide: 'any', preferred_time_of_day: ['dawn','morning'],
    migration_notes: 'Arrive ahead of false albacore in mid-summer, feeding on sand eels and small bait around rips and harbor mouths.',
    tips: 'Cast slim metals or small soft plastics with a fast, erratic retrieve. Unlike albies, bonito are excellent eating.',
  },
  {
    id: 'atlantic_mackerel', common_name: 'Atlantic Mackerel', scientific_name: 'Scomber scombrus',
    region: 'northeast', type: 'saltwater', tier: 'free',
    months_present: [4,5,6,9,10,11], months_peak: [4,5],
    water_temp_f: { min: 45, max: 60, peak_min: 48, peak_max: 56 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday'],
    migration_notes: 'Big schools push inshore in spring while water is cold, then again briefly in fall. Fast-moving and thick when present.',
    tips: 'Drop sabiki rigs from piers or boats and jig steadily. Fresh mackerel also makes prime striper bait.',
  },
]
```

- [ ] **Step 3: Run the schema test**

Run: `npx jest __tests__/speciesData.test.ts --no-coverage`
Expected: PASS — all four files satisfy every invariant.

- [ ] **Step 4: Full suite and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add data/species/northeast.ts __tests__/speciesData.test.ts
git commit -m "feat: northeast species data (11 species) with schema validation tests"
```

---

### Task 6: Southeast/Gulf species data

**Files:**
- Rewrite: `data/species/southeast.ts`

**Interfaces:**
- Produces: `export const southeastSpecies: Species[]` (12 entries). Schema test from Task 5 must stay green.

- [ ] **Step 1: Replace `data/species/southeast.ts` entirely with (transcribe exactly):**

```ts
import type { Species } from '../../types/species'

export const southeastSpecies: Species[] = [
  {
    id: 'red_drum', common_name: 'Red Drum (Redfish)', scientific_name: 'Sciaenops ocellatus',
    region: 'southeast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [9,10,11],
    water_temp_f: { min: 55, max: 85, peak_min: 65, peak_max: 80 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Year-round resident of flats, marshes, and oyster bars. Big bull reds school near passes and beaches in fall.',
    tips: 'Sight-cast gold spoons or shrimp imitations to tailing fish on flooding grass flats. Move quietly — they spook in skinny water.',
  },
  {
    id: 'spotted_seatrout', common_name: 'Spotted Seatrout', scientific_name: 'Cynoscion nebulosus',
    region: 'southeast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [4,5,9,10],
    water_temp_f: { min: 55, max: 82, peak_min: 62, peak_max: 75 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','dusk','night'],
    migration_notes: 'Hold over grass flats and potholes most of the year, moving to deeper channels and rivers in winter cold snaps.',
    tips: 'Work popping corks with live shrimp over grass flats early, or walk topwater plugs across potholes at first light.',
  },
  {
    id: 'snook', common_name: 'Snook', scientific_name: 'Centropomus undecimalis',
    region: 'southeast', type: 'saltwater', tier: 'pro',
    months_present: [3,4,5,6,7,8,9,10,11], months_peak: [5,6,7,8],
    water_temp_f: { min: 68, max: 86, peak_min: 72, peak_max: 82 },
    preferred_tide: 'outgoing', preferred_time_of_day: ['dawn','dusk','night'],
    migration_notes: 'Stage in passes and around beaches for the summer spawn, retreating to rivers and backwaters when water cools below 68°F.',
    tips: 'Fish the outgoing tide at night around dock and bridge lights. Live pilchards or a flair hawk jig swung with the current.',
  },
  {
    id: 'tarpon', common_name: 'Tarpon', scientific_name: 'Megalops atlanticus',
    region: 'southeast', type: 'saltwater', tier: 'pro',
    months_present: [4,5,6,7,8,9], months_peak: [5,6,7],
    water_temp_f: { min: 72, max: 88, peak_min: 75, peak_max: 84 },
    preferred_tide: 'outgoing', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Migrate along beaches and through passes in early summer, following bait and warm water. Roll on the surface when present.',
    tips: 'Drift live crabs or threadfins through passes on the falling tide. Bow to the fish on every jump or you will lose it.',
  },
  {
    id: 'sheepshead', common_name: 'Sheepshead', scientific_name: 'Archosargus probatocephalus',
    region: 'southeast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [2,3,4],
    water_temp_f: { min: 55, max: 78, peak_min: 60, peak_max: 72 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Gather on nearshore reefs and structure to spawn in late winter, around pilings and oyster bars the rest of the year.',
    tips: 'Scrape barnacles off a piling to start a bite, then drop a fiddler crab straight down. Set the hook on the faintest tick.',
  },
  {
    id: 'southern_flounder', common_name: 'Southern Flounder', scientific_name: 'Paralichthys lethostigma',
    region: 'southeast', type: 'saltwater', tier: 'pro',
    months_present: [4,5,6,7,8,9,10,11], months_peak: [9,10,11],
    water_temp_f: { min: 58, max: 80, peak_min: 64, peak_max: 75 },
    preferred_tide: 'outgoing', preferred_time_of_day: ['morning','afternoon'],
    migration_notes: 'Ambush bait in creek mouths and channel edges through summer, then run to offshore spawning grounds in late fall.',
    tips: 'Drag a mud-minnow or paddletail slowly along drop-offs on the falling tide. Count to three before setting the hook.',
  },
  {
    id: 'spanish_mackerel', common_name: 'Spanish Mackerel', scientific_name: 'Scomberomorus maculatus',
    region: 'southeast', type: 'saltwater', tier: 'free',
    months_present: [4,5,6,7,8,9,10], months_peak: [5,6,7,8,9],
    water_temp_f: { min: 66, max: 82, peak_min: 70, peak_max: 78 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday'],
    migration_notes: 'Schools run the beaches and passes spring through fall following glass minnows, pushing bait showers to the surface.',
    tips: 'Cast small silver spoons through surface feeds and retrieve fast. A short trace of heavy fluoro beats wire for more bites.',
  },
  {
    id: 'king_mackerel', common_name: 'King Mackerel', scientific_name: 'Scomberomorus cavalla',
    region: 'southeast', type: 'saltwater', tier: 'pro',
    months_present: [4,5,6,7,8,9,10,11], months_peak: [5,6,9,10],
    water_temp_f: { min: 68, max: 84, peak_min: 72, peak_max: 80 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Run the beaches in spring and fall migrations, holding around nearshore reefs, wrecks, and bait pods in between.',
    tips: 'Slow-troll live blue runners or menhaden on stinger rigs near bait schools. The biggest smokers often eat the slowest bait.',
  },
  {
    id: 'cobia', common_name: 'Cobia', scientific_name: 'Rachycentron canadum',
    region: 'southeast', type: 'saltwater', tier: 'pro',
    months_present: [4,5,6,7,8,9,10], months_peak: [4,5,6],
    water_temp_f: { min: 66, max: 84, peak_min: 70, peak_max: 80 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday'],
    migration_notes: 'Migrate along beaches in spring, often shadowing rays and turtles near the surface. Curious and structure-oriented.',
    tips: 'Keep a heavy bucktail jig rigged and ready — sight-cast to cruising fish before the boat gets close enough to spook them.',
  },
  {
    id: 'florida_pompano', common_name: 'Florida Pompano', scientific_name: 'Trachinotus carolinus',
    region: 'southeast', type: 'saltwater', tier: 'pro',
    months_present: [3,4,5,6,7,8,9,10,11], months_peak: [3,4,5,10],
    water_temp_f: { min: 62, max: 82, peak_min: 68, peak_max: 78 },
    preferred_tide: 'incoming', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Run the surf zone in spring and fall following sand fleas, holding in troughs and swash channels close to the beach.',
    tips: 'Fish sand fleas or Fishbites on double-drop pompano rigs in the first trough. Look for sandy cuts between bars.',
  },
  {
    id: 'black_drum', common_name: 'Black Drum', scientific_name: 'Pogonias cromis',
    region: 'southeast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [2,3,4],
    water_temp_f: { min: 54, max: 82, peak_min: 60, peak_max: 75 },
    preferred_tide: 'incoming', preferred_time_of_day: ['morning','afternoon','dusk'],
    migration_notes: 'Big schools gather around bridges, channels, and oyster bars for the late-winter spawn; juveniles roam flats year-round.',
    tips: 'Half a blue crab on the bottom near bridge pilings is the classic bait. Puppy drum on flats eat shrimp like redfish.',
  },
  {
    id: 'mangrove_snapper', common_name: 'Mangrove Snapper', scientific_name: 'Lutjanus griseus',
    region: 'southeast', type: 'saltwater', tier: 'pro',
    months_present: [4,5,6,7,8,9,10,11], months_peak: [6,7,8,9],
    water_temp_f: { min: 68, max: 86, peak_min: 72, peak_max: 82 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','dusk','night'],
    migration_notes: 'Hold tight to mangroves, docks, and rock piles inshore, with bigger fish moving to reefs for the summer spawn.',
    tips: 'Free-line small live pilchards or shrimp with the lightest leader you can get away with. They are famously leader-shy.',
  },
]
```

- [ ] **Step 2: Run the full suite and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS (schema test validates the new data).

```bash
git add data/species/southeast.ts
git commit -m "feat: southeast/Gulf species data (12 species)"
```

---

### Task 7: Freshwater species data

**Files:**
- Rewrite: `data/species/freshwater.ts`

**Interfaces:**
- Produces: `export const freshwaterSpecies: Species[]` (11 entries). Schema test stays green.

- [ ] **Step 1: Replace `data/species/freshwater.ts` entirely with (transcribe exactly):**

```ts
import type { Species } from '../../types/species'

export const freshwaterSpecies: Species[] = [
  {
    id: 'largemouth_bass', common_name: 'Largemouth Bass', scientific_name: 'Micropterus salmoides',
    region: 'freshwater', type: 'freshwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [4,5,6],
    water_temp_f: { min: 55, max: 85, peak_min: 65, peak_max: 78 },
    preferred_tide: 'any', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Move shallow to spawn when water hits the low 60s in spring, slide to deeper structure in summer heat and winter cold.',
    tips: 'Fish spinnerbaits and soft plastics around shallow cover in spring; go deeper and slower with jigs in summer and winter.',
  },
  {
    id: 'smallmouth_bass', common_name: 'Smallmouth Bass', scientific_name: 'Micropterus dolomieu',
    region: 'freshwater', type: 'freshwater', tier: 'free',
    months_present: [3,4,5,6,7,8,9,10,11], months_peak: [5,6,9,10],
    water_temp_f: { min: 50, max: 78, peak_min: 58, peak_max: 71 },
    preferred_tide: 'any', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Relate to rocky points, current seams, and gravel flats. Feed hard pre-spawn in spring and again as water cools in fall.',
    tips: 'Drag tube jigs and ned rigs over rock, or throw topwater over points at dawn. In rivers, cast crankbaits across current seams.',
  },
  {
    id: 'rainbow_trout', common_name: 'Rainbow Trout', scientific_name: 'Oncorhynchus mykiss',
    region: 'freshwater', type: 'freshwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [3,4,5,10,11],
    water_temp_f: { min: 40, max: 68, peak_min: 48, peak_max: 60 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','dusk'],
    migration_notes: 'Feed most actively in cool water; hold in riffles and runs in streams, near thermocline depths in lakes come summer.',
    tips: 'Match the hatch with small flies or drift nymphs through riffles. In stocked lakes, slow-troll small spoons or use floating dough bait.',
  },
  {
    id: 'brown_trout', common_name: 'Brown Trout', scientific_name: 'Salmo trutta',
    region: 'freshwater', type: 'freshwater', tier: 'pro',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [4,5,10,11],
    water_temp_f: { min: 40, max: 68, peak_min: 48, peak_max: 62 },
    preferred_tide: 'any', preferred_time_of_day: ['dawn','dusk','night'],
    migration_notes: 'Big browns run upstream to spawn in fall and hunt largest prey in low light. Wary and structure-oriented in daylight.',
    tips: 'Throw streamers at undercut banks at dusk, or drift big nymphs deep. The largest fish in the river eats after dark.',
  },
  {
    id: 'walleye', common_name: 'Walleye', scientific_name: 'Sander vitreus',
    region: 'freshwater', type: 'freshwater', tier: 'pro',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [4,5,10,11],
    water_temp_f: { min: 45, max: 75, peak_min: 55, peak_max: 68 },
    preferred_tide: 'any', preferred_time_of_day: ['dusk','night','dawn'],
    migration_notes: 'Run to rocky shoals and river mouths for the early-spring spawn, then follow bait to deeper structure through summer.',
    tips: 'Troll crawler harnesses or jig minnows along bottom transitions at dusk. Low light and a little chop beat calm bluebird days.',
  },
  {
    id: 'channel_catfish', common_name: 'Channel Catfish', scientific_name: 'Ictalurus punctatus',
    region: 'freshwater', type: 'freshwater', tier: 'free',
    months_present: [3,4,5,6,7,8,9,10,11], months_peak: [6,7,8],
    water_temp_f: { min: 60, max: 88, peak_min: 70, peak_max: 82 },
    preferred_tide: 'any', preferred_time_of_day: ['dusk','night'],
    migration_notes: 'Feed shallow at night through the warm months, holding in deep holes and channel bends during the day.',
    tips: 'Soak cut bait or punch bait on the bottom of holes and outside river bends after sunset. Fresh bait outfishes stink bait.',
  },
  {
    id: 'black_crappie', common_name: 'Black Crappie', scientific_name: 'Pomoxis nigromaculatus',
    region: 'freshwater', type: 'freshwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [3,4,5],
    water_temp_f: { min: 50, max: 80, peak_min: 60, peak_max: 72 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','dusk'],
    migration_notes: 'Stack up around shallow brush and docks to spawn in spring, then suspend over deeper brush piles the rest of the year.',
    tips: 'Slip-float a minnow or swim a small jig around brush piles and dock pilings. When you find one, you have found the school.',
  },
  {
    id: 'bluegill', common_name: 'Bluegill', scientific_name: 'Lepomis macrochirus',
    region: 'freshwater', type: 'freshwater', tier: 'free',
    months_present: [3,4,5,6,7,8,9,10,11], months_peak: [5,6,7,8],
    water_temp_f: { min: 58, max: 85, peak_min: 66, peak_max: 80 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Spawn in shallow colonies of saucer-shaped beds from late spring through summer, easy to spot in clear water.',
    tips: 'Crickets or waxworms under a small bobber near beds is unbeatable. A tiny popper on a fly rod is pure summer fun.',
  },
  {
    id: 'yellow_perch', common_name: 'Yellow Perch', scientific_name: 'Perca flavescens',
    region: 'freshwater', type: 'freshwater', tier: 'pro',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [1,2,3,9,10],
    water_temp_f: { min: 45, max: 75, peak_min: 55, peak_max: 68 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday'],
    migration_notes: 'School by size over weed edges and soft bottom; a prime ice-fishing target that bites all winter long.',
    tips: 'Drop small jigs tipped with minnows or waxworms to the bottom and work the school. Keep moving until you find the jumbos.',
  },
  {
    id: 'northern_pike', common_name: 'Northern Pike', scientific_name: 'Esox lucius',
    region: 'freshwater', type: 'freshwater', tier: 'pro',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [4,5,10,11],
    water_temp_f: { min: 40, max: 72, peak_min: 50, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Ambush from weed edges and shallow bays, spawning right after ice-out and feeding aggressively in cool water.',
    tips: 'Burn big spoons, spinnerbaits, or jerkbaits along weedlines. Always use a wire or heavy fluoro leader.',
  },
  {
    id: 'muskellunge', common_name: 'Muskellunge', scientific_name: 'Esox masquinongy',
    region: 'freshwater', type: 'freshwater', tier: 'pro',
    months_present: [5,6,7,8,9,10,11,12], months_peak: [9,10,11],
    water_temp_f: { min: 50, max: 78, peak_min: 58, peak_max: 70 },
    preferred_tide: 'any', preferred_time_of_day: ['afternoon','dusk'],
    migration_notes: 'The fish of ten thousand casts. Shadow bait schools around weed edges and rock bars, feeding hardest in fall.',
    tips: 'Throw big bucktails and glide baits, and always finish every retrieve with a figure-eight at the boat — many strikes happen there.',
  },
]
```

- [ ] **Step 2: Run the full suite and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add data/species/freshwater.ts
git commit -m "feat: freshwater species data (11 species)"
```

---

### Task 8: Onboarding — direct path to the first spot

**Files:**
- Modify: `app/(tabs)/index.tsx` (empty state button)
- Modify: `app/(tabs)/spots.tsx` (empty state button)

**Interfaces:**
- Consumes: existing `/spot/new` route (GPS centering already works there).
- Produces: UI only. No routing changes after save — `router.back()` already returns to a dashboard that now has an active spot (the store auto-activates the first spot).

- [ ] **Step 1: Dashboard empty state**

In `app/(tabs)/index.tsx`, replace the `if (!activeSpot)` block's contents:

```tsx
  if (!activeSpot) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spot selected</Text>
        <Text style={styles.emptyHint}>Add a fishing spot to see conditions, tides, and your fishing score</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/spot/new')}>
          <Text style={styles.addButtonText}>Add your first spot</Text>
        </TouchableOpacity>
      </View>
    )
  }
```

Add `TouchableOpacity` to the react-native import if missing, and add styles:

```ts
  addButton: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.lg,
  },
  addButtonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
```

- [ ] **Step 2: Spots tab empty state**

In `app/(tabs)/spots.tsx`, replace the `ListEmptyComponent`:

```tsx
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No spots yet</Text>
            <Text style={styles.emptyHint}>Save the places you fish to get scores and forecasts for each one</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/spot/new')}>
              <Text style={styles.addButtonText}>Add your first spot</Text>
            </TouchableOpacity>
          </View>
        }
```

and add the same `addButton`/`addButtonText` styles as Step 1 to this file's stylesheet.

- [ ] **Step 3: Run the full suite and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/spots.tsx"
git commit -m "feat: empty states link directly to Add Spot"
```

---

### Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the stale sections**

1. **Scoring Algorithm** section — add: `calculateScoreBreakdown() is the source of truth; calculateScore() returns its .total. Breakdowns (per-factor points + plain-English notes) ride on every HourlyScore and ConditionsData.currentBreakdown, rendered by ScoreBreakdownSheet (free feature).`
2. **File Map** — under `data/species/`, replace the stubs line with: `northeast.ts (11) / southeast.ts (12) / freshwater.ts (11) — fully built out; schema-validated by __tests__/speciesData.test.ts`.
3. **Key Patterns** — replace the region-detection bullet with: `Region routing: getSpeciesForRegion(lat, lng, spotType) — freshwater spots always get freshwaterSpecies; saltwater maps via detectRegion (west_coast: lng<=-117; southeast incl. Gulf: lat 24–35, lng -98..-75; northeast: lat>35, lng>=-82); uncovered saltwater areas get [] and an empty-state message.`
4. **What's Next** — Phase C list becomes: push notifications, RevenueCat, AI score explainer (Pro), catch logging.

- [ ] **Step 2: Final check and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for breakdown, species coverage, and onboarding"
```
