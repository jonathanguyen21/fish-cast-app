# FishCast

A React Native fishing forecast app built with Expo. Combines barometric pressure, solunar tables, tide data, water temperature, wind, and sky conditions into a single 0–100 fishing score. Shows what species are active at your spot right now, an hourly score timeline, a 7-day forecast, and a full conditions grid.

**Phase A (current):** All screens are built and fully functional using mock data — no API keys required. Runs instantly in Expo Go.

**Phase B (planned):** Swap mock data for live NOAA, NWS, and solunar API calls. Service stubs are already in place.

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
| Async data | TanStack Query (wired for Phase B) |
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

The app loads instantly — no API keys or environment variables needed in Phase A.

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
  _layout.tsx              Root layout (QueryClientProvider, Stack navigator)
  (tabs)/
    _layout.tsx            Tab bar (Dashboard, Spots, Settings)
    index.tsx              Dashboard screen
    spots.tsx              Spots list screen
    settings.tsx           Settings screen
  spot/new.tsx             Add Spot modal (map picker)
  species/[id].tsx         Species Detail modal

features/
  score/
    scoringEngine.ts       Pure scoring algorithm (pressure, solunar, tide, wind, temp, sky → 0–100)
    ScoreDisplay.tsx       Animated score dial + label
    ScoreTimeline.tsx      Horizontal hourly bar chart
  tide/
    tideUtils.ts           Tide phase detection, hour-from-turn, height formatting
    TideChart.tsx          SVG bezier tide curve with current position marker
  wind/
    WindDisplay.tsx        Animated direction arrow + speed
  conditions/
    ConditionsGrid.tsx     6-cell grid (pressure, swell, air temp, sky, moon, sun)
    PressureCard.tsx       Pressure + trend arrow
    MoonCard.tsx           Moon phase + solunar major period
  species/
    speciesScoring.ts      Score a species against current conditions
    SpeciesCard.tsx        Species row with score badge + Pro lock
    SpeciesDetail.tsx      Full species detail view
  forecast/
    ForecastStrip.tsx      7-day horizontal forecast (Pro gate)

hooks/
  useConditions.ts         Returns mock ConditionsData (Phase B: real API)
  useForecast.ts           Returns mock DayForecast[] (Phase B: real API)
  useSpots.ts              Thin wrapper over spotsStore

store/
  spotsStore.ts            Zustand store: spots list, active spot, AsyncStorage persistence
  settingsStore.ts         Zustand store: units, alert threshold, Pro flag

data/
  mockData.ts              MOCK_CONDITIONS, MOCK_FORECAST, MOCK_SPOT
  species/
    westCoast.ts           15 West Coast species with full data
    northeast.ts           Stub (empty)
    southeast.ts           Stub (empty)
    freshwater.ts          Stub (empty)
    index.ts               getSpeciesForRegion(), detectRegion()

services/                  Phase B stubs (all throw — replace internals in Phase B)
  noaaService.ts
  nwsService.ts
  marineService.ts
  solunarService.ts
  scoringService.ts
  forecastService.ts

theme/
  colors.ts                Dark ocean palette
  typography.ts            Text style presets
  spacing.ts               Layout constants

types/
  conditions.ts            ConditionsData, TideData, WindData, PressureData, ...
  species.ts               Species, SpeciesScore, TimeOfDay, ...
  spot.ts                  Spot, SpotType, Region

__tests__/
  scoringEngine.test.ts
  tideUtils.test.ts
  speciesScoring.test.ts
  spotsStore.test.ts
  ScoreDisplay.test.tsx
  TideChart.test.tsx
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

Current test coverage: 29 tests across the scoring engine, tide utilities, species scoring, Zustand store, and key components.

---

## TypeScript

```bash
npx tsc --noEmit
```

The project uses `strict: true`. All 29 tests and the full codebase pass with zero TypeScript errors.

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

## Phase B: Real API Integration

To connect live data, replace the bodies of the hook files — the UI layer never changes:

- `hooks/useConditions.ts` → call `services/noaaService.ts` + `services/nwsService.ts` + `services/solunarService.ts` via TanStack Query
- `hooks/useForecast.ts` → call `services/forecastService.ts`

All service interfaces are already typed and stubbed in `services/`.

---

## License

MIT
