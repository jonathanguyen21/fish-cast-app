# FishCast UX Overhaul — Design Spec

Date: 2026-07-01
Status: Approved design, pending implementation plan
Goal: Fix everything that breaks angler trust, then deliver the two missing halves of the core promise — "fish on good days" (real 7-day forecast) and "find fish" (species coverage + score explainability).

This spec was produced from a full repo audit plus live verification against the NOAA CO-OPS API. It is written to be executed phase-by-phase by an implementing model. Phases are strictly ordered; each phase ends with `npx jest --no-coverage` green and `npx tsc --noEmit` clean.

---

## Audit Summary (what's wrong today)

### Critical — verified against the live NOAA API on 2026-07-01

The NOAA integration is **completely broken in production**. Every product request in `services/noaaService.ts` fails, so `fetchProduct` returns null for all five products and the app silently renders neutral fallbacks (no tide chart, NWS-only wind, fabricated 65°F water temp, neutral pressure). Tests pass because fixtures encode the same wrong assumptions. Specifically:

1. **`time_zone=LST/LDT` is rejected.** The API requires `lst_ldt` (verified: returns `{"error": {"message": " Wrong Time Zone: ..."}}`). Every URL built by `buildUrl()` fails on this alone.
2. **Tide predictions require `datum`.** With the time zone fixed, `product=predictions` returns `Wrong Datum: Datum cannot be null or empty`. The app never sends a datum.
3. **Observational data arrives oldest-first, not newest-first.** Verified: `data[0]` is midnight, ascending from there. `parseWind` reads `data[0]` as "current wind" (it's midnight's wind) and `parsePressure` reads `readings[0]` as the newest reading — **the pressure trend sign is inverted**, which flips the single largest scoring factor (falling=25pts vs rising-fast=5pts). The fixture `noaaAirPressure.json` is hand-written newest-first, so tests validate the inverted logic.
4. **Air pressure is returned in millibars regardless of `units=english`** (verified: values ~1011.3). The app treats values as inHg: the display would show "1011.3 inHg", the `value > 30.10` high-pressure rule is always true, and trend thresholds (0.03/0.06/0.12 inHg) are wrong by ~34× in mb.
5. **Wind speeds with `units=english` are in knots**, but the app labels and scores them as mph (~15% error against the 5–12 mph ideal band).

### High — trust-breaking UX bugs

6. **Pro users see fake forecast data.** `hooks/useForecast.ts` returns `MOCK_FORECAST` from `data/mockData.ts`. The 7-day strip shows identical hardcoded scores for every spot every day. (CLAUDE.md's "no mock data in production paths" is false.)
7. **"Next high tide" can be in the past.** `app/(tabs)/index.tsx:41` uses `events.find(e => e.type === 'high')` (first high of the day). `noaaService` already computes a correct `tide.next` (next future event) that the dashboard ignores.
8. **"Best window" can be entirely in the past.** `scoringService.ts` scans hours 5–20 with no now-filter; at 5 PM the app recommends this morning.
9. **Hourly timeline hardcoded to 5 AM–8 PM.** Night/predawn anglers (a large share of striper, catfish, walleye anglers) see nothing for their hours.
10. **Hourly weather lookup can use the wrong day.** `getHourlyWind`/`getHourlySky` match NWS periods by `hour` number only; for hours earlier than now, the first match is tomorrow's period.
11. **Fabricated water temp presented as real.** The 65/68°F fallback feeds the Water card and all species scoring with no "estimated" indication.
12. **"What's Biting" is empty for most of the US.** `northeast.ts`, `southeast.ts`, `freshwater.ts` export empty arrays. `detectRegion` also misroutes: Gulf Coast (TX/LA/AL/MS/west FL) → `freshwater`; inland NV/AZ → `west_coast` saltwater species.
13. **Dead settings promise features that don't exist.** Alerts toggle + threshold + notification permission flow have no background task behind them; "Upgrade to Pro" button has no `onPress`; the forecast paywall routes users to that dead button.
14. **Tide quick card ignores the `lengthUnit` setting** (hardcoded "ft" at `index.tsx:121` and the peak line).

### Architecture verdict

No rewrites. Services → pure scoring engine → TanStack Query → screens is clean, strictly typed, and test-covered. All changes below are targeted.

---

## Phase 1 — Data correctness & trust fixes

### 1.1 Fix the NOAA integration (`services/noaaService.ts`)

- `COMMON` becomes `time_zone=lst_ldt&units=english&format=json`.
- Both predictions URLs (`interval=hilo`, `interval=h`) add `&datum=MLLW`.
- Observational products (`water_temperature`, `wind`, `air_pressure`) drop `date=today` and use trailing ranges: `wind` → `range=2`, `air_pressure` → `range=7`, `water_temperature` → `range=2`. (Per CO-OPS semantics, `range` without a date returns the most recent N hours.) Predictions keep `date=today`.
- `parseWind`: read the **last** element of `data` (most recent). Convert knots → mph (× 1.15078) for `speed` and `gusts`, rounded to whole numbers. `unit` stays `'mph'`.
- `parseWaterTemp` equivalent: read the **last** element.
- `parsePressure`: data is oldest-first (ascending). `current` = last element. Convert mb → inHg (× 0.02953), rounded to 2 decimals, for `value` and all `readings`. Readings arrive at 6-minute intervals: compute trend from `current` vs the reading ~3 hours earlier (`data[max(0, len-1-30)]`), keep the existing inHg thresholds (trend ±0.03, rate 0.06/0.12). For the `readings` array consumed by the pressure detail chart, downsample to one reading per hour (every 10th element), oldest-first, so the chart stays ≤ 8 points.
- **Fixtures**: rewrite `noaaAirPressure.json`, `noaaWind.json`, `noaaWaterTemp.json` to match the real API — ascending timestamps, mb pressure values (~1011), knot wind speeds — and update expected values in `noaaService.test.ts` and `scoringService.test.ts`. Add URL-assertion tests: every NOAA request contains `time_zone=lst_ldt`; prediction requests contain `datum=MLLW`.
- Add one manual smoke-check note in the plan (curl commands) so the implementer verifies against the live API, not just fixtures.

### 1.2 Remove mock data from production paths

- `useForecast` returns `{ data: [], isLoading: false }` (real implementation lands in Phase 2). `ForecastStrip` renders nothing when `isPro && forecast.length === 0`.
- Delete the `MOCK_FORECAST` import; `data/mockData.ts` must no longer be imported by any non-test file (add a grep check to the plan).

### 1.3 Next tide event (dashboard quick card)

- Use `conditions.tide.next` (already correct in `noaaService`). Show type-aware arrow: `▲ 5.2 ft 4:41 PM` for high, `▼ 0.8 ft 10:03 PM` for low. Remove the `events.find(...)` line.

### 1.4 Future-aware best window

- `buildConditionsData` computes hourly scores for **all 24 hours** (0–23), not 5–20.
- Best window scans only windows whose **end hour ≥ current hour**. If no future window remains today (current hour ≥ 22), `bestWindow` carries a `passed: true` flag and the UI renders "Peak today was {start}–{end}". Type change: `bestWindow: { start: string; end: string; score: number; passed?: boolean }`.

### 1.5 24-hour timeline with "now" marker

- `HourlyScore` gains `hourIndex: number` (0–23). `ScoreTimeline` renders 24 bars, highlights the bar where `hourIndex === currentHour` (accent border + "Now" label under it), and auto-scrolls so the now-bar sits at the left third (`ScrollView.scrollTo` on layout). Past bars render at 40% opacity.

### 1.6 Honest estimated data

- `ConditionsData['water']` gains `estimated: boolean` (true when NOAA water temp is null and the 65/68 fallback was used). Water quick card shows `~65°` with an `est.` sub-label; the "What's Biting" section header gains a one-line caveat "Species activity estimated — no live water temp at this station" when true.

### 1.7 Correct hourly weather lookup

- `NwsData.hourlyForecast` entries gain `epochMs: number` (from `startTime`). `getHourlyWind`/`getHourlySky` match the period covering *today's* date + target hour; fall back to the nearest same-hour period only if today's is absent. `windHourly` passed to the wind detail modal filters to today's periods.

### 1.8 Unit compliance + dead-promise cleanup

- Tide quick card + peak line convert via `lengthUnit` (× 0.3048 for meters, label `m`).
- Settings: alerts section replaced by a single disabled row "Smart alerts — coming soon" (remove toggle, slider, and notification-permission flow; keep `alertThreshold`/`alertsEnabled` in the store untouched for Phase C).
- New `components/ProWaitlistSheet.tsx`: a modal sheet — "FishCast Pro is coming soon" + short feature list + dismiss. "Upgrade to Pro" (settings) and the forecast upgrade card open it. No email capture in this phase (no backend).

---

## Phase 2 — Real 7-day forecast

### 2.1 `services/forecastService.ts` (replaces the stub)

```
fetchForecast(spot: Spot): Promise<DayForecast[]>
```

- **Tide**: one NOAA predictions call spanning 7 days — `begin_date={today}&range=168` with `datum=MLLW&interval=h` (hourly heights) plus one `interval=hilo` call for events. Parse into per-day 24-entry curves keyed by date. Freshwater spots (`stationId === null`) skip NOAA entirely.
- **Weather**: reuse `fetchNwsData`'s hourly call — it already returns ~156 hourly periods. Refactor: `nwsService` exports the parsed period list (with `epochMs`, temp, wind mph, rain chance, cloud cover); `forecastService` groups periods by local date.
- **Solunar**: `calculateSolunar(lat, lng, date)` per day — local, free.
- **Pressure**: not forecastable from these APIs. Future days score with `NEUTRAL_PRESSURE` (documented; scores for future days are "conditions-known" scores, comparable to today when pressure is neutral).
- **Scoring**: for each of the 7 days, run `calculateScore` for each hour (same engine, same inputs shape), take `peakScore` = best 3-hour window average, `peakWindow` = that window, `scoreLabel` = existing labeler. Also return `hourlyScores` per day (used by the day-detail modal) — extend `DayForecast` with `hourlyScores: HourlyScore[]` and `tideEvents: TideEvent[]`.
- NWS runs out at ~6.5 days: for hours with no NWS period, use that day's neutral wind/sky (existing `NEUTRAL_*` constants). Never fabricate.

### 2.2 `hooks/useForecast.ts` (real query)

- `useQuery({ queryKey: ['forecast', spot.id, todayKey()], staleTime: 6h, gcTime: 24h })`, enabled when spot exists. Returns `{ data, isLoading, isError, refetch }`. Dashboard pull-to-refresh also refetches forecast.

### 2.3 Teaser gate UI (`ForecastStrip`)

- Days 0–1: real score cards, tappable. Days 2–6: cards render with real day labels but the score badge is replaced by a lock glyph and the card is dimmed; tapping opens `ProWaitlistSheet`. When `isPro` (dev flag), all 7 unlocked. Loading state: 7 skeleton cards. Error state: single retry row.

### 2.4 Day detail modal (`app/detail/day.tsx`)

- Route registered like the wind/pressure modals; receives the `DayForecast` as a JSON param. Shows: day header + score dial (reuse `ScoreDisplay` sans animation), 24-bar timeline (reuse `ScoreTimeline` with a `highlightHour={null}` prop), tide events list, sunrise/sunset + solunar major/minor times.

### 2.5 Best-window handoff

- On the dashboard, when today's remaining best window scores < 55 and some unlocked forecast day peaks ≥ 70, render one line under `ScoreDisplay`: "Tomorrow looks better — {peakScore} at {window}" (only for free-visible days; link opens the day detail).

---

## Phase 3 — Find fish, explainability, onboarding

### 3.1 Score breakdown (free)

- `calculateScore` gains a sibling `calculateScoreBreakdown(inputs)` returning `{ total, factors: [{ key, label, points, max, note }] }` where notes are plain-English ("Falling slowly — fish feed ahead of fronts", "Mid-incoming tide — bait moves"). The existing `calculateScore` delegates to it (single source of truth; all existing tests keep passing).
- New `features/score/ScoreBreakdownSheet.tsx`: bottom-sheet modal with one row per factor — label, horizontal bar (points/max, colored by ratio), note. Opened by tapping the score dial *or any hourly bar* (the bar passes its hour's inputs). Replaces the Pro-lock tooltip in `ScoreTimeline` entirely. Free for everyone — this is the trust feature. (The Phase C AI explainer remains a future Pro idea.)

### 3.2 Species coverage

- Region routing fix in `data/species/index.ts`:
  - If `spot.type === 'freshwater'` → always `freshwaterSpecies` (callers pass the spot type; `getSpeciesForRegion(lat, lng, spotType)`).
  - Saltwater: `west_coast` = lng ≤ -117 and lat 32–49; `southeast` = (lat 24–35 and lng -98…-75, i.e. Gulf + South Atlantic); `northeast` = lat > 35 and lng > -82 (Mid-Atlantic through Maine). Anything else → empty list.
  - Empty list → "What's Biting" renders a friendly empty state: "No species data for this area yet — scores above still apply."
- Content: **the implementation plan will contain the complete authored species arrays** (same `Species` shape as `westCoast.ts`, `tier` mix of free/pro matching west coast ratios). The implementer transcribes exactly — no invented biology. Rosters:
  - `northeast.ts` (11): Striped Bass, Bluefish, Summer Flounder (Fluke), Black Sea Bass, Tautog, Scup (Porgy), Weakfish, False Albacore, Winter Flounder, Atlantic Bonito, Atlantic Mackerel.
  - `southeast.ts` (12): Red Drum, Spotted Seatrout, Snook, Tarpon, Sheepshead, Southern Flounder, Spanish Mackerel, King Mackerel, Cobia, Florida Pompano, Black Drum, Mangrove Snapper.
  - `freshwater.ts` (11): Largemouth Bass, Smallmouth Bass, Rainbow Trout, Brown Trout, Walleye, Channel Catfish, Black Crappie, Bluegill, Yellow Perch, Northern Pike, Muskellunge.
- Tests: per-region schema validation (ids unique, months 1–12, temp ranges ordered, peak within present) — one parameterized suite covering all four files.

### 3.3 Onboarding

- Dashboard empty state gains a primary button "Add your first spot" → `router.push('/spot/new')`. After the first spot saves, `spot/new` routes to the Forecast tab (it currently just `router.back()`s to wherever the user came from).
- Spots tab empty state: same button (in addition to the FAB).

---

## Error handling principles (all phases)

- Never render fabricated values as real — estimated data is labeled, missing data is omitted or explained ("No tide station within 200 km").
- Partial NOAA failure keeps degrading gracefully per product (existing `Promise.allSettled` pattern stays).
- Forecast errors never block the today view; the strip fails independently with its own retry.

## Testing strategy

- Every service change is fixture-driven with fixtures matching **verified live API shapes** (this spec's audit showed hand-written fixtures encoding wrong assumptions — the root cause of critical bugs 3–5).
- URL-parameter assertion tests for NOAA requests.
- Engine tests: 24-hour scoring, future-aware window (including the "passed" case at 11 PM), breakdown sums equal `calculateScore` output.
- `forecastService` tests: 7-day grouping, NWS-runout neutral fill, freshwater skip.
- Component tests: ScoreTimeline now-marker, ForecastStrip teaser gate lock state, breakdown sheet rows.

## Documentation

Each phase ends by updating the sections of `CLAUDE.md` it invalidates (NOAA URL params and data ordering, pressure units, 5AM–8PM hourly window, `useConditions`/`useForecast` cache table, forecastService status, species region coverage).

## Out of scope

Push notifications and background fetch, RevenueCat/real payments, email capture on the waitlist sheet, wind map/particle visualization, AI score explainer, catch logging, offline maps. The pre-existing `spots.tsx` expo-router type error stays untouched per CLAUDE.md.
