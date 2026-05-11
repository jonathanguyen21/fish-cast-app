# FishCast

A React Native fishing forecast app built with Expo. Combines barometric pressure, solunar tables, tide data, water temperature, wind, and sky conditions into a single 0–100 fishing score. Shows what species are active at your spot right now, an hourly score timeline, a 7-day forecast, and a full conditions grid.

**Phase A:** All screens built with mock data.

**Phase B1 (current):** Live API data — NOAA CO-OPS (tides, water temp, wind, pressure), NWS (weather), Open-Meteo Marine (swell), and local solunar calculations. AsyncStorage cache for offline cold opens.

**Phase B2 (planned):** 7-day forecast from NWS gridpoints.

**Phase C (planned):** Push notifications, Pro subscription (RevenueCat), species data for northeast/southeast/freshwater regions.

---

## Screenshots / Screens

| Screen | Description |
|---|---|
| Dashboard | Score, hourly timeline, tide chart, wind, conditions grid, what's biting |
| Spots | Manage saved spots, switch active spot |
| Add Spot | Tap map to pin a location, set water type |
| Species Detail | Month activity chart, current match breakdown, tips |
| Settings | Unit preferences, alert threshold, notification permission, Pro status |

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 54, React Native |
| Navigation | Expo Router v3 (file-based) |
| State | Zustand + AsyncStorage (persisted) |
| Async data | TanStack Query v5 + AsyncStorage persistence |
| Charts | react-native-svg (tide bezier curve, score bars) |
| Animation | react-native-reanimated |
| Maps | react-native-maps |
| Language | TypeScript (strict) |
| Tests | Jest + React Native Testing Library |

---

## Prerequisites

- **Node.js** 18+ (`node --version`)
- **npm** 9+ (`npm --version`)
- **Expo Go** app on your iOS or Android device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Optional for emulator: Android Studio or Xcode

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/jonathanguyen21/fish-cast-app.git
cd fish-cast-app
npm install
```

### 2. Start the dev server

```bash
npx expo start
```

Expo will print a QR code in the terminal. Scan it with:
- **iOS**: Camera app
- **Android**: Expo Go app

The app loads instantly. No API keys required — NOAA, NWS, and Open-Meteo are all free and unauthenticated. An optional `EXPO_PUBLIC_NWS_CONTACT` env var sets the User-Agent email for NWS (defaults to `fishcast.app@gmail.com`).

### 3. Run on an emulator (optional)

```bash
# Android (requires Android Studio + emulator running)
npx expo start --android

# iOS (macOS + Xcode only)
npx expo start --ios
```

---

## Project Structure

```
app/
  _layout.tsx              Root layout (PersistQueryClientProvider, Stack)
  (tabs)/
    _layout.tsx            Tab bar (Dashboard, Spots, Settings)
    index.tsx              Dashboard — score, tide, wind, species, loading overlay, offline banner
    spots.tsx              Spots list screen
    settings.tsx           Settings screen
  spot/new.tsx             Add Spot modal (map picker, async station resolution)
  species/[id].tsx         Species Detail modal

services/
  noaaStationService.ts    Haversine nearest NOAA station lookup (200km max)
  noaaService.ts           5 parallel NOAA CO-OPS products → NoaaData
  nwsService.ts            NWS two-step fetch → NwsData
  marineService.ts         Open-Meteo marine swell → SwellData | null
  solunarService.ts        suncalc moon/sun → SolunarData (local, no network)
  scoringService.ts        buildConditionsData() — wires all sources into ConditionsData
  forecastService.ts       Phase B2 stub (throws)

features/
  score/
    scoringEngine.ts       Pure scoring algorithm (pressure, solunar, tide, wind, temp, sky → 0–100)
    ScoreDisplay.tsx       Animated score dial + label
    ScoreTimeline.tsx      Horizontal hourly bar chart (5AM–8PM)
  tide/
    tideUtils.ts           Tide phase detection, hoursFromTurn, height formatting
    TideChart.tsx          SVG bezier tide curve with current position marker
  wind/WindDisplay.tsx     Animated direction arrow + speed
  conditions/
    ConditionsGrid.tsx     6-cell grid (pressure, swell, air temp, sky, moon, sun)
    PressureCard.tsx       Pressure + trend arrow
    MoonCard.tsx           Moon phase + solunar major period
  species/
    speciesScoring.ts      Score a species against current conditions
    SpeciesCard.tsx        Species row with score badge + Pro lock
    SpeciesDetail.tsx      Full species detail view
  forecast/ForecastStrip.tsx  7-day horizontal forecast (Pro gate)

hooks/
  useConditions.ts         4 parallel TanStack Queries → ConditionsData | null
  useForecast.ts           Phase B2 stub
  useSpots.ts              Thin wrapper over spotsStore

store/
  spotsStore.ts            Zustand store: spots[], activeSpot, AsyncStorage persisted
  settingsStore.ts         Zustand store: units, alertThreshold, isPro

data/
  species/
    westCoast.ts           15 West Coast species (fully built out)
    northeast/southeast/freshwater.ts  Stubs (empty arrays)
    index.ts               getSpeciesForRegion(), detectRegion()

theme/
  colors.ts                Dark ocean palette
  spacing.ts               Layout constants
  typography.ts            Text style presets

types/
  conditions.ts            ConditionsData, TideData, WindData, PressureData, SwellData, SkyData, ...
  species.ts               Species, SpeciesScore, TimeOfDay, ...
  spot.ts                  Spot, SpotType, Region

__tests__/
  fixtures/                10 JSON fixture files (NOAA, NWS, Open-Meteo API responses)
  noaaStationService.test.ts  (6 tests)
  solunarService.test.ts      (7 tests)
  noaaService.test.ts         (9 tests)
  nwsService.test.ts          (6 tests)
  marineService.test.ts       (4 tests)
  scoringService.test.ts      (8 tests)
  scoringEngine.test.ts / tideUtils.test.ts / speciesScoring.test.ts
  spotsStore.test.ts / ScoreDisplay.test.tsx / TideChart.test.tsx
```

---

## Running Tests

```bash
# Run all tests
npx jest --no-coverage

# Run a single test file
npx jest __tests__/scoringEngine.test.ts --no-coverage

# Watch mode
npx jest --watch
```

Current: 69 tests across 12 suites — service tests, scoring engine, tide utilities, species scoring, Zustand store, and key components.

---

## TypeScript

```bash
npx tsc --noEmit
```

The project uses `strict: true`. One known pre-existing error in `app/(tabs)/spots.tsx:63` (expo-router path type mismatch) — all other files are clean.

---

## Scoring Algorithm

The fishing score is a weighted sum of six factors, capped at 100:

| Factor | Max Points | Notes |
|---|---|---|
| Barometric pressure | 25 | Slow falling = best; fast rising = worst |
| Solunar period | 20 | Major period = best; within 1 hr = good |
| Tide | 20 | Saltwater only; mid-incoming = best; slack = worst |
| Wind | 15 | 5–12 mph ideal; >25 mph caps score at 35 |
| Water temperature | 10 | Species-specific optimal range |
| Sky | 10 | Overcast = best; heavy rain caps score at 45 |

Freshwater spots skip tide and scale the remaining 80 points to 100.

Score labels: `Stay home` (0–39) · `Tough but possible` (40–54) · `Decent — pick your window` (55–69) · `Great day to fish` (70–84) · `Drop everything and go` (85–100)

---

## Adding More Species

Add entries to the appropriate region file in `data/species/`:

```typescript
// data/species/westCoast.ts
{
  id: 'my_species',
  common_name: 'My Species',
  scientific_name: 'Genus species',
  region: 'west_coast',
  type: 'saltwater',
  tier: 'free',           // 'free' | 'pro'
  months_present: [4,5,6,7,8,9],
  months_peak: [6,7,8],
  water_temp_f: { min: 55, max: 68, peak_min: 58, peak_max: 65 },
  preferred_tide: 'incoming',   // 'incoming' | 'outgoing' | 'any'
  preferred_time_of_day: ['dawn', 'dusk'],
  migration_notes: '...',
  tips: '...',
}
```

---

## Phase B2: 7-Day Forecast (Next)

`useForecast.ts` and `services/forecastService.ts` are stubbed. Phase B2 will wire them to NWS daily gridpoints (`/gridpoints/{office}/{x},{y}/forecast`) and display real 7-day peak scores in the forecast strip.

---

## License

MIT
