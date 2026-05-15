# Species Intelligence Pack — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-species hourly bite scoring and surface it in the species list, species detail screen, dashboard ("Active Right Now" callout), and a Pro-gated per-species alerts settings UI.

**Architecture:** Pure-function engine extension (`scoreSpeciesHourly`) that reuses existing per-hour scoring primitives. UI components are siblings of existing ones (no refactors of working code). Settings persistence is added to the existing Zustand store; actual push delivery is Phase C and out of scope.

**Tech Stack:** TypeScript, React Native (Expo SDK 54), Zustand v5 (persist + AsyncStorage), Jest + React Native Testing Library, react-native SVG (existing).

**Spec:** `docs/superpowers/specs/2026-05-15-species-intelligence-pack-design.md`

**Test command:** `npx jest --no-coverage` (full suite, ~2s). For one file: `npx jest __tests__/<file>.test.ts`. Type check: `npx tsc --noEmit`.

**Commit style:** Match existing repo (e.g. `feat: ...`, `fix: ...`). Each task ends with one commit.

---

## File Map

**New files:**
- `features/score/bestWindow.ts` — shared 3-hour sliding-window util
- `features/species/speciesHourlyScoring.ts` — engine + best-window utils for species
- `features/species/SpeciesHourlyChart.tsx` — chart component (sibling of ScoreTimeline)
- `features/species/ActiveRightNow.tsx` — dashboard top-3 callout
- `features/settings/SpeciesAlertsSection.tsx` — Pro-gated settings UI
- `__tests__/bestWindow.test.ts`
- `__tests__/speciesHourlyScoring.test.ts`
- `__tests__/SpeciesHourlyChart.test.tsx`
- `__tests__/ActiveRightNow.test.tsx`
- `__tests__/SpeciesAlertsSection.test.tsx`

**Modified files:**
- `types/conditions.ts` — add `tidePhasesByHour` to `ConditionsData`
- `services/scoringService.ts` — populate `tidePhasesByHour`, use shared `bestWindow` util
- `features/species/speciesScoring.ts` — export `hourToTimeOfDay` for reuse
- `features/species/SpeciesCard.tsx` — add best-window subtitle line
- `features/species/SpeciesDetail.tsx` — add `<SpeciesHourlyChart>` + summary
- `app/(tabs)/index.tsx` — add `<ActiveRightNow>` above species list
- `app/(tabs)/settings.tsx` — add `<SpeciesAlertsSection>`
- `store/settingsStore.ts` — add `speciesAlerts` state + setters
- `__tests__/scoringService.test.ts` — extend for `tidePhasesByHour`
- `__tests__/spotsStore.test.ts` — actually a NEW test file `__tests__/settingsStore.test.ts` (existing settingsStore has no tests yet)

---

## Task 1: Engine + types + scoringService refactor

**Goal of this task:** Extract the 3-hour sliding-window algorithm into a shared util, add the per-species hourly engine, expose `tidePhasesByHour` on `ConditionsData`, and wire it through `buildConditionsData`. Tests for all of the above.

**Files:**
- Create: `features/score/bestWindow.ts`
- Create: `features/species/speciesHourlyScoring.ts`
- Modify: `types/conditions.ts`
- Modify: `services/scoringService.ts`
- Modify: `features/species/speciesScoring.ts` (export `hourToTimeOfDay`)
- Create: `__tests__/bestWindow.test.ts`
- Create: `__tests__/speciesHourlyScoring.test.ts`
- Modify: `__tests__/scoringService.test.ts`

### Task 1.1 — Shared best-window util

- [ ] **Step 1: Write the failing test**

Create `__tests__/bestWindow.test.ts`:

```typescript
import { findBestThreeHourWindow } from '../features/score/bestWindow'

describe('findBestThreeHourWindow', () => {
  it('finds the highest-average 3-hour window with explicit start hour', () => {
    // hours 5..9 with scores [50, 60, 80, 70, 40]
    // windows: 5-7 avg=63, 6-8 avg=70, 7-9 avg=63
    // best is 6-8 with avg 70
    const result = findBestThreeHourWindow([50, 60, 80, 70, 40], 5)
    expect(result).toEqual({ startHour: 6, endHour: 8, avgScore: 70 })
  })

  it('returns null when fewer than 3 scores', () => {
    expect(findBestThreeHourWindow([50, 60], 5)).toBeNull()
    expect(findBestThreeHourWindow([], 5)).toBeNull()
  })

  it('breaks ties by earliest start', () => {
    // [70, 70, 70, 70] — windows 0-2 and 1-3 both avg 70; earliest wins
    const result = findBestThreeHourWindow([70, 70, 70, 70], 10)
    expect(result).toEqual({ startHour: 10, endHour: 12, avgScore: 70 })
  })

  it('rounds the average', () => {
    // [50, 50, 51] avg = 50.33 → 50
    expect(findBestThreeHourWindow([50, 50, 51], 5)?.avgScore).toBe(50)
    // [50, 51, 51] avg = 50.67 → 51
    expect(findBestThreeHourWindow([50, 51, 51], 5)?.avgScore).toBe(51)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/bestWindow.test.ts --no-coverage`
Expected: FAIL with "Cannot find module '../features/score/bestWindow'"

- [ ] **Step 3: Implement the util**

Create `features/score/bestWindow.ts`:

```typescript
export interface BestThreeHourWindow {
  startHour: number  // hour-of-day (24h)
  endHour: number    // hour-of-day (24h), startHour + 2
  avgScore: number   // rounded
}

/**
 * Finds the 3-hour window with the highest average score.
 * `startHour` is the hour-of-day corresponding to scores[0].
 * Ties are broken by earliest start.
 */
export function findBestThreeHourWindow(
  scores: number[],
  startHour: number
): BestThreeHourWindow | null {
  if (scores.length < 3) return null

  let bestStart = 0
  let bestAvg = -1

  for (let i = 0; i <= scores.length - 3; i++) {
    const avg = Math.round((scores[i] + scores[i + 1] + scores[i + 2]) / 3)
    if (avg > bestAvg) {
      bestAvg = avg
      bestStart = i
    }
  }

  return {
    startHour: startHour + bestStart,
    endHour: startHour + bestStart + 2,
    avgScore: bestAvg,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/bestWindow.test.ts --no-coverage`
Expected: PASS — 4 tests pass.

### Task 1.2 — Refactor scoringService to use shared util (behavior-preserving)

- [ ] **Step 5: Read existing best-window code in scoringService**

Re-read `services/scoringService.ts` lines 157–169 to confirm the existing inline implementation. The current code:

```typescript
let bestWindow = { start: formatHourTime(5), end: formatHourTime(7), score: 0 }
for (let i = 0; i < hourlyScores.length - 2; i++) {
  const avg = Math.round(
    (hourlyScores[i].score + hourlyScores[i + 1].score + hourlyScores[i + 2].score) / 3
  )
  if (avg > bestWindow.score) {
    bestWindow = {
      start: formatHourTime(5 + i),
      end: formatHourTime(5 + i + 2),
      score: avg,
    }
  }
}
```

- [ ] **Step 6: Replace inline impl with shared util**

In `services/scoringService.ts`, add import at the top of the imports block:

```typescript
import { findBestThreeHourWindow } from '../features/score/bestWindow'
```

Replace the inline `bestWindow` loop (lines 157–169) with:

```typescript
const windowResult = findBestThreeHourWindow(hourlyScores.map(h => h.score), 5)
const bestWindow = windowResult
  ? {
      start: formatHourTime(windowResult.startHour),
      end: formatHourTime(windowResult.endHour),
      score: windowResult.avgScore,
    }
  : { start: formatHourTime(5), end: formatHourTime(7), score: 0 }
```

- [ ] **Step 7: Run existing scoringService tests to confirm no regression**

Run: `npx jest __tests__/scoringService.test.ts --no-coverage`
Expected: PASS — all 8 existing tests still pass.

### Task 1.3 — Add `tidePhasesByHour` to ConditionsData and populate it

- [ ] **Step 8: Write failing test for `tidePhasesByHour`**

The existing test file uses fixtures named `SPOT`, `NOAA`, `NWS_BY_DAY`, `MARINE`, `SOLUNAR`, `DATE`, `NOW`. There is no existing freshwater spot fixture — construct one inline.

Open `__tests__/scoringService.test.ts` and add these tests at the bottom of the `describe('buildConditionsData', () => { ... })` block (before its final closing `})`):

```typescript
  it('populates tidePhasesByHour with 16 keys for saltwater', () => {
    const result = buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
    const keys = Object.keys(result.tidePhasesByHour).map(Number).sort((a, b) => a - b)
    expect(keys).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    for (const phase of Object.values(result.tidePhasesByHour)) {
      expect(['incoming', 'outgoing', 'slack']).toContain(phase)
    }
  })

  it('populates tidePhasesByHour with all slack for freshwater', () => {
    const freshwaterSpot: Spot = {
      id: 'spot_fw', name: 'Lake Tahoe', lat: 39.10, lng: -120.04,
      type: 'freshwater', stationId: null, region: 'west_coast',
    }
    const result = buildConditionsData(DATE, null, NWS_BY_DAY, null, SOLUNAR, freshwaterSpot, NOW)
    for (const phase of Object.values(result.tidePhasesByHour)) {
      expect(phase).toBe('slack')
    }
  })
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npx jest __tests__/scoringService.test.ts --no-coverage`
Expected: FAIL — "Property 'tidePhasesByHour' does not exist on type 'ConditionsData'" OR the type compiles but `result.tidePhasesByHour` is undefined.

- [ ] **Step 10: Add `tidePhasesByHour` to the type**

In `types/conditions.ts`, modify the `ConditionsData` interface. Find this block:

```typescript
export interface ConditionsData {
  fishingScore: number
  scoreLabel: string
  ...
  hourlyScores: HourlyScore[]
}
```

Add a new field at the end (immediately after `hourlyScores: HourlyScore[]`):

```typescript
  tidePhasesByHour: Record<number, TidePhase>
```

Note: `TidePhase` is already imported at the top of `types/conditions.ts` — verify it is. If not, add it. (Current file at the top should already export `TidePhase`.)

- [ ] **Step 11: Populate `tidePhasesByHour` in `buildConditionsData`**

In `services/scoringService.ts`, inside `buildConditionsData`, find the existing for-loop that builds `hourlyScores`:

```typescript
const hourlyScores: HourlyScore[] = []
for (let h = 5; h <= 20; h++) {
  const hourTide = hourlyCurve.length > 0
    ? { phase: detectPhase(hourlyCurve, h), hoursFromTurn: hoursFromLastTurn(hourlyCurve, h) }
    : null
  ...
}
```

Change it to also populate `tidePhasesByHour`:

```typescript
const hourlyScores: HourlyScore[] = []
const tidePhasesByHour: Record<number, import('../features/tide/tideUtils').TidePhase> = {}
for (let h = 5; h <= 20; h++) {
  const phase = hourlyCurve.length > 0 ? detectPhase(hourlyCurve, h) : 'slack'
  tidePhasesByHour[h] = phase
  const hourTide = hourlyCurve.length > 0
    ? { phase, hoursFromTurn: hoursFromLastTurn(hourlyCurve, h) }
    : null
  // ...rest of the loop body unchanged
}
```

Then in the returned object at the bottom of `buildConditionsData`, add `tidePhasesByHour` as a new field after `hourlyScores`:

```typescript
return {
  ...
  hourlyScores,
  tidePhasesByHour,
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx jest __tests__/scoringService.test.ts --no-coverage`
Expected: PASS — all existing 8 tests pass plus the 2 new ones.

- [ ] **Step 13: Run full test suite + typecheck to catch regressions**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: All 69 existing tests still pass plus the 4 new (bestWindow) + 2 new (scoringService) = 75 total. Typecheck has only the documented pre-existing `spots.tsx(63,27)` expo-router error.

### Task 1.4 — Per-species hourly scoring engine

- [ ] **Step 14: Export `hourToTimeOfDay` from speciesScoring**

In `features/species/speciesScoring.ts`, find this function:

```typescript
function hourToTimeOfDay(hour: number): TimeOfDay {
```

Change to:

```typescript
export function hourToTimeOfDay(hour: number): TimeOfDay {
```

- [ ] **Step 15: Write failing tests for `speciesHourlyScoring`**

Create `__tests__/speciesHourlyScoring.test.ts`:

```typescript
import {
  scoreSpeciesHourly,
  bestWindowSummary,
  describeBestWindow,
} from '../features/species/speciesHourlyScoring'
import { westCoastSpecies } from '../data/species/westCoast'
import type { TidePhase } from '../features/tide/tideUtils'

const halibut = westCoastSpecies.find(s => s.id === 'ca_halibut')!

function constantPhases(phase: TidePhase): Record<number, TidePhase> {
  const out: Record<number, TidePhase> = {}
  for (let h = 5; h <= 20; h++) out[h] = phase
  return out
}

describe('scoreSpeciesHourly', () => {
  it('returns 16 entries for hours 5..20', () => {
    const result = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    expect(result).toHaveLength(16)
    expect(result[0].hour).toBe(5)
    expect(result[15].hour).toBe(20)
  })

  it('returns all zeros for out-of-season species', () => {
    const result = scoreSpeciesHourly(halibut, {
      month: 1,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    expect(result.every(e => e.score === 0)).toBe(true)
  })

  it('scores higher during preferred time-of-day', () => {
    const result = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    // halibut prefers dawn/morning per westCoast.ts — confirm dawn hour 7 beats midday hour 13
    const dawnEntry = result.find(e => e.hour === 7)!
    const middayEntry = result.find(e => e.hour === 13)!
    expect(dawnEntry.score).toBeGreaterThan(middayEntry.score)
  })

  it('tide phase varies score per hour', () => {
    const mixedPhases: Record<number, TidePhase> = {}
    for (let h = 5; h <= 20; h++) {
      mixedPhases[h] = h < 12 ? 'incoming' : 'outgoing'
    }
    const incomingResult = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: mixedPhases,
    })
    const allIncoming = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,
      tidePhasesByHour: constantPhases('incoming'),
    })
    // halibut prefers incoming — afternoon hours should be lower when outgoing
    const mixedAfternoon = incomingResult.find(e => e.hour === 14)!.score
    const allIncomingAfternoon = allIncoming.find(e => e.hour === 14)!.score
    expect(mixedAfternoon).toBeLessThanOrEqual(allIncomingAfternoon)
  })

  it('cold-water mismatch lowers all hours', () => {
    const cold = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 40,  // way below halibut range
      tidePhasesByHour: constantPhases('incoming'),
    })
    const warm = scoreSpeciesHourly(halibut, {
      month: 6,
      waterTemp: 62,  // peak range
      tidePhasesByHour: constantPhases('incoming'),
    })
    // every hour cold ≤ corresponding warm
    for (let i = 0; i < cold.length; i++) {
      expect(cold[i].score).toBeLessThanOrEqual(warm[i].score)
    }
    // and at least some hours should be strictly lower
    expect(cold.some((e, i) => e.score < warm[i].score)).toBe(true)
  })
})

describe('bestWindowSummary', () => {
  it('finds peak window in a mid-day curve', () => {
    const hourly = [
      { hour: 5, score: 40 }, { hour: 6, score: 50 }, { hour: 7, score: 60 },
      { hour: 8, score: 70 }, { hour: 9, score: 80 }, { hour: 10, score: 75 },
      { hour: 11, score: 65 }, { hour: 12, score: 55 }, { hour: 13, score: 50 },
      { hour: 14, score: 45 }, { hour: 15, score: 40 }, { hour: 16, score: 40 },
      { hour: 17, score: 40 }, { hour: 18, score: 40 }, { hour: 19, score: 40 },
      { hour: 20, score: 40 },
    ]
    const result = bestWindowSummary(hourly)
    expect(result).not.toBeNull()
    expect(result!.start).toBe(8)
    expect(result!.end).toBe(10)
    expect(result!.avgScore).toBe(75)
    expect(result!.peakHour).toBe(9)
    expect(result!.peakScore).toBe(80)
  })

  it('returns null for all-zero input', () => {
    const hourly = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    expect(bestWindowSummary(hourly)).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(bestWindowSummary([])).toBeNull()
  })
})

describe('describeBestWindow', () => {
  const lateAfternoonPeak = [
    { hour: 5, score: 40 }, { hour: 6, score: 45 }, { hour: 7, score: 50 },
    { hour: 8, score: 50 }, { hour: 9, score: 55 }, { hour: 10, score: 55 },
    { hour: 11, score: 55 }, { hour: 12, score: 60 }, { hour: 13, score: 60 },
    { hour: 14, score: 65 }, { hour: 15, score: 70 }, { hour: 16, score: 75 },
    { hour: 17, score: 80 }, { hour: 18, score: 78 }, { hour: 19, score: 60 },
    { hour: 20, score: 50 },
  ]

  it('returns "peaking-now" when current is within 5 of max', () => {
    const result = describeBestWindow(lateAfternoonPeak, 17)
    expect(result).toEqual({ kind: 'peaking-now' })
  })

  it('returns "opens-at" when peak is later', () => {
    const result = describeBestWindow(lateAfternoonPeak, 10)
    expect(result).toEqual({ kind: 'opens-at', atHour: 17 })
  })

  it('returns "window" when peak is earlier than current', () => {
    // earlierPeak: peak at 7, current 14
    const earlierPeak = [
      { hour: 5, score: 40 }, { hour: 6, score: 60 }, { hour: 7, score: 80 },
      { hour: 8, score: 75 }, { hour: 9, score: 70 }, { hour: 10, score: 60 },
      { hour: 11, score: 50 }, { hour: 12, score: 45 }, { hour: 13, score: 45 },
      { hour: 14, score: 40 }, { hour: 15, score: 40 }, { hour: 16, score: 40 },
      { hour: 17, score: 40 }, { hour: 18, score: 40 }, { hour: 19, score: 40 },
      { hour: 20, score: 40 },
    ]
    const result = describeBestWindow(earlierPeak, 14)
    expect(result?.kind).toBe('window')
    if (result?.kind === 'window') {
      expect(result.start).toBe(6)
      expect(result.end).toBe(8)
    }
  })

  it('returns null for all-zero input', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    expect(describeBestWindow(zeros, 12)).toBeNull()
  })
})
```

- [ ] **Step 16: Run test to verify it fails**

Run: `npx jest __tests__/speciesHourlyScoring.test.ts --no-coverage`
Expected: FAIL with "Cannot find module '../features/species/speciesHourlyScoring'".

- [ ] **Step 17: Implement `speciesHourlyScoring`**

Create `features/species/speciesHourlyScoring.ts`:

```typescript
import type { Species } from '../../types/species'
import type { TidePhase } from '../tide/tideUtils'
import { hourToTimeOfDay } from './speciesScoring'
import { findBestThreeHourWindow } from '../score/bestWindow'

export interface SpeciesHourlyScore {
  hour: number   // 5..20 (hour-of-day, 24h)
  score: number  // 0..100
}

export interface SpeciesHourlyContext {
  month: number  // 1..12
  waterTemp: number  // °F
  tidePhasesByHour: Record<number, TidePhase>  // keys 5..20
}

export interface SpeciesBestWindow {
  start: number      // hour-of-day
  end: number        // hour-of-day (start + 2)
  avgScore: number
  peakHour: number
  peakScore: number
}

export type WindowHint =
  | { kind: 'peaking-now' }
  | { kind: 'opens-at'; atHour: number }
  | { kind: 'window'; start: number; end: number }

const HOURS = Array.from({ length: 16 }, (_, i) => 5 + i)  // [5..20]

function monthPoints(species: Species, month: number): number {
  if (!species.months_present.includes(month)) return 0
  if (species.months_peak.includes(month)) return 40
  return 20
}

function tempPoints(species: Species, waterTemp: number): number {
  const { min, max, peak_min, peak_max } = species.water_temp_f
  if (waterTemp >= peak_min && waterTemp <= peak_max) return 30
  if (waterTemp >= min && waterTemp <= max) return 20
  if (waterTemp >= min - 5 && waterTemp <= max + 5) return 10
  return 0
}

function tidePoints(species: Species, tidePhase: TidePhase): number {
  if (species.preferred_tide === 'any') return 15
  if (species.preferred_tide === tidePhase) return 15
  if (tidePhase === 'slack') return 8
  return 5
}

function timePoints(species: Species, hour: number): number {
  const tod = hourToTimeOfDay(hour)
  if (species.preferred_time_of_day.includes(tod)) return 15
  return 5
}

export function scoreSpeciesHourly(
  species: Species,
  ctx: SpeciesHourlyContext
): SpeciesHourlyScore[] {
  if (!species.months_present.includes(ctx.month)) {
    return HOURS.map(h => ({ hour: h, score: 0 }))
  }

  const monthPts = monthPoints(species, ctx.month)
  const tempPts = tempPoints(species, ctx.waterTemp)

  return HOURS.map(h => {
    const phase = ctx.tidePhasesByHour[h] ?? 'slack'
    const score = Math.min(100, monthPts + tempPts + tidePoints(species, phase) + timePoints(species, h))
    return { hour: h, score }
  })
}

export function bestWindowSummary(
  hourly: SpeciesHourlyScore[]
): SpeciesBestWindow | null {
  if (hourly.length === 0) return null
  if (hourly.every(e => e.score === 0)) return null
  const startHour = hourly[0].hour
  const window = findBestThreeHourWindow(hourly.map(e => e.score), startHour)
  if (!window) return null

  let peakHour = window.startHour
  let peakScore = -1
  for (const e of hourly) {
    if (e.hour >= window.startHour && e.hour <= window.endHour && e.score > peakScore) {
      peakScore = e.score
      peakHour = e.hour
    }
  }

  return {
    start: window.startHour,
    end: window.endHour,
    avgScore: window.avgScore,
    peakHour,
    peakScore,
  }
}

export function describeBestWindow(
  hourly: SpeciesHourlyScore[],
  currentHour: number
): WindowHint | null {
  if (hourly.length === 0) return null
  if (hourly.every(e => e.score === 0)) return null

  const maxScore = Math.max(...hourly.map(e => e.score))
  const maxEntry = hourly.find(e => e.score === maxScore)!
  const currentEntry = hourly.find(e => e.hour === currentHour)

  if (currentEntry && currentEntry.score >= maxScore - 5) {
    return { kind: 'peaking-now' }
  }
  if (maxEntry.hour > currentHour) {
    return { kind: 'opens-at', atHour: maxEntry.hour }
  }
  const window = bestWindowSummary(hourly)
  if (!window) return null
  return { kind: 'window', start: window.start, end: window.end }
}
```

- [ ] **Step 18: Run test to verify it passes**

Run: `npx jest __tests__/speciesHourlyScoring.test.ts --no-coverage`
Expected: PASS — all tests in the file pass.

- [ ] **Step 19: Run full test suite + typecheck**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: All tests pass. Typecheck has only the known pre-existing error.

- [ ] **Step 20: Commit Task 1**

```bash
git add features/score/bestWindow.ts features/species/speciesHourlyScoring.ts features/species/speciesScoring.ts services/scoringService.ts types/conditions.ts __tests__/bestWindow.test.ts __tests__/speciesHourlyScoring.test.ts __tests__/scoringService.test.ts
git commit -m "feat: per-species hourly scoring engine + shared best-window util"
```

---

## Task 2: SpeciesHourlyChart + SpeciesDetail integration

**Goal of this task:** Build the per-species hourly bar chart, insert it into `SpeciesDetail`, and add the best-window summary line. Free users see the chart with an upsell banner (matches `ScoreTimeline` pattern).

**Files:**
- Create: `features/species/SpeciesHourlyChart.tsx`
- Create: `__tests__/SpeciesHourlyChart.test.tsx`
- Modify: `features/species/SpeciesDetail.tsx`

### Task 2.1 — SpeciesHourlyChart component

- [ ] **Step 1: Read ScoreTimeline for style reference**

Re-read `features/score/ScoreTimeline.tsx` to confirm the visual pattern (bar width 28, max height 80, current-hour border, Pro banner styling). You will mirror this.

- [ ] **Step 2: Write the failing test**

Create `__tests__/SpeciesHourlyChart.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { SpeciesHourlyChart } from '../features/species/SpeciesHourlyChart'
import { useSettingsStore } from '../store/settingsStore'

function fakeHourly() {
  return Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 40 + i * 3 }))
}

describe('SpeciesHourlyChart', () => {
  beforeEach(() => {
    useSettingsStore.setState({ isPro: false })
  })

  it('renders 16 bars', () => {
    const { getAllByTestId } = render(<SpeciesHourlyChart hourly={fakeHourly()} />)
    expect(getAllByTestId(/species-hourly-bar-/)).toHaveLength(16)
  })

  it('shows Pro banner when user is not Pro', () => {
    const { getByText } = render(<SpeciesHourlyChart hourly={fakeHourly()} />)
    expect(getByText(/Pro/i)).toBeTruthy()
  })

  it('hides Pro banner when user is Pro', () => {
    useSettingsStore.setState({ isPro: true })
    const { queryByText } = render(<SpeciesHourlyChart hourly={fakeHourly()} />)
    expect(queryByText(/Unlock/i)).toBeNull()
  })

  it('renders nothing for all-zero hourly', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    const { queryAllByTestId } = render(<SpeciesHourlyChart hourly={zeros} />)
    expect(queryAllByTestId(/species-hourly-bar-/)).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/SpeciesHourlyChart.test.tsx --no-coverage`
Expected: FAIL with "Cannot find module '../features/species/SpeciesHourlyChart'".

- [ ] **Step 4: Implement the component**

Create `features/species/SpeciesHourlyChart.tsx`:

```tsx
import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import { useSettingsStore } from '../../store/settingsStore'
import type { SpeciesHourlyScore } from './speciesHourlyScoring'

interface Props {
  hourly: SpeciesHourlyScore[]
  onUpgrade?: () => void
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 28

function formatHourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

export function SpeciesHourlyChart({ hourly, onUpgrade }: Props) {
  const isPro = useSettingsStore(s => s.isPro)

  if (hourly.length === 0 || hourly.every(e => e.score === 0)) return null

  const maxScore = Math.max(...hourly.map(e => e.score))
  const nowH = new Date().getHours()

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {hourly.map(item => {
          const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
          const isPeak = item.score === maxScore
          const isNow = item.hour === nowH
          const color = scoreColor(item.score)
          return (
            <View key={item.hour} style={styles.barWrapper} testID={`species-hourly-bar-${item.hour}`}>
              <Text style={[styles.scoreLabel, isPeak && { color }]}>{item.score}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.65 },
                  isNow && { borderWidth: 2, borderColor: Colors.accent },
                ]} />
              </View>
              <Text style={[styles.hourLabel, isPeak && styles.hourLabelPeak]}>{formatHourLabel(item.hour)}</Text>
            </View>
          )
        })}
      </ScrollView>

      {!isPro && (
        <TouchableOpacity style={styles.proBanner} onPress={onUpgrade} activeOpacity={0.8}>
          <Text style={styles.proBannerText}>🔒 Unlock per-species bite windows</Text>
          <Text style={styles.proBannerCta}>Go Pro →</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  scroll: { paddingBottom: Spacing.xs, gap: Spacing.xs },
  barWrapper: { alignItems: 'center', width: BAR_WIDTH + 8 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  hourLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  hourLabelPeak: { color: Colors.textSecondary, fontWeight: '600' },
  scoreLabel: { fontSize: 10, color: Colors.textTertiary, fontWeight: '600', height: 14 },
  proBanner: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.accent + '12',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  proBannerText: { fontSize: 12, color: Colors.textSecondary },
  proBannerCta: { fontSize: 12, fontWeight: '700', color: Colors.accent },
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/SpeciesHourlyChart.test.tsx --no-coverage`
Expected: PASS — 4 tests.

### Task 2.2 — Wire chart and summary line into SpeciesDetail

- [ ] **Step 6: Modify SpeciesDetail to accept hourly data and conditions**

In `features/species/SpeciesDetail.tsx`, update the `Props` interface and component signature. Change:

```typescript
interface Props {
  speciesScore: SpeciesScore
}

export function SpeciesDetail({ speciesScore }: Props) {
```

to:

```typescript
import type { SpeciesHourlyScore } from './speciesHourlyScoring'
import { bestWindowSummary } from './speciesHourlyScoring'
import { SpeciesHourlyChart } from './SpeciesHourlyChart'

interface Props {
  speciesScore: SpeciesScore
  hourly?: SpeciesHourlyScore[]   // when omitted, chart section is hidden
  onUpgrade?: () => void
}

export function SpeciesDetail({ speciesScore, hourly, onUpgrade }: Props) {
```

Note: The existing `SpeciesDetail` component takes only `speciesScore`. We're adding optional `hourly` and `onUpgrade` so the screen `app/species/[id].tsx` can pass them in.

- [ ] **Step 7: Add the chart + summary section in the JSX**

In the same file, locate this block:

```tsx
      <Text style={styles.sectionTitle}>Current Match</Text>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Water Temp</Text><Text style={styles.matchValue}>{waterTempMatch}</Text></View>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Tide</Text><Text style={styles.matchValue}>{tideMatch}</Text></View>
      <View style={styles.matchRow}><Text style={styles.matchLabel}>Time of Day</Text><Text style={styles.matchValue}>{timeMatch}</Text></View>

      <Text style={styles.sectionTitle}>Fishing Tips</Text>
```

Between the Time of Day row and the "Fishing Tips" title, insert:

```tsx
      {hourly && hourly.some(e => e.score > 0) && (
        <>
          <Text style={styles.sectionTitle}>Hourly Bite Window</Text>
          {(() => {
            const summary = bestWindowSummary(hourly)
            if (!summary) return null
            return (
              <Text style={styles.summary}>
                Best window: {formatHour(summary.start)}–{formatHour(summary.end + 1)} · avg {summary.avgScore}
              </Text>
            )
          })()}
          <SpeciesHourlyChart hourly={hourly} onUpgrade={onUpgrade} />
        </>
      )}
```

Add a helper function above the component:

```typescript
function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}
```

Add to the styles block at the bottom:

```typescript
  summary: { fontSize: 14, color: Colors.textPrimary, marginBottom: Spacing.sm },
```

- [ ] **Step 8: Add `scoredHourlyByMap` memo to the dashboard**

In `app/(tabs)/index.tsx`, add the import near the other species imports:

```typescript
import { scoreSpeciesHourly, type SpeciesHourlyScore } from '../../features/species/speciesHourlyScoring'
```

After the existing `scoredSpecies` useMemo block (which ends around line 81 with `}, [activeSpot, conditions, currentHour, isPro])`), add a new memo:

```tsx
  const scoredHourlyByMap = useMemo(() => {
    const map: Record<string, SpeciesHourlyScore[]> = {}
    if (!activeSpot || !conditions) return map
    for (const ss of scoredSpecies) {
      map[ss.species.id] = scoreSpeciesHourly(ss.species, {
        month: now.getMonth() + 1,
        waterTemp: conditions.water.temp,
        tidePhasesByHour: conditions.tidePhasesByHour,
      })
    }
    return map
  }, [scoredSpecies, activeSpot, conditions])
```

- [ ] **Step 9: Pass `hourlyData` param from dashboard species rows**

In `app/(tabs)/index.tsx`, find this line (currently around line 225):

```tsx
router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss) } })
```

Replace with:

```tsx
router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[ss.species.id] ?? []) } })
```

- [ ] **Step 10: Update `app/species/[id].tsx` to parse hourly + pass to SpeciesDetail**

The current file is 14 lines. Replace its entire contents with:

```tsx
import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SpeciesDetail } from '../../features/species/SpeciesDetail'
import type { SpeciesScore } from '../../types/species'
import type { SpeciesHourlyScore } from '../../features/species/speciesHourlyScoring'

export default function SpeciesDetailScreen() {
  const router = useRouter()
  const { data, hourlyData } = useLocalSearchParams<{ id: string; data: string; hourlyData?: string }>()

  if (!data) return null

  const speciesScore: SpeciesScore = JSON.parse(data)
  const hourly: SpeciesHourlyScore[] | undefined = hourlyData ? JSON.parse(hourlyData) : undefined

  return (
    <SpeciesDetail
      speciesScore={speciesScore}
      hourly={hourly}
      onUpgrade={() => router.push('/settings')}
    />
  )
}
```

- [ ] **Step 11: Run full test suite + typecheck**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: All tests pass. Typecheck shows only the known pre-existing error.

- [ ] **Step 12: Commit Task 2**

```bash
git add features/species/SpeciesHourlyChart.tsx features/species/SpeciesDetail.tsx app/species/\[id\].tsx app/\(tabs\)/index.tsx __tests__/SpeciesHourlyChart.test.tsx
git commit -m "feat: per-species hourly bite chart in species detail"
```

---

## Task 3: SpeciesCard best-window subtitle

**Goal of this task:** Add a one-line "Best Xpm–Ypm · score" subtitle under each species name on the dashboard list. Free for everyone.

**Files:**
- Modify: `features/species/SpeciesCard.tsx`
- Modify: `app/(tabs)/index.tsx` (pass hourly to each card)

### Task 3.1 — Subtitle in SpeciesCard

- [ ] **Step 1: Update SpeciesCard props**

In `features/species/SpeciesCard.tsx`, change the `Props` interface and component signature:

```typescript
import { bestWindowSummary, type SpeciesHourlyScore } from './speciesHourlyScoring'

interface Props {
  speciesScore: SpeciesScore
  hourly?: SpeciesHourlyScore[]
  isPro: boolean
  onPress: () => void
}

export function SpeciesCard({ speciesScore, hourly, isPro, onPress }: Props) {
```

- [ ] **Step 2: Compute and render the subtitle**

In the same file, inside the component body, after `const color = scoreColor(score)`, add:

```typescript
  const window = hourly ? bestWindowSummary(hourly) : null
```

Add a helper function above the component:

```typescript
function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}
```

In the JSX, find:

```tsx
        <View style={styles.info}>
          <Text style={[styles.name, isLocked && styles.locked]}>
            {isLocked ? '🔒 Pro Species' : species.common_name}
          </Text>
          <Text style={[styles.status, { color: statusColor[status] ?? Colors.textSecondary }]}>
            {status}
          </Text>
        </View>
```

Replace with:

```tsx
        <View style={styles.info}>
          <Text style={[styles.name, isLocked && styles.locked]}>
            {isLocked ? '🔒 Pro Species' : species.common_name}
          </Text>
          <Text style={[styles.status, { color: statusColor[status] ?? Colors.textSecondary }]}>
            {status}
          </Text>
          {window && !isLocked && (
            <Text style={styles.bestWindow}>
              Best {formatHour(window.start)}–{formatHour(window.end + 1)} · {window.avgScore}
            </Text>
          )}
        </View>
```

Add to the styles block:

```typescript
  bestWindow: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
```

- [ ] **Step 3: Pass hourly to each card in dashboard**

In `app/(tabs)/index.tsx`, find the species list rendering:

```tsx
              scoredSpecies.map(ss => (
                <SpeciesCard
                  key={ss.species.id}
                  speciesScore={ss}
                  isPro={isPro}
                  onPress={() => {
                    if (ss.species.tier === 'pro' && !isPro) return
                    router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[ss.species.id] ?? []) } })
                  }}
                />
              ))
```

Add `hourly`:

```tsx
              scoredSpecies.map(ss => (
                <SpeciesCard
                  key={ss.species.id}
                  speciesScore={ss}
                  hourly={scoredHourlyByMap[ss.species.id]}
                  isPro={isPro}
                  onPress={() => {
                    if (ss.species.tier === 'pro' && !isPro) return
                    router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[ss.species.id] ?? []) } })
                  }}
                />
              ))
```

- [ ] **Step 4: Run full test suite + typecheck**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: All tests pass. Typecheck: only the pre-existing error.

- [ ] **Step 5: Commit Task 3**

```bash
git add features/species/SpeciesCard.tsx app/\(tabs\)/index.tsx
git commit -m "feat: best-window subtitle on species cards"
```

---

## Task 4: ActiveRightNow dashboard callout

**Goal of this task:** Build the "Active Right Now" card showing the top 3 species by current-hour bite score, with a contextual hint per row. Render it above the existing "What's Biting" list on the dashboard.

**Files:**
- Create: `features/species/ActiveRightNow.tsx`
- Create: `__tests__/ActiveRightNow.test.tsx`
- Modify: `app/(tabs)/index.tsx`

### Task 4.1 — Component

- [ ] **Step 1: Write the failing test**

Create `__tests__/ActiveRightNow.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ActiveRightNow } from '../features/species/ActiveRightNow'
import type { Species } from '../types/species'
import type { SpeciesHourlyScore } from '../features/species/speciesHourlyScoring'

const mockSpecies: Species[] = [
  {
    id: 'sp_a', common_name: 'Striped Bass', scientific_name: 'X', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [6],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','morning'],
    migration_notes: '', tips: '',
  },
  {
    id: 'sp_b', common_name: 'Halibut', scientific_name: 'Y', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [6],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: ['afternoon'],
    migration_notes: '', tips: '',
  },
]

function mkHourly(peakHour: number, peakScore: number): SpeciesHourlyScore[] {
  return Array.from({ length: 16 }, (_, i) => {
    const hour = 5 + i
    const distance = Math.abs(hour - peakHour)
    return { hour, score: Math.max(0, peakScore - distance * 5) }
  })
}

describe('ActiveRightNow', () => {
  it('renders top species sorted by current-hour score', () => {
    const hourlyByMap = {
      sp_a: mkHourly(17, 80),  // peak at 5pm
      sp_b: mkHourly(12, 90),  // peak at noon
    }
    const { getByText } = render(
      <ActiveRightNow
        species={mockSpecies}
        hourlyByMap={hourlyByMap}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    // At hour 12: sp_a score = 80 - 5*5 = 55, sp_b score = 90
    // Halibut (sp_b) should be first
    expect(getByText('Halibut')).toBeTruthy()
    expect(getByText('Striped Bass')).toBeTruthy()
  })

  it('hides card when no species in season', () => {
    const { queryByText } = render(
      <ActiveRightNow
        species={[]}
        hourlyByMap={{}}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    expect(queryByText(/Active Right Now/i)).toBeNull()
  })

  it('hides card when all species have score 0', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    const { queryByText } = render(
      <ActiveRightNow
        species={mockSpecies}
        hourlyByMap={{ sp_a: zeros, sp_b: zeros }}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    expect(queryByText(/Active Right Now/i)).toBeNull()
  })

  it('tap calls onPressSpecies with id', () => {
    const onPress = jest.fn()
    const hourlyByMap = {
      sp_a: mkHourly(12, 90),
      sp_b: mkHourly(17, 80),
    }
    const { getByTestId } = render(
      <ActiveRightNow
        species={mockSpecies}
        hourlyByMap={hourlyByMap}
        currentHour={12}
        onPressSpecies={onPress}
      />
    )
    fireEvent.press(getByTestId('active-row-sp_a'))
    expect(onPress).toHaveBeenCalledWith('sp_a')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/ActiveRightNow.test.tsx --no-coverage`
Expected: FAIL with "Cannot find module '../features/species/ActiveRightNow'".

- [ ] **Step 3: Implement the component**

Create `features/species/ActiveRightNow.tsx`:

```tsx
import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { scoreColor } from '../score/scoringEngine'
import { describeBestWindow, type SpeciesHourlyScore } from './speciesHourlyScoring'
import type { Species } from '../../types/species'

interface Props {
  species: Species[]
  hourlyByMap: Record<string, SpeciesHourlyScore[]>
  currentHour: number
  onPressSpecies: (id: string) => void
}

function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

function hintLabel(hourly: SpeciesHourlyScore[], currentHour: number): string {
  const hint = describeBestWindow(hourly, currentHour)
  if (!hint) return ''
  switch (hint.kind) {
    case 'peaking-now': return 'Peaking now'
    case 'opens-at': return `Opens ${formatHour(hint.atHour)}`
    case 'window': return `Window ${formatHour(hint.start)}–${formatHour(hint.end + 1)}`
  }
}

export function ActiveRightNow({ species, hourlyByMap, currentHour, onPressSpecies }: Props) {
  const rows = useMemo(() => {
    return species
      .map(sp => {
        const hourly = hourlyByMap[sp.id]
        if (!hourly || hourly.length === 0) return null
        const currentEntry = hourly.find(e => e.hour === currentHour)
        const currentScore = currentEntry?.score ?? 0
        if (currentScore === 0) return null
        return { species: sp, hourly, currentScore }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.currentScore - a.currentScore)
      .slice(0, 3)
  }, [species, hourlyByMap, currentHour])

  if (rows.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={Typography.sectionTitle}>Active Right Now</Text>
      <View style={styles.card}>
        {rows.map((row, idx) => {
          const color = scoreColor(row.currentScore)
          return (
            <TouchableOpacity
              key={row.species.id}
              testID={`active-row-${row.species.id}`}
              style={[styles.row, idx > 0 && styles.rowBorder]}
              onPress={() => onPressSpecies(row.species.id)}
            >
              <Text style={styles.name}>{row.species.common_name}</Text>
              <Text style={styles.hint}>{hintLabel(row.hourly, currentHour)}</Text>
              <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
                <Text style={[styles.badgeScore, { color }]}>{row.currentScore}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  hint: { fontSize: 12, color: Colors.textSecondary },
  badge: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeScore: { fontSize: 13, fontWeight: '700' },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/ActiveRightNow.test.tsx --no-coverage`
Expected: PASS — 4 tests.

### Task 4.2 — Wire ActiveRightNow into dashboard

- [ ] **Step 5: Add `<ActiveRightNow>` above the "What's Biting" section**

In `app/(tabs)/index.tsx`, add the import:

```typescript
import { ActiveRightNow } from '../../features/species/ActiveRightNow'
```

Find the "What's Biting" section:

```tsx
            <View style={styles.section}>
              <Text style={Typography.sectionTitle}>What's Biting</Text>
```

Just BEFORE that section block, insert:

```tsx
            <ActiveRightNow
              species={scoredSpecies
                .filter(ss => isPro || ss.species.tier === 'free')
                .map(ss => ss.species)}
              hourlyByMap={scoredHourlyByMap}
              currentHour={currentHour}
              onPressSpecies={(id) => {
                const ss = scoredSpecies.find(s => s.species.id === id)
                if (!ss) return
                router.push({
                  pathname: '/species/[id]',
                  params: { id, data: JSON.stringify(ss), hourlyData: JSON.stringify(scoredHourlyByMap[id] ?? []) },
                })
              }}
            />
```

- [ ] **Step 6: Run full test suite + typecheck**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: All tests pass. Typecheck: only the pre-existing error.

- [ ] **Step 7: Commit Task 4**

```bash
git add features/species/ActiveRightNow.tsx app/\(tabs\)/index.tsx __tests__/ActiveRightNow.test.tsx
git commit -m "feat: Active Right Now top-3 species callout on dashboard"
```

---

## Task 5: Per-species alerts settings + store

**Goal of this task:** Add `speciesAlerts` state to `settingsStore`, build a Pro-gated `SpeciesAlertsSection` in Settings. No push delivery yet.

**Files:**
- Modify: `store/settingsStore.ts`
- Create: `__tests__/settingsStore.test.ts`
- Create: `features/settings/SpeciesAlertsSection.tsx`
- Create: `__tests__/SpeciesAlertsSection.test.tsx`
- Modify: `app/(tabs)/settings.tsx`

### Task 5.1 — Extend settingsStore

- [ ] **Step 1: Write failing tests for new store methods**

Create `__tests__/settingsStore.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native'
import { useSettingsStore } from '../store/settingsStore'

describe('settingsStore.speciesAlerts', () => {
  beforeEach(() => {
    useSettingsStore.setState({ speciesAlerts: {}, alertThreshold: 70 })
  })

  it('starts with empty speciesAlerts', () => {
    expect(useSettingsStore.getState().speciesAlerts).toEqual({})
  })

  it('setSpeciesAlert persists a new entry with defaults from global threshold', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: true }) })
    expect(result.current.speciesAlerts['sp_a']).toEqual({ threshold: 70, enabled: true })
  })

  it('setSpeciesAlert merges partial updates without losing existing fields', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: true, threshold: 80 }) })
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: false }) })
    expect(result.current.speciesAlerts['sp_a']).toEqual({ threshold: 80, enabled: false })
  })

  it('clearSpeciesAlert removes the entry', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: true }) })
    act(() => { result.current.clearSpeciesAlert('sp_a') })
    expect(result.current.speciesAlerts['sp_a']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/settingsStore.test.ts --no-coverage`
Expected: FAIL — `setSpeciesAlert is not a function`.

- [ ] **Step 3: Add `speciesAlerts` to the store**

In `store/settingsStore.ts`, modify the `SettingsState` interface and the store implementation. Replace the entire file with:

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface SpeciesAlert {
  threshold: number
  enabled: boolean
}

interface SettingsState {
  tempUnit: 'F' | 'C'
  speedUnit: 'mph' | 'kts'
  lengthUnit: 'ft' | 'm'
  alertThreshold: number
  alertsEnabled: boolean
  isPro: boolean
  speciesAlerts: Record<string, SpeciesAlert>
  setTempUnit: (u: 'F' | 'C') => void
  setSpeedUnit: (u: 'mph' | 'kts') => void
  setLengthUnit: (u: 'ft' | 'm') => void
  setAlertThreshold: (n: number) => void
  setAlertsEnabled: (v: boolean) => void
  setIsPro: (v: boolean) => void
  setSpeciesAlert: (speciesId: string, alert: Partial<SpeciesAlert>) => void
  clearSpeciesAlert: (speciesId: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      tempUnit: 'F',
      speedUnit: 'mph',
      lengthUnit: 'ft',
      alertThreshold: 70,
      alertsEnabled: false,
      isPro: false,
      speciesAlerts: {},
      setTempUnit: (tempUnit) => set({ tempUnit }),
      setSpeedUnit: (speedUnit) => set({ speedUnit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setAlertThreshold: (alertThreshold) => set({ alertThreshold }),
      setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
      setIsPro: (isPro) => set({ isPro }),
      setSpeciesAlert: (speciesId, partial) => {
        const existing = get().speciesAlerts[speciesId]
        const merged: SpeciesAlert = {
          threshold: partial.threshold ?? existing?.threshold ?? get().alertThreshold,
          enabled: partial.enabled ?? existing?.enabled ?? false,
        }
        set({ speciesAlerts: { ...get().speciesAlerts, [speciesId]: merged } })
      },
      clearSpeciesAlert: (speciesId) => {
        const next = { ...get().speciesAlerts }
        delete next[speciesId]
        set({ speciesAlerts: next })
      },
    }),
    {
      name: 'fishcast-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/settingsStore.test.ts --no-coverage`
Expected: PASS — 4 tests.

### Task 5.2 — SpeciesAlertsSection component

- [ ] **Step 5: Write failing test**

Create `__tests__/SpeciesAlertsSection.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SpeciesAlertsSection } from '../features/settings/SpeciesAlertsSection'
import { useSettingsStore } from '../store/settingsStore'
import type { Species } from '../types/species'

const mockSpecies: Species[] = [
  {
    id: 'sp_a', common_name: 'Striped Bass', scientific_name: 'X', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [], months_peak: [],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: [],
    migration_notes: '', tips: '',
  },
  {
    id: 'sp_b', common_name: 'Halibut', scientific_name: 'Y', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [], months_peak: [],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: [],
    migration_notes: '', tips: '',
  },
]

describe('SpeciesAlertsSection', () => {
  beforeEach(() => {
    useSettingsStore.setState({ isPro: true, speciesAlerts: {}, alertThreshold: 70 })
  })

  it('renders one row per species', () => {
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} />)
    expect(getByText('Striped Bass')).toBeTruthy()
    expect(getByText('Halibut')).toBeTruthy()
  })

  it('toggle persists enabled state to store', () => {
    const { getByTestId } = render(<SpeciesAlertsSection species={mockSpecies} />)
    const toggle = getByTestId('species-alert-toggle-sp_a')
    fireEvent(toggle, 'valueChange', true)
    expect(useSettingsStore.getState().speciesAlerts['sp_a']?.enabled).toBe(true)
  })

  it('shows locked overlay when not Pro', () => {
    useSettingsStore.setState({ isPro: false })
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} />)
    expect(getByText(/Pro/i)).toBeTruthy()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest __tests__/SpeciesAlertsSection.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement the component**

Create `features/settings/SpeciesAlertsSection.tsx`:

```tsx
import React from 'react'
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native'
import Slider from '@react-native-community/slider'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import type { Species } from '../../types/species'

interface Props {
  species: Species[]
}

export function SpeciesAlertsSection({ species }: Props) {
  const isPro = useSettingsStore(s => s.isPro)
  const speciesAlerts = useSettingsStore(s => s.speciesAlerts)
  const alertThreshold = useSettingsStore(s => s.alertThreshold)
  const setSpeciesAlert = useSettingsStore(s => s.setSpeciesAlert)

  if (species.length === 0) return null

  return (
    <View>
      <Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Per-Species Alerts</Text>
      <View style={styles.card}>
        {species.map((sp, i) => {
          const alert = speciesAlerts[sp.id]
          const threshold = alert?.threshold ?? alertThreshold
          const enabled = alert?.enabled ?? false
          return (
            <View key={sp.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <View style={styles.rowHeader}>
                <Text style={styles.name}>{sp.common_name}</Text>
                <Switch
                  testID={`species-alert-toggle-${sp.id}`}
                  value={enabled}
                  onValueChange={(v) => setSpeciesAlert(sp.id, { enabled: v })}
                  trackColor={{ true: Colors.accent }}
                  disabled={!isPro}
                />
              </View>
              {enabled && isPro && (
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>Notify when score ≥ <Text style={styles.sliderValue}>{threshold}</Text></Text>
                  <Slider
                    style={{ width: '100%' }}
                    minimumValue={40} maximumValue={90} step={5}
                    value={threshold}
                    onValueChange={(v) => setSpeciesAlert(sp.id, { threshold: v })}
                    minimumTrackTintColor={Colors.accent}
                    maximumTrackTintColor={Colors.surface}
                    thumbTintColor={Colors.accent}
                  />
                </View>
              )}
            </View>
          )
        })}
        {!isPro && (
          <TouchableOpacity style={styles.lockedOverlay}>
            <Text style={styles.lockedText}>🔒 Pro feature</Text>
            <Text style={styles.lockedSub}>Get alerts when YOUR species are biting</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionSpacer: { marginTop: Spacing.lg },
  card: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, overflow: 'hidden', position: 'relative' },
  row: { padding: Spacing.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  sliderRow: { marginTop: Spacing.sm },
  sliderLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  sliderValue: { color: Colors.textPrimary, fontWeight: '700' },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockedText: { fontSize: 15, fontWeight: '700', color: Colors.accent },
  lockedSub: { fontSize: 12, color: Colors.textSecondary },
})
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest __tests__/SpeciesAlertsSection.test.tsx --no-coverage`
Expected: PASS — 3 tests.

### Task 5.3 — Mount section in Settings screen

- [ ] **Step 9: Add section to settings tab**

In `app/(tabs)/settings.tsx`, add imports at the top:

```typescript
import { SpeciesAlertsSection } from '../../features/settings/SpeciesAlertsSection'
import { useSpots } from '../../hooks/useSpots'
import { getSpeciesForRegion } from '../../data/species'
```

Inside the `SettingsScreen` component body, before the `return (`, compute the species list for the active spot:

```typescript
  const { activeSpot } = useSpots()
  const speciesForRegion = activeSpot
    ? getSpeciesForRegion(activeSpot.lat, activeSpot.lng)
    : []
```

In the JSX, after the "Alerts" card (the existing one closing `</View>` near line 101) and BEFORE the "Subscription" section title, add:

```tsx
      <SpeciesAlertsSection species={speciesForRegion} />
```

- [ ] **Step 10: Run full test suite + typecheck**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: All tests pass. Typecheck: only the pre-existing error.

- [ ] **Step 11: Commit Task 5**

```bash
git add store/settingsStore.ts features/settings/SpeciesAlertsSection.tsx app/\(tabs\)/settings.tsx __tests__/settingsStore.test.ts __tests__/SpeciesAlertsSection.test.tsx
git commit -m "feat: per-species alert thresholds in settings (UI only, Pro)"
```

---

## Final verification

After all 5 tasks are committed, run a final full pass:

- [ ] **Step 1: Full test suite**

Run: `npx jest --no-coverage`
Expected: All 69 original + ~26 new = ~95 tests pass.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: Only the pre-existing `app/(tabs)/spots.tsx(63,27)` expo-router error.

- [ ] **Step 3: Manual smoke test (UI)**

Start the dev server: `npx expo start`

Verify in the simulator:
1. Dashboard: "Active Right Now" card appears above "What's Biting" (when ≥1 species in season).
2. Each species row in "What's Biting" shows a "Best Xpm–Ypm · score" subtitle.
3. Tap a species → SpeciesDetail modal shows "Hourly Bite Window" section with chart + summary line.
4. As free user: Pro banner under chart.
5. As Pro user (toggle in settings): banner gone.
6. Settings: "Per-Species Alerts" section appears below "Alerts". Free user sees locked overlay; Pro user can toggle and slide threshold per species.

If anything looks wrong, fix it in the relevant task's commit (use a new commit, not amend).

---

## Recap

5 commits, each independently shippable:

1. **Engine + types** — `bestWindow` util, `scoreSpeciesHourly`, `tidePhasesByHour` on `ConditionsData`
2. **Species detail chart** — `SpeciesHourlyChart` + summary line in `SpeciesDetail`
3. **Card subtitle** — best-window line on `SpeciesCard`
4. **Active Right Now** — top-3 dashboard callout
5. **Per-species alerts UI** — `speciesAlerts` in store + settings section

Total: ~26 new tests, no destructive refactors to existing code.
