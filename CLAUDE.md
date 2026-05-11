# FishCast — Claude Context

## What This App Is

React Native / Expo fishing forecast app. Combines NOAA tide/water/wind/pressure data, NWS weather, Open-Meteo marine swell, and local solunar calculations into a 0–100 fishing score. Shows what species are active at the user's saved spot right now, an hourly score timeline, tide chart, conditions grid, and a 7-day forecast strip.

**Current state: Phase B1 complete.** All screens use live API data. No mock data in production paths.

---

## Tech Stack

- **Expo SDK 54**, React Native 0.81, React 19
- **expo-router v6** — file-based navigation, Stack + Tabs
- **TanStack Query v5** — async data fetching with `PersistQueryClientProvider` + AsyncStorage cache
- **Zustand v5** — persisted state (spots, settings)
- **react-native-maps** — spot pin map
- **react-native-svg** — tide bezier chart, score bars
- **suncalc** — local moon/sun calculations (no network)
- **TypeScript strict mode** throughout
- **Jest + React Native Testing Library** — 69 tests, 12 suites

---

## File Map

```
app/
  _layout.tsx              Root layout — PersistQueryClientProvider, Stack
  (tabs)/
    _layout.tsx            Tab bar
    index.tsx              Dashboard (score, tide, wind, species, forecast)
    spots.tsx              Spots list + active spot switcher
    settings.tsx           Units, alert threshold, Pro flag
  spot/new.tsx             Add Spot modal (async station resolution)
  species/[id].tsx         Species detail modal

services/
  noaaStationService.ts    haversine nearest-station lookup (NOAA CO-OPS station list)
  noaaService.ts           5 parallel NOAA products → NoaaData
  nwsService.ts            NWS two-step fetch (points → hourlyForecast) → NwsData
  marineService.ts         Open-Meteo marine swell → SwellData | null
  solunarService.ts        suncalc moon/sun → SolunarData (local, no network)
  scoringService.ts        buildConditionsData() — wires all sources into ConditionsData
  forecastService.ts       Phase B2 stub (throws — not yet implemented)

hooks/
  useConditions.ts         4 parallel TanStack Queries → ConditionsData | null
  useForecast.ts           Phase B2 stub
  useSpots.ts              Thin wrapper over spotsStore

features/
  score/
    scoringEngine.ts       Pure scoring algorithm (ScoringInputs → 0–100)
    ScoreDisplay.tsx       Animated score dial
    ScoreTimeline.tsx      Hourly bar chart (5AM–8PM)
  tide/
    tideUtils.ts           Phase detection, hoursFromTurn, height formatting
    TideChart.tsx          SVG bezier tide curve
  wind/WindDisplay.tsx     Animated direction arrow
  conditions/
    ConditionsGrid.tsx     6-cell grid
    PressureCard.tsx       Pressure + trend arrow
    MoonCard.tsx           Moon phase + solunar periods
  species/
    speciesScoring.ts      Score a species against conditions
    SpeciesCard.tsx        Row with score badge + Pro lock
    SpeciesDetail.tsx      Full detail view
  forecast/ForecastStrip.tsx  7-day strip (Pro gate)

store/
  spotsStore.ts            spots[], activeSpot, AsyncStorage persisted
  settingsStore.ts         units, alertThreshold, isPro

data/
  species/
    westCoast.ts           15 species (fully built out)
    northeast/southeast/freshwater.ts  Stubs (empty arrays)
    index.ts               getSpeciesForRegion(), detectRegion()

types/
  conditions.ts            ConditionsData, TideData, WindData, PressureData,
                           SwellData, SkyData, SunData, MoonData, HourlyScore, DayForecast
  spot.ts                  Spot, SpotType, Region
  species.ts               Species, SpeciesScore

theme/
  colors.ts                Dark ocean palette (Colors.background, Colors.accent, etc.)
  spacing.ts               Spacing constants (Spacing.md, Spacing.screenPad, etc.)
  typography.ts            Text style presets

__tests__/
  fixtures/                10 JSON fixture files (NOAA, NWS, Open-Meteo responses)
  noaaStationService.test.ts  (6 tests)
  solunarService.test.ts      (7 tests)
  noaaService.test.ts         (9 tests)
  nwsService.test.ts          (6 tests)
  marineService.test.ts       (4 tests)
  scoringService.test.ts      (8 tests)
  scoringEngine.test.ts
  tideUtils.test.ts
  speciesScoring.test.ts
  spotsStore.test.ts
  ScoreDisplay.test.tsx
  TideChart.test.tsx
```

---

## Data Flow

```
NOAA CO-OPS API ──► noaaService.fetchNoaaData(spot) ──────────────────────┐
NWS API ──────────► nwsService.fetchNwsData(spot) ─────────────────────── ┤
Open-Meteo ───────► marineService.fetchMarineData(spot) ─────────────────  ┤──► buildConditionsData() ──► ConditionsData
suncalc (local) ──► solunarService.calculateSolunar(lat, lng, date) ────── ┘         (scoringService.ts)

All four wired in useConditions.ts via 4 parallel useQuery hooks.
TanStack Query caches per spot.id with staleTime/gcTime per source.
AsyncStorage persistence survives cold opens (maxAge: 24h).
```

**useConditions query keys and cache times:**
| Source | queryKey | staleTime | gcTime |
|--------|----------|-----------|--------|
| NOAA | `['noaa', spot.id]` | 30 min | 2 hr |
| NWS | `['nws', spot.id]` | 60 min | 4 hr |
| Marine | `['marine', spot.id]` | 60 min | 4 hr |
| Solunar | `['solunar', spot.id, 'YYYY-MM-DD']` | 24 hr | 48 hr |

`isLoading` = any of the 4 queries loading. `isError` = (NOAA AND NWS both fail) OR solunar fails. `data` returns null until solunar resolves (solunar is required).

---

## External APIs

**NOAA CO-OPS** (`api.tidesandcurrents.noaa.gov`)
- No auth required
- Station list: `/mdapi/prod/webapi/stations.json?type=tidepredictions&units=english`
- Products fetched in parallel via `Promise.allSettled`: `predictions`, `hourly_height`, `water_temperature`, `wind`, `air_pressure`
- Error JSON (NOAA's way of reporting missing products) returns null field, not throw
- `stationId` is resolved at spot-save time via `resolveNearestStation()` (max 200km)

**NWS** (`api.weather.gov`)
- No auth required, but User-Agent header required: `FishCast/1.0 (${EXPO_PUBLIC_NWS_CONTACT})`
- Two-step: `GET /points/{lat},{lng}` → `GET {forecastHourly URL}`
- Throws on HTTP failure (unlike NOAA)
- Period selection: find most recently started period using `Date.now()` timestamp comparison

**Open-Meteo Marine** (`marine-api.open-meteo.com`)
- No auth required
- `timezone=auto` — hourly arrays start at local midnight
- Hour index: `Math.min(new Date().getHours(), heights.length - 1)`
- Freshwater spots skip this call entirely

**suncalc** (local npm package)
- No network, no auth
- `getMoonTimes`, `getMoonIllumination`, `getMoonPosition`, `getTimes`
- Major solunar periods: ±30 min around moonrise/moonset
- Minor periods: ±30 min around transit/anti-transit (hourly altitude scan)

---

## Scoring Algorithm

Pure function in `features/score/scoringEngine.ts`. Takes `ScoringInputs`, returns 0–100.

| Factor | Max pts | Key rule |
|--------|---------|----------|
| Pressure | 25 | Slow falling = best (25); fast rising = worst (5) |
| Solunar | 20 | Major period = 20; minor = 14; within 1hr = 10 |
| Tide | 20 | Saltwater only; mid-incoming = 20; slack = 5 |
| Wind | 15 | 5–12 mph ideal; >25 mph hard cap at 35 total |
| Water temp | 10 | Fixed 55–75°F range (species scoring handled separately) |
| Sky | 10 | Overcast = 10; heavy rain hard cap at 45 total |

Freshwater spots: tide contributes 0, remaining 80 pts scaled to 100.

Score labels: `Stay home` (0–39) · `Tough but possible` (40–54) · `Decent — pick your window` (55–69) · `Great day to fish` (70–84) · `Drop everything and go` (85–100)

Hourly scores: hours 5–20 (16 entries), best window = 3-hour sliding average.

`scoringService.buildConditionsData()` is the wiring layer — it maps raw API data into `ScoringInputs`, calls `calculateScore()` per hour, and assembles `ConditionsData`. Important: `sky.icon` (not `sky.condition`) is passed to `calculateScore`.

---

## Key Patterns

**Adding a new data source:** Add a service in `services/`, add a `useQuery` in `useConditions.ts`, add the data to `buildConditionsData()` in `scoringService.ts`, update `ConditionsData` type if needed.

**Spot type guards:** `type === 'saltwater'` gates NOAA station and tide logic. Freshwater spots always have `stationId: null`.

**Neutral fallbacks in scoringService:** When a source is unavailable: pressure → `NEUTRAL_PRESSURE` (stable, 29.92), wind → `noaa.wind ?? nws.wind ?? NEUTRAL_WIND`, sky → `nws.sky ?? NEUTRAL_SKY`.

**Pressure trend:** Computed from NOAA `air_pressure` hourly readings — `readings[0]` (newest) vs `readings[3]` (older). Fast = >0.06 inHg/hr, slow = <0.02.

**Region detection:** `detectRegion(lat, lng)` in `data/species/index.ts` — bounding boxes, west coast if lat 32–49 and lng -125 to -114.

---

## TypeScript

`strict: true`. Known pre-existing error (NOT caused by Phase B1, do not fix):
```
app/(tabs)/spots.tsx(63,27): error TS2345: Argument of type '"/(tabs)/"' is not assignable...
```
This is an expo-router type mismatch. All other files are clean.

---

## Tests

```bash
npx jest --no-coverage          # run all (2s)
npx jest __tests__/foo.test.ts  # single file
npx tsc --noEmit                # type check
```

Service tests use `global.fetch = jest.fn()` with fixture JSON from `__tests__/fixtures/`. Component tests use `@testing-library/react-native`. No database mocks — all services are pure fetch wrappers tested with mocked `fetch`.

---

## What's Next (Phase B2 / C)

- **Phase B2:** `useForecast` / `forecastService.ts` — 7-day forecast from NWS daily gridpoints
- **Phase C:** Push notifications (background fetch at user's alert threshold), Pro subscription (RevenueCat), species data for northeast/southeast/freshwater regions

`forecastService.ts` currently throws `'Phase B2: not yet implemented'`.
