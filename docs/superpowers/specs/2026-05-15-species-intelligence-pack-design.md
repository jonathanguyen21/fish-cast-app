# Species Intelligence Pack — Design Spec

**Date:** 2026-05-15
**Status:** Approved (pending user re-read)
**Phase:** B3 (between B1 complete and B2 forecast/Phase C)

## Goal

Deepen the species experience in FishCast so users can answer the question *"which fish should I target, and when?"* at a glance. Today the app says "these species are active right now"; this pack adds the missing time dimension — **per-species hourly bite scores** — and surfaces that intelligence in the places users already look.

A secondary goal is retention: the hourly view rewards repeat opens (the chart is different every few hours) and the per-species alert settings give users a concrete reason to enable notifications when Phase C ships.

## Non-goals

- **Push delivery.** The per-species alert *settings UI* and storage ship in this pack. Actual `expo-notifications` integration is Phase C and will read from the storage layer this pack creates.
- **ScoreTimeline refactor.** `SpeciesHourlyChart` is a sibling component, not a generalization of `ScoreTimeline`. A later consolidation pass is fine but out of scope here.
- **Personalization from catch history.** No user log is consumed — scoring is still purely conditions-driven.
- **Per-hour swell/water-temp variation.** Species hourly scoring uses a single water-temp value for the whole day (which is what `buildConditionsData` already does). Tide phase varies per hour; everything else species-relevant does not vary much within one day.
- **Inactive species charts.** When a species is out of season (`!months_present.includes(month)`), the hourly chart is hidden in detail view (it would be all zeros). The species still appears in the list with a "Inactive" badge as today.

## User-visible features

### 1. Per-species hourly bite scoring (engine)

Pure function `scoreSpeciesHourly(species, hourlyCtx)` returns 16 entries for hours 5–20 (matching `ScoreTimeline`). Each entry is `{ hour: number, score: number }`. Internally calls the existing per-hour primitives (`monthPoints`, `tempPoints`, `tidePoints`, `timePoints`) with the appropriate hour and tide phase for each slot.

### 2. Per-species hourly chart in `SpeciesDetail`

New `<SpeciesHourlyChart hourly={...} />` component inserted between "Current Match" and "Fishing Tips" sections. Visual style mirrors `ScoreTimeline`: 16 vertical bars, color via `scoreColor()`, peak hour highlighted, current hour outlined with `Colors.accent`. Below the chart, a one-line summary: **"Best window: 4–7pm (avg 78)"** computed via the shared sliding-window util.

Non-Pro users see the same chart plus an upsell banner directly under it (identical pattern to `ScoreTimeline`'s banner). They can still see the data — the banner is a soft upsell, not a hard gate. (See "Pro tiering" below for why this matches the existing pattern.)

### 3. "Best window today" subtitle on `SpeciesCard`

Add one line under the species name on every row: `"Best 4–7pm · 78"`. Free for everyone — a teaser into the Pro chart. Computed via the same util as #2.

### 4. "Active Right Now" dashboard callout

New `<ActiveRightNow />` component rendered above the existing species list on the dashboard (`app/(tabs)/index.tsx`). Card containing 3 horizontal rows, sorted by *current-hour* bite score (highest first). Each row:

```
🐟 Striped Bass    78    Peaking now
🦈 Halibut         71    Opens 3pm
🐠 Rockfish        68    Window 4–7pm
```

The hint text comes from a util `describeBestWindow(hourlyScores, currentHour)`:
- If current-hour score ≥ (max − 5) → **"Peaking now"**
- Else if max-score hour > current hour → **"Opens {time}"**
- Else → **"Window {start}–{end}"** (the 3-hour best window)

Tapping a row routes to `species/[id]` (already wired). Free for everyone.

Only species `months_present.includes(currentMonth)` are eligible. If fewer than 3 species are in season, render 1–2 rows; if zero, hide the card entirely.

### 5. Per-species alert threshold settings UI

New Pro-gated section "Per-Species Alerts" in `app/(tabs)/settings.tsx`. For each species in the active spot's region:

- Species common name (left)
- Threshold slider, 40–95 in steps of 5 (middle)
- Enable/disable switch (right)

Persisted in `settingsStore` as `Record<speciesId, { threshold: number; enabled: boolean }>`. When a user enables alerts for a species for the first time, the threshold defaults to the global `alertThreshold`. The values are written; reading them and firing notifications is Phase C.

Non-Pro users see the section in a locked state (overlay with Go Pro CTA), matching the existing pattern for Pro features.

## Pro tiering

| Feature | Tier |
|---------|------|
| Engine (`scoreSpeciesHourly`) | n/a (pure code) |
| Per-species hourly chart in SpeciesDetail | Free chart + Pro upsell banner (matches `ScoreTimeline` pattern) |
| Best-window subtitle on `SpeciesCard` | Free |
| `ActiveRightNow` dashboard callout | Free |
| Per-species alert settings UI | Pro-gated (full lock with overlay) |

Existing pattern note: `ScoreTimeline` shows the chart to free users and renders a banner CTA. `SpeciesHourlyChart` matches this exactly to avoid an inconsistent feel. The settings UI gets a stronger lock because it's a config screen, not a data screen — there's nothing useful to show non-Pro users.

## Architecture

### New files

```
features/species/speciesHourlyScoring.ts   # scoreSpeciesHourly, describeBestWindow, bestWindowSummary
features/species/SpeciesHourlyChart.tsx    # chart component
features/species/ActiveRightNow.tsx        # dashboard top-3 callout
features/settings/SpeciesAlertsSection.tsx # settings UI
features/score/bestWindow.ts               # shared 3-hour sliding-window util (extracted)
```

### Modified files

```
types/conditions.ts          # +SpeciesHourlyScore, +tidePhasesByHour on ConditionsData
services/scoringService.ts   # populate tidePhasesByHour; refactor bestWindow to use shared util
features/species/speciesScoring.ts  # export hourToTimeOfDay (currently private) for reuse
features/species/SpeciesCard.tsx    # +best-window subtitle
features/species/SpeciesDetail.tsx  # +<SpeciesHourlyChart>, +best-window summary line
app/(tabs)/index.tsx                # +<ActiveRightNow> above species list
app/(tabs)/settings.tsx             # +<SpeciesAlertsSection>
store/settingsStore.ts              # +speciesAlerts, +setSpeciesAlert, +clearSpeciesAlert
```

### Engine API

```ts
// features/species/speciesHourlyScoring.ts
import type { Species } from '../../types/species'
import type { TidePhase } from '../tide/tideUtils'

export interface SpeciesHourlyScore {
  hour: number  // 5..20 (hour-of-day, 24h)
  score: number // 0..100
}

export interface SpeciesHourlyContext {
  month: number  // 1..12
  waterTemp: number  // °F
  tidePhasesByHour: Record<number, TidePhase>  // keys 5..20
}

export function scoreSpeciesHourly(
  species: Species,
  ctx: SpeciesHourlyContext
): SpeciesHourlyScore[]

export interface BestWindow {
  start: number      // hour-of-day, e.g. 16
  end: number        // hour-of-day, e.g. 19
  avgScore: number   // rounded
  peakHour: number   // hour-of-day where score is max in window
  peakScore: number  // max score in window
}

export function bestWindowSummary(
  hourlyScores: SpeciesHourlyScore[]
): BestWindow | null  // null when array empty or all zero

export type WindowHint =
  | { kind: 'peaking-now' }
  | { kind: 'opens-at'; atHour: number }
  | { kind: 'window'; start: number; end: number }

export function describeBestWindow(
  hourlyScores: SpeciesHourlyScore[],
  currentHour: number
): WindowHint | null
```

Inactive species (out of season): `scoreSpeciesHourly` returns all-zero entries (consistent with the way `scoreSpecies` returns score 0 for inactive). Callers check via `bestWindowSummary` returning null and hide UI accordingly.

### Shared best-window util

`features/score/bestWindow.ts` exports `findBestThreeHourWindow(scores: number[], startHour: number)` returning `{ startHour, endHour, avgScore }`. Used by:
- `scoringService.buildConditionsData` (replaces inline loop, lines 157–169)
- `bestWindowSummary` (new)

This is a small refactor — the algorithm is identical, just parameterized.

### Type changes

```ts
// types/conditions.ts
import type { TidePhase } from '../features/tide/tideUtils'

export interface ConditionsData {
  // ...existing fields...
  hourlyScores: HourlyScore[]
  tidePhasesByHour: Record<number, TidePhase>  // NEW: keys 5..20; 'slack' for all hours on freshwater spots
}
```

### Store changes

```ts
// store/settingsStore.ts
interface SpeciesAlert { threshold: number; enabled: boolean }

interface SettingsState {
  // ...existing fields...
  speciesAlerts: Record<string, SpeciesAlert>  // keyed by species.id
  setSpeciesAlert: (speciesId: string, alert: Partial<SpeciesAlert>) => void
  clearSpeciesAlert: (speciesId: string) => void
}
```

Default: empty record. Persisted via existing AsyncStorage middleware (no migration needed — Zustand's `persist` tolerates new fields with defaults).

## Data flow

```
ConditionsData (already has water temp, month, tide curve)
     │
     ├──► scoringService.buildConditionsData
     │       populates tidePhasesByHour by calling detectPhase per hour
     │
     ▼
SpeciesDetail / ActiveRightNow / SpeciesCard
     │
     ├──► scoreSpeciesHourly(species, { month, waterTemp, tidePhasesByHour })
     │       → SpeciesHourlyScore[]  (16 entries)
     │
     ├──► bestWindowSummary(hourly) → BestWindow | null   (for subtitle/summary)
     │
     └──► describeBestWindow(hourly, nowHour) → WindowHint  (for ActiveRightNow hint)
```

Computation happens lazily in components on render. Cost: 16 × ~6 multiplications per species per render. With ~15 species the worst case is ~1500 ops per dashboard render — negligible. No memoization needed for correctness; if profiling shows a hot path later, `useMemo` keyed on `(spot.id, dateKey, isPro)` is the obvious answer.

## Error handling & edge cases

| Case | Behavior |
|------|----------|
| Freshwater spot (no tide) | `tidePhasesByHour` filled with `'slack'` for hours 5–20; `tidePoints` falls through to "preferred_tide=any → 15 pts" for most freshwater species |
| Species out of season | `scoreSpeciesHourly` returns all-zero array; `bestWindowSummary` returns null; chart is hidden; row hidden from `ActiveRightNow` |
| Active spot region has no species defined (e.g. northeast stub) | `ActiveRightNow` renders nothing (consistent with current behavior of empty species list) |
| `ConditionsData` is null (loading/error) | All consumers already handle this — no new branches needed |
| User in unsupported region | Same as no species defined |

## Testing

New test files / additions:

| File | Tests |
|------|-------|
| `__tests__/speciesHourlyScoring.test.ts` (new) | (1) returns 16 entries for hours 5–20, (2) in-season species peaks during `preferred_time_of_day`, (3) inactive species returns all zeros, (4) tide phase varies per hour and affects score, (5) cold-water mismatch lowers all hours uniformly, (6) `bestWindowSummary` finds peak in mid-day curve, (7) `bestWindowSummary` returns null for all-zero input, (8) `describeBestWindow` "Peaking now" when current ≥ max−5, (9) `describeBestWindow` "Opens at" when peak is later, (10) `describeBestWindow` "Window" when peak is earlier than current |
| `__tests__/bestWindow.test.ts` (new) | (1) finds correct 3-hour window in synthetic curve, (2) handles array shorter than 3, (3) ties broken by earliest start |
| `__tests__/settingsStore.test.ts` (extend) | (1) `setSpeciesAlert` persists, (2) partial updates merge correctly, (3) `clearSpeciesAlert` removes key, (4) defaults pull from global `alertThreshold` on first set with no threshold |
| `__tests__/scoringService.test.ts` (extend) | (1) `tidePhasesByHour` populated with 16 keys for saltwater, (2) all 'slack' for freshwater |
| `__tests__/ActiveRightNow.test.tsx` (new) | (1) renders up to 3 species sorted by current-hour score, (2) shows correct hint per species, (3) hides card when no species in season, (4) tap navigates to species detail |
| `__tests__/SpeciesHourlyChart.test.tsx` (new) | (1) renders 16 bars, (2) peak hour visually distinguished, (3) Pro banner shown when `!isPro`, (4) Pro banner hidden when `isPro` |
| `__tests__/SpeciesAlertsSection.test.tsx` (new) | (1) renders one row per species in region, (2) toggle updates store, (3) slider updates store, (4) locked overlay shown when `!isPro` |

Target: ~25 new tests, all suites passing. Existing 69 tests must continue to pass — the `scoringService` refactor (best-window extraction) is behavior-preserving.

## Implementation order

Sonnet should ship this in five commits, each green:

1. **Engine + types** — `speciesHourlyScoring.ts`, `bestWindow.ts`, types in `conditions.ts`, populate `tidePhasesByHour` in `scoringService`, refactor `buildConditionsData` to use shared util. Tests: `speciesHourlyScoring`, `bestWindow`, extended `scoringService`.
2. **`SpeciesHourlyChart` + integrate into `SpeciesDetail`** — chart component, Pro banner, summary line. Tests: `SpeciesHourlyChart`.
3. **`SpeciesCard` subtitle** — one extra line per row using `bestWindowSummary`. No new test file, extend existing if any.
4. **`ActiveRightNow` dashboard card** — component + wire into `(tabs)/index.tsx` above species list. Tests: `ActiveRightNow`.
5. **Settings UI + store** — `speciesAlerts` in store, `SpeciesAlertsSection` component, integrate into settings tab. Tests: extended `settingsStore`, `SpeciesAlertsSection`.

Each commit is independently shippable — if Sonnet hits a blocker on step 4, the first three can still merge and the app is better than today.

## Open questions

None at design time. Anything that surfaces during implementation should be flagged in the plan handoff.

## References

- `features/species/speciesScoring.ts` — existing per-moment scoring engine (extended, not replaced)
- `features/score/ScoreTimeline.tsx` — visual reference for `SpeciesHourlyChart`
- `services/scoringService.ts:135–169` — existing hourly loop and best-window inline impl (refactored)
- CLAUDE.md "Scoring Algorithm" — existing score breakdown that this pack does NOT change
