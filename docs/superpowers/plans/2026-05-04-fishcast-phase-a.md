# FishCast Phase A — UI with Mock Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every screen and component of FishCast using mock/static data so the app looks and feels 100% real in Expo Go before any API is connected.

**Architecture:** Feature-based folder structure. A central `useConditions(spot)` hook returns a normalized `ConditionsData` shape from `mockData.ts`. All UI components receive typed props — they never know whether data is mock or real. Phase B swaps the hook internals only.

**Tech Stack:** Expo SDK 52, React Native, TypeScript, Expo Router v3, Zustand + AsyncStorage, react-native-svg, react-native-reanimated, react-native-maps, Jest + React Native Testing Library

---

## File Map

```
app/
  _layout.tsx                        create
  (tabs)/
    _layout.tsx                      create
    index.tsx                        create  ← Dashboard
    spots.tsx                        create  ← Spots list
    settings.tsx                     create  ← Settings
  spot/
    new.tsx                          create  ← Add spot
  species/
    [id].tsx                         create  ← Species detail

features/
  score/
    ScoreDisplay.tsx                 create
    ScoreTimeline.tsx                create
    scoringEngine.ts                 create  ← pure fn
  tide/
    TideChart.tsx                    create
    tideUtils.ts                     create  ← pure fns
  wind/
    WindDisplay.tsx                  create
  conditions/
    ConditionsGrid.tsx               create
    PressureCard.tsx                 create
    MoonCard.tsx                     create
  species/
    SpeciesCard.tsx                  create
    SpeciesDetail.tsx                create
    speciesScoring.ts                create  ← pure fn
  forecast/
    ForecastStrip.tsx                create

services/                            ← all stubs for Phase A
  noaaService.ts                     create
  nwsService.ts                      create
  marineService.ts                   create
  solunarService.ts                  create
  scoringService.ts                  create
  forecastService.ts                 create

hooks/
  useConditions.ts                   create  ← returns mock
  useForecast.ts                     create  ← returns mock
  useSpots.ts                        create

store/
  spotsStore.ts                      create
  settingsStore.ts                   create

data/
  mockData.ts                        create
  species/
    westCoast.ts                     create  ← 15 species
    northeast.ts                     create  ← stub []
    southeast.ts                     create  ← stub []
    freshwater.ts                    create  ← stub []
    index.ts                         create

theme/
  colors.ts                          create
  typography.ts                      create
  spacing.ts                         create

types/
  conditions.ts                      create
  species.ts                         create
  spot.ts                            create

__tests__/
  scoringEngine.test.ts              create
  tideUtils.test.ts                  create
  speciesScoring.test.ts             create
  spotsStore.test.ts                 create
  ScoreDisplay.test.tsx              create
  TideChart.test.tsx                 create
```

---

## Task 1: Project Initialization

**Files:** root `package.json`, `app.json`, `tsconfig.json`, `jest.config.js`, `jest.setup.ts`

- [ ] **Step 1: Create the Expo app**

```bash
cd /home/jon/projects/fish-cast-app
npx create-expo-app@latest . --template tabs
```

Expected: Expo tabs template scaffolded in current directory.

- [ ] **Step 2: Install core dependencies**

```bash
npx expo install @tanstack/react-query
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-svg
npx expo install react-native-reanimated
npx expo install react-native-maps
npx expo install expo-notifications expo-task-manager expo-background-fetch expo-location
npm install zustand
npm install suncalc
npm install --save-dev @types/suncalc
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 4: Configure jest**

Replace `jest.config.js` (or create if absent) at project root:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
```

Create `jest.setup.ts`:

```typescript
import '@testing-library/jest-native/extend-expect'

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
)

jest.mock('react-native-maps', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: View,
    Marker: View,
  }
})

jest.mock('react-native-svg', () => {
  const { View } = require('react-native')
  return {
    Svg: View, Path: View, Circle: View, G: View, Defs: View,
    LinearGradient: View, Stop: View, Line: View, Text: View,
    Rect: View,
  }
})
```

- [ ] **Step 5: Update tsconfig.json**

Ensure `tsconfig.json` has path alias:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 6: Delete template boilerplate**

```bash
rm -rf app/\(tabs\)/explore.tsx app/+not-found.tsx components/ constants/ hooks/useColorScheme.ts hooks/useThemeColor.ts
```

- [ ] **Step 7: Verify app boots**

```bash
npx expo start
```

Scan QR code in Expo Go. App should show default tabs screen without crashing.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: initialize FishCast Expo project with dependencies"
```

---

## Task 2: Theme & Type Definitions

**Files:** `theme/colors.ts`, `theme/typography.ts`, `theme/spacing.ts`, `types/conditions.ts`, `types/species.ts`, `types/spot.ts`

- [ ] **Step 1: Create theme files**

`theme/colors.ts`:
```typescript
export const Colors = {
  background: '#0B1622',
  surface: '#142233',
  card: '#1A2D42',
  accent: '#00C9A7',
  ocean: '#3B82F6',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
} as const
```

`theme/typography.ts`:
```typescript
import { StyleSheet } from 'react-native'
import { Colors } from './colors'

export const Typography = StyleSheet.create({
  scoreNumber: { fontSize: 72, fontWeight: '800', fontVariant: ['tabular-nums'], color: Colors.textPrimary },
  h1: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  h2: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  h3: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  body: { fontSize: 14, fontWeight: '400', color: Colors.textPrimary },
  label: { fontSize: 12, fontWeight: '400', color: Colors.textTertiary },
  dataLarge: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], color: Colors.textPrimary },
  dataMedium: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'], color: Colors.textPrimary },
})
```

`theme/spacing.ts`:
```typescript
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  screenPad: 16,
  cardRadius: 12,
} as const
```

- [ ] **Step 2: Create type definitions**

`types/spot.ts`:
```typescript
export type SpotType = 'saltwater' | 'freshwater'
export type Region = 'west_coast' | 'northeast' | 'southeast' | 'freshwater'

export interface Spot {
  id: string
  name: string
  lat: number
  lng: number
  type: SpotType
  stationId: string | null
  region: Region
}
```

`types/species.ts`:
```typescript
export type SpeciesTier = 'free' | 'pro'
export type WaterType = 'saltwater' | 'freshwater'
export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night'
export type TidePreference = 'incoming' | 'outgoing' | 'any'

export interface Species {
  id: string
  common_name: string
  scientific_name: string
  region: import('./spot').Region
  type: WaterType
  tier: SpeciesTier
  months_present: number[]
  months_peak: number[]
  water_temp_f: { min: number; max: number; peak_min: number; peak_max: number }
  preferred_tide: TidePreference
  preferred_time_of_day: TimeOfDay[]
  migration_notes: string
  tips: string
}

export interface SpeciesScore {
  species: Species
  score: number
  status: 'Peak Season' | 'Active' | 'Present' | 'Inactive'
  waterTempMatch: string
  tideMatch: string
  timeMatch: string
}
```

`types/conditions.ts`:
```typescript
export interface WindData {
  speed: number
  gusts: number
  direction: number
  directionLabel: string
  unit: string
}

export interface TideEvent {
  type: 'high' | 'low'
  time: string
  height: number
}

export type TidePhase = 'incoming' | 'outgoing' | 'slack'

export interface TideData {
  current: { height: number; rising: boolean; unit: string }
  next: { type: 'high' | 'low'; time: string; height: number }
  events: TideEvent[]
  hourlyCurve: number[]
  phase: TidePhase
}

export interface AirData {
  temp: number
  high: number
  low: number
  humidity: number
  unit: string
}

export interface PressureData {
  value: number
  trend: 'rising' | 'falling' | 'stable'
  rate: 'slow' | 'fast' | 'normal'
  unit: string
}

export interface SwellData {
  height: number
  period: number
  direction: number
  directionLabel: string
  unit: string
}

export interface SkyData {
  condition: string
  rainChance: number
  icon: 'clear' | 'partly-cloudy' | 'overcast' | 'light-rain' | 'heavy-rain'
}

export interface SunData {
  sunrise: string
  sunset: string
}

export interface MoonData {
  phase: string
  illumination: number
  majorPeriods: { start: string; end: string }[]
  minorPeriods: { start: string; end: string }[]
}

export interface HourlyScore {
  hour: string
  score: number
}

export interface DayForecast {
  date: string
  dayLabel: string
  peakScore: number
  scoreLabel: string
  peakWindow: { start: string; end: string }
}

export interface ConditionsData {
  fishingScore: number
  scoreLabel: string
  bestWindow: { start: string; end: string; score: number }
  wind: WindData
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

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add theme/ types/
git commit -m "feat: add theme tokens and shared TypeScript types"
```

---

## Task 3: Zustand Stores

**Files:** `store/spotsStore.ts`, `store/settingsStore.ts`, `__tests__/spotsStore.test.ts`

- [ ] **Step 1: Write the failing store test**

`__tests__/spotsStore.test.ts`:
```typescript
import { act, renderHook } from '@testing-library/react-native'
import { useSpotsStore } from '../store/spotsStore'
import type { Spot } from '../types/spot'

const mockSpot: Spot = {
  id: 'spot_1',
  name: 'Bodega Bay',
  lat: 38.33,
  lng: -123.05,
  type: 'saltwater',
  stationId: '9415020',
  region: 'west_coast',
}

describe('spotsStore', () => {
  beforeEach(() => {
    useSpotsStore.getState().clear()
  })

  it('adds a spot', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    expect(result.current.spots).toHaveLength(1)
    expect(result.current.spots[0].name).toBe('Bodega Bay')
  })

  it('removes a spot', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.removeSpot('spot_1') })
    expect(result.current.spots).toHaveLength(0)
  })

  it('sets active spot', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.setActiveSpot('spot_1') })
    expect(result.current.activeSpotId).toBe('spot_1')
  })

  it('returns active spot object', () => {
    const { result } = renderHook(() => useSpotsStore())
    act(() => { result.current.addSpot(mockSpot) })
    act(() => { result.current.setActiveSpot('spot_1') })
    expect(result.current.activeSpot).toEqual(mockSpot)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/spotsStore.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../store/spotsStore'`

- [ ] **Step 3: Implement spotsStore**

`store/spotsStore.ts`:
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Spot } from '../types/spot'

interface SpotsState {
  spots: Spot[]
  activeSpotId: string | null
  activeSpot: Spot | null
  addSpot: (spot: Spot) => void
  removeSpot: (id: string) => void
  setActiveSpot: (id: string) => void
  clear: () => void
}

export const useSpotsStore = create<SpotsState>()(
  persist(
    (set, get) => ({
      spots: [],
      activeSpotId: null,
      get activeSpot() {
        const { spots, activeSpotId } = get()
        return spots.find(s => s.id === activeSpotId) ?? null
      },
      addSpot: (spot) => set(state => ({
        spots: [...state.spots, spot],
        activeSpotId: state.activeSpotId ?? spot.id,
      })),
      removeSpot: (id) => set(state => {
        const spots = state.spots.filter(s => s.id !== id)
        const activeSpotId = state.activeSpotId === id
          ? (spots[0]?.id ?? null)
          : state.activeSpotId
        return { spots, activeSpotId }
      }),
      setActiveSpot: (id) => set({ activeSpotId: id }),
      clear: () => set({ spots: [], activeSpotId: null }),
    }),
    {
      name: 'fishcast-spots',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

`store/settingsStore.ts`:
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SettingsState {
  tempUnit: 'F' | 'C'
  speedUnit: 'mph' | 'kts'
  lengthUnit: 'ft' | 'm'
  alertThreshold: number
  alertsEnabled: boolean
  isPro: boolean
  setTempUnit: (u: 'F' | 'C') => void
  setSpeedUnit: (u: 'mph' | 'kts') => void
  setLengthUnit: (u: 'ft' | 'm') => void
  setAlertThreshold: (n: number) => void
  setAlertsEnabled: (v: boolean) => void
  setIsPro: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      tempUnit: 'F',
      speedUnit: 'mph',
      lengthUnit: 'ft',
      alertThreshold: 70,
      alertsEnabled: false,
      isPro: false,
      setTempUnit: (tempUnit) => set({ tempUnit }),
      setSpeedUnit: (speedUnit) => set({ speedUnit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setAlertThreshold: (alertThreshold) => set({ alertThreshold }),
      setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
      setIsPro: (isPro) => set({ isPro }),
    }),
    {
      name: 'fishcast-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/spotsStore.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add store/ __tests__/spotsStore.test.ts
git commit -m "feat: add spots and settings Zustand stores with AsyncStorage persistence"
```

---

## Task 4: Mock Data & Species Database

**Files:** `data/mockData.ts`, `data/species/westCoast.ts`, `data/species/northeast.ts`, `data/species/southeast.ts`, `data/species/freshwater.ts`, `data/species/index.ts`

- [ ] **Step 1: Create mockData.ts**

`data/mockData.ts`:
```typescript
import type { ConditionsData } from '../types/conditions'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

export const MOCK_SPOT: Spot = {
  id: 'spot_1',
  name: 'Bodega Bay',
  lat: 38.33,
  lng: -123.05,
  type: 'saltwater',
  stationId: '9415020',
  region: 'west_coast',
}

export const MOCK_CONDITIONS: ConditionsData = {
  fishingScore: 82,
  scoreLabel: 'Great day to fish',
  bestWindow: { start: '2:00 PM', end: '5:00 PM', score: 91 },
  wind: { speed: 8, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
  tide: {
    current: { height: 3.2, rising: true, unit: 'ft' },
    next: { type: 'high', time: '3:42 PM', height: 5.1 },
    events: [
      { type: 'low', time: '9:18 AM', height: 0.3 },
      { type: 'high', time: '3:42 PM', height: 5.1 },
      { type: 'low', time: '9:55 PM', height: 0.8 },
      { type: 'high', time: '4:12 AM', height: 4.6 },
    ],
    hourlyCurve: [0.8,0.5,0.3,0.5,1.1,1.9,2.8,3.6,4.3,4.8,5.0,5.1,
                  4.9,4.5,3.8,3.0,2.2,1.5,1.0,0.8,0.9,1.3,1.9,2.7],
    phase: 'incoming',
  },
  water: { temp: 57, unit: '°F' },
  air: { temp: 62, high: 67, low: 52, humidity: 78, unit: '°F' },
  pressure: { value: 30.02, trend: 'falling', rate: 'slow', unit: 'inHg' },
  swell: { height: 4.5, period: 12, direction: 290, directionLabel: 'WNW', unit: 'ft' },
  sky: { condition: 'Partly Cloudy', rainChance: 15, icon: 'partly-cloudy' },
  sun: { sunrise: '6:12 AM', sunset: '7:58 PM' },
  moon: {
    phase: 'Waxing Gibbous',
    illumination: 78,
    majorPeriods: [{ start: '2:15 PM', end: '4:15 PM' }, { start: '2:45 AM', end: '4:45 AM' }],
    minorPeriods: [{ start: '8:30 AM', end: '9:30 AM' }, { start: '9:00 PM', end: '10:00 PM' }],
  },
  hourlyScores: [
    { hour: '5AM', score: 65 }, { hour: '6AM', score: 72 },
    { hour: '7AM', score: 68 }, { hour: '8AM', score: 55 },
    { hour: '9AM', score: 48 }, { hour: '10AM', score: 42 },
    { hour: '11AM', score: 38 }, { hour: '12PM', score: 45 },
    { hour: '1PM', score: 58 }, { hour: '2PM', score: 78 },
    { hour: '3PM', score: 91 }, { hour: '4PM', score: 88 },
    { hour: '5PM', score: 82 }, { hour: '6PM', score: 75 },
    { hour: '7PM', score: 70 }, { hour: '8PM', score: 62 },
  ],
}

export const MOCK_FORECAST: DayForecast[] = [
  { date: '2026-05-04', dayLabel: 'Today', peakScore: 82, scoreLabel: 'Great day to fish', peakWindow: { start: '2 PM', end: '5 PM' } },
  { date: '2026-05-05', dayLabel: 'Tue', peakScore: 71, scoreLabel: 'Great day to fish', peakWindow: { start: '3 PM', end: '6 PM' } },
  { date: '2026-05-06', dayLabel: 'Wed', peakScore: 58, scoreLabel: 'Decent — pick your window', peakWindow: { start: '6 AM', end: '9 AM' } },
  { date: '2026-05-07', dayLabel: 'Thu', peakScore: 44, scoreLabel: 'Tough but possible', peakWindow: { start: '7 AM', end: '9 AM' } },
  { date: '2026-05-08', dayLabel: 'Fri', peakScore: 67, scoreLabel: 'Decent — pick your window', peakWindow: { start: '4 PM', end: '7 PM' } },
  { date: '2026-05-09', dayLabel: 'Sat', peakScore: 88, scoreLabel: 'Great day to fish', peakWindow: { start: '7 AM', end: '10 AM' } },
  { date: '2026-05-10', dayLabel: 'Sun', peakScore: 79, scoreLabel: 'Great day to fish', peakWindow: { start: '5 PM', end: '8 PM' } },
]
```

- [ ] **Step 2: Create West Coast species data**

`data/species/westCoast.ts`:
```typescript
import type { Species } from '../../types/species'

export const westCoastSpecies: Species[] = [
  {
    id: 'ca_halibut',
    common_name: 'California Halibut',
    scientific_name: 'Paralichthys californicus',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [3,4,5,6,7,8,9,10], months_peak: [5,6,7,8],
    water_temp_f: { min: 55, max: 68, peak_min: 58, peak_max: 65 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Move into bays and estuaries in spring. Found on sandy flats near channel edges.',
    tips: 'Drift live anchovies or swimbaits along sandy bottom near drop-offs on the incoming tide.',
  },
  {
    id: 'chinook_salmon',
    common_name: 'Chinook Salmon',
    scientific_name: 'Oncorhynchus tshawytscha',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [4,5,6,7,8,9], months_peak: [5,6,7],
    water_temp_f: { min: 48, max: 58, peak_min: 50, peak_max: 56 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Stage outside river mouths before running upstream. Follow bait schools.',
    tips: 'Troll anchovies or herring near the surface at dawn. Look for bird activity over bait.',
  },
  {
    id: 'rockfish',
    common_name: 'Rockfish',
    scientific_name: 'Sebastes spp.',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [4,5,6,7,8,9],
    water_temp_f: { min: 48, max: 62, peak_min: 50, peak_max: 58 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Year-round resident. Concentrate around rocky reefs, kelp beds, and structure.',
    tips: 'Drop jigs or baited hooks to the bottom near rocky structure. Current helps drift bait naturally.',
  },
  {
    id: 'lingcod',
    common_name: 'Lingcod',
    scientific_name: 'Ophiodon elongatus',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [3,4,5,9,10],
    water_temp_f: { min: 46, max: 60, peak_min: 48, peak_max: 56 },
    preferred_tide: 'outgoing', preferred_time_of_day: ['morning','afternoon'],
    migration_notes: 'Move shallow in spring to spawn on rocky reefs. Aggressive predators.',
    tips: 'Use large swimbaits or live rockfish near rocky bottom. They ambush from structure.',
  },
  {
    id: 'white_seabass',
    common_name: 'White Seabass',
    scientific_name: 'Atractoscion nobilis',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [3,4,5,6,7,8,9,10], months_peak: [5,6,7,8],
    water_temp_f: { min: 58, max: 72, peak_min: 62, peak_max: 68 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','dusk','night'],
    migration_notes: 'Follow squid spawning aggregations north in spring. Found near kelp beds.',
    tips: 'Fish live squid near kelp at night. Listen for their distinctive clicking sounds.',
  },
  {
    id: 'yellowtail',
    common_name: 'Yellowtail',
    scientific_name: 'Seriola lalandi',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [5,6,7,8,9,10,11], months_peak: [7,8,9,10],
    water_temp_f: { min: 62, max: 75, peak_min: 65, peak_max: 72 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Arrive from Baja with warm water. Found around kelp paddies and offshore structure.',
    tips: 'Live sardines or fast-retrieved jigs around kelp. Surface activity indicates feeding.',
  },
  {
    id: 'striped_bass_delta',
    common_name: 'Striped Bass',
    scientific_name: 'Morone saxatilis',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [3,4,5,6,7,8,9,10,11], months_peak: [4,5,6,9,10],
    water_temp_f: { min: 55, max: 68, peak_min: 58, peak_max: 65 },
    preferred_tide: 'outgoing', preferred_time_of_day: ['dawn','dusk'],
    migration_notes: 'Spawn in Delta rivers in spring. Resident population in San Francisco Bay year-round.',
    tips: 'Fish outgoing tide at river mouths and bridge pilings. Swimbaits and topwater at dawn.',
  },
  {
    id: 'albacore',
    common_name: 'Albacore Tuna',
    scientific_name: 'Thunnus alalunga',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [6,7,8,9,10], months_peak: [7,8,9],
    water_temp_f: { min: 60, max: 68, peak_min: 62, peak_max: 66 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Offshore pelagic species. Follow warm-water temperature breaks offshore.',
    tips: 'Troll feathers or cedar plugs along temperature breaks. Jig when fish are on the surface.',
  },
  {
    id: 'surfperch',
    common_name: 'Surfperch',
    scientific_name: 'Embiotocidae spp.',
    region: 'west_coast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [2,3,4,5],
    water_temp_f: { min: 50, max: 65, peak_min: 54, peak_max: 62 },
    preferred_tide: 'incoming', preferred_time_of_day: ['morning','afternoon'],
    migration_notes: 'Year-round in the surf zone. Concentrate near sandy beach troughs.',
    tips: 'Sand crabs or pile worms in the wash zone. Fish near holes and sandbars on the incoming tide.',
  },
  {
    id: 'cabezon',
    common_name: 'Cabezon',
    scientific_name: 'Scorpaenichthys marmoratus',
    region: 'west_coast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [11,12,1,2],
    water_temp_f: { min: 46, max: 60, peak_min: 48, peak_max: 56 },
    preferred_tide: 'outgoing', preferred_time_of_day: ['morning','midday'],
    migration_notes: 'Resident rocky reef species. Males guard nests in winter.',
    tips: 'Soft crabs or octopus near rocky bottom. Slow-rolling presentation works best.',
  },
  {
    id: 'pacific_bonito',
    common_name: 'Pacific Bonito',
    scientific_name: 'Sarda chiliensis',
    region: 'west_coast', type: 'saltwater', tier: 'free',
    months_present: [5,6,7,8,9,10], months_peak: [7,8,9],
    water_temp_f: { min: 60, max: 72, peak_min: 64, peak_max: 70 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','midday','afternoon'],
    migration_notes: 'Follow bait schools nearshore in warm months. Surface feeder.',
    tips: 'Cast metal jigs into surface blitzes. Fast retrieve triggers strikes.',
  },
  {
    id: 'bat_ray',
    common_name: 'Bat Ray',
    scientific_name: 'Myliobatis californica',
    region: 'west_coast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [5,6,7,8,9],
    water_temp_f: { min: 55, max: 72, peak_min: 60, peak_max: 68 },
    preferred_tide: 'incoming', preferred_time_of_day: ['morning','afternoon','dusk'],
    migration_notes: 'Common in bays and estuaries. Roots in sandy mud for clams and worms.',
    tips: 'Bottom fish with squid or clam on sandy mud flats. Fun fight, easy to catch.',
  },
  {
    id: 'leopard_shark',
    common_name: 'Leopard Shark',
    scientific_name: 'Triakis semifasciata',
    region: 'west_coast', type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [4,5,6,7,8],
    water_temp_f: { min: 54, max: 70, peak_min: 58, peak_max: 66 },
    preferred_tide: 'incoming', preferred_time_of_day: ['morning','afternoon'],
    migration_notes: 'Aggregates in warm shallow bays in summer. Common in SF Bay and Tomales Bay.',
    tips: 'Pile worms or squid on the bottom in shallow bays. Catch-and-release recommended.',
  },
  {
    id: 'sand_bass',
    common_name: 'Sand Bass',
    scientific_name: 'Paralabrax nebulifer',
    region: 'west_coast', type: 'saltwater', tier: 'free',
    months_present: [4,5,6,7,8,9,10], months_peak: [6,7,8],
    water_temp_f: { min: 58, max: 72, peak_min: 62, peak_max: 70 },
    preferred_tide: 'any', preferred_time_of_day: ['morning','afternoon','dusk'],
    migration_notes: 'Found over sandy bottom and rocky reefs in Southern California.',
    tips: 'Drop swimbaits or jigs near sandy-rocky transitions. Slow retrieve near the bottom.',
  },
  {
    id: 'coho_salmon',
    common_name: 'Coho Salmon',
    scientific_name: 'Oncorhynchus kisutch',
    region: 'west_coast', type: 'saltwater', tier: 'pro',
    months_present: [8,9,10,11], months_peak: [9,10],
    water_temp_f: { min: 46, max: 58, peak_min: 48, peak_max: 54 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','morning','dusk'],
    migration_notes: 'Fall run into coastal rivers. Stage outside river mouths before entering.',
    tips: 'Troll spinners or herring near river mouths. Fish incoming tide at creek outflows.',
  },
]
```

- [ ] **Step 3: Create region stubs and index**

`data/species/northeast.ts`:
```typescript
import type { Species } from '../../types/species'
export const northeastSpecies: Species[] = []
```

`data/species/southeast.ts`:
```typescript
import type { Species } from '../../types/species'
export const southeastSpecies: Species[] = []
```

`data/species/freshwater.ts`:
```typescript
import type { Species } from '../../types/species'
export const freshwaterSpecies: Species[] = []
```

`data/species/index.ts`:
```typescript
import type { Region } from '../../types/spot'
import type { Species } from '../../types/species'
import { westCoastSpecies } from './westCoast'
import { northeastSpecies } from './northeast'
import { southeastSpecies } from './southeast'
import { freshwaterSpecies } from './freshwater'

export function getSpeciesForRegion(lat: number, lng: number): Species[] {
  const region = detectRegion(lat, lng)
  switch (region) {
    case 'west_coast': return westCoastSpecies
    case 'northeast': return northeastSpecies
    case 'southeast': return southeastSpecies
    case 'freshwater': return freshwaterSpecies
  }
}

export function detectRegion(lat: number, lng: number): Region {
  if (lng < -114 && lat >= 32 && lat <= 49) return 'west_coast'
  if (lng > -82 && lat >= 24 && lat <= 31) return 'southeast'
  if (lng > -80 && lat > 35) return 'northeast'
  return 'freshwater'
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add data/
git commit -m "feat: add mock conditions data and West Coast species database"
```

---

## Task 5: Core Hooks (Phase A — mock data)

**Files:** `hooks/useConditions.ts`, `hooks/useForecast.ts`, `hooks/useSpots.ts`

- [ ] **Step 1: Create hooks**

`hooks/useConditions.ts`:
```typescript
import { MOCK_CONDITIONS } from '../data/mockData'
import type { ConditionsData } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseConditionsResult {
  data: ConditionsData | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

// Phase A: returns mock data immediately.
// Phase B: replace body with TanStack Query calls to real services.
export function useConditions(_spot: Spot | null): UseConditionsResult {
  return {
    data: _spot ? MOCK_CONDITIONS : null,
    isLoading: false,
    isError: false,
    refetch: () => {},
  }
}
```

`hooks/useForecast.ts`:
```typescript
import { MOCK_FORECAST } from '../data/mockData'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseForecastResult {
  data: DayForecast[]
  isLoading: boolean
}

export function useForecast(_spot: Spot | null): UseForecastResult {
  return {
    data: _spot ? MOCK_FORECAST : [],
    isLoading: false,
  }
}
```

`hooks/useSpots.ts`:
```typescript
import { useSpotsStore } from '../store/spotsStore'

export function useSpots() {
  const spots = useSpotsStore(s => s.spots)
  const activeSpot = useSpotsStore(s => s.activeSpot)
  const activeSpotId = useSpotsStore(s => s.activeSpotId)
  const addSpot = useSpotsStore(s => s.addSpot)
  const removeSpot = useSpotsStore(s => s.removeSpot)
  const setActiveSpot = useSpotsStore(s => s.setActiveSpot)
  return { spots, activeSpot, activeSpotId, addSpot, removeSpot, setActiveSpot }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/
git commit -m "feat: add useConditions, useForecast, useSpots hooks (Phase A mock data)"
```

---

## Task 6: Scoring Engine (Pure Function)

**Files:** `features/score/scoringEngine.ts`, `__tests__/scoringEngine.test.ts`

- [ ] **Step 1: Write failing tests**

`__tests__/scoringEngine.test.ts`:
```typescript
import { calculateScore, scoreLabel, scoreColor } from '../features/score/scoringEngine'
import type { ScoringInputs } from '../features/score/scoringEngine'

const ideal: ScoringInputs = {
  pressure: { value: 30.05, trend: 'falling', rate: 'slow' },
  solunar: { inMajorPeriod: true, inMinorPeriod: false, withinHourOfPeriod: false, isMajorMoonDay: false },
  tide: { phase: 'incoming', hoursFromTurn: 5 },
  wind: { speed: 8 },
  waterTemp: { value: 62, spotType: 'saltwater' },
  sky: { condition: 'overcast' },
  spotType: 'saltwater',
}

describe('calculateScore', () => {
  it('returns 100 for near-ideal saltwater conditions', () => {
    expect(calculateScore(ideal)).toBe(100)
  })

  it('returns low score for dangerous wind', () => {
    const score = calculateScore({ ...ideal, wind: { speed: 30 } })
    expect(score).toBeLessThan(40)
  })

  it('returns low score for heavy rain', () => {
    const score = calculateScore({ ...ideal, sky: { condition: 'heavy-rain' } })
    expect(score).toBeLessThan(50)
  })

  it('handles freshwater spot (no tide)', () => {
    const score = calculateScore({ ...ideal, tide: null, spotType: 'freshwater',
      waterTemp: { value: 68, spotType: 'freshwater' } })
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('clamps score to 0–100', () => {
    const score = calculateScore(ideal)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('gives rising pressure worst score', () => {
    const rising = calculateScore({ ...ideal, pressure: { value: 29.8, trend: 'rising', rate: 'fast' } })
    const falling = calculateScore(ideal)
    expect(rising).toBeLessThan(falling)
  })
})

describe('scoreLabel', () => {
  it('returns correct labels', () => {
    expect(scoreLabel(90)).toBe('Drop everything and go')
    expect(scoreLabel(75)).toBe('Great day to fish')
    expect(scoreLabel(60)).toBe('Decent — pick your window')
    expect(scoreLabel(45)).toBe('Tough but possible')
    expect(scoreLabel(20)).toBe('Stay home')
  })
})

describe('scoreColor', () => {
  it('returns green for high scores', () => expect(scoreColor(80)).toBe('#10B981'))
  it('returns amber for mid scores', () => expect(scoreColor(55)).toBe('#F59E0B'))
  it('returns red for low scores', () => expect(scoreColor(30)).toBe('#EF4444'))
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/scoringEngine.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement scoringEngine**

`features/score/scoringEngine.ts`:
```typescript
export interface ScoringInputs {
  pressure: { value: number; trend: 'rising' | 'falling' | 'stable'; rate: 'slow' | 'fast' | 'normal' }
  solunar: { inMajorPeriod: boolean; inMinorPeriod: boolean; withinHourOfPeriod: boolean; isMajorMoonDay: boolean }
  tide: { phase: 'incoming' | 'outgoing' | 'slack'; hoursFromTurn: number } | null
  wind: { speed: number }
  waterTemp: { value: number; spotType: 'saltwater' | 'freshwater' }
  sky: { condition: 'overcast' | 'partly-cloudy' | 'clear' | 'light-rain' | 'heavy-rain' }
  spotType: 'saltwater' | 'freshwater'
}

function pressurePoints(p: ScoringInputs['pressure']): number {
  if (p.trend === 'falling' && p.rate === 'slow') return 25
  if (p.trend === 'stable' && p.value > 30.10) return 20
  if (p.trend === 'stable') return 15
  if (p.trend === 'rising' && p.rate === 'slow') return 10
  if (p.trend === 'falling' && p.rate === 'fast') return 8
  return 5
}

function solunarPoints(s: ScoringInputs['solunar']): number {
  let pts = 5
  if (s.inMajorPeriod) pts = 20
  else if (s.inMinorPeriod) pts = 14
  else if (s.withinHourOfPeriod) pts = 10
  if (s.isMajorMoonDay) pts = Math.min(20, pts + 3)
  return pts
}

function tidePoints(tide: NonNullable<ScoringInputs['tide']>): number {
  if (tide.phase === 'slack') return 5
  if (tide.phase === 'incoming') {
    if (tide.hoursFromTurn <= 1) return 10
    if (tide.hoursFromTurn >= 4) return 20
    return 15
  }
  if (tide.hoursFromTurn <= 2) return 18
  return 12
}

function windPoints(speed: number): number {
  if (speed > 25) return 0
  if (speed > 18) return 5
  if (speed > 12) return 10
  if (speed >= 5) return 15
  return 8
}

function waterTempPoints(wt: ScoringInputs['waterTemp']): number {
  const [min, max] = wt.spotType === 'saltwater' ? [52, 72] : [58, 78]
  if (wt.value >= min && wt.value <= max) return 10
  if (wt.value >= min - 5 && wt.value <= max + 5) return 7
  if (wt.value >= min - 10 && wt.value <= max + 10) return 4
  return 2
}

function skyPoints(condition: ScoringInputs['sky']['condition']): number {
  switch (condition) {
    case 'overcast': return 10
    case 'partly-cloudy': return 8
    case 'light-rain': return 7
    case 'clear': return 5
    case 'heavy-rain': return 0
  }
}

export function calculateScore(inputs: ScoringInputs): number {
  const pressure = pressurePoints(inputs.pressure)
  const solunar = solunarPoints(inputs.solunar)
  const wind = windPoints(inputs.wind.speed)
  const waterTemp = waterTempPoints(inputs.waterTemp)
  const sky = skyPoints(inputs.sky.condition)

  const hasTide = inputs.tide && inputs.spotType === 'saltwater'
  const tide = hasTide ? tidePoints(inputs.tide!) : 0
  const base = pressure + solunar + tide + wind + waterTemp + sky

  // Freshwater: no tide weight (20pts missing) → scale to 100
  const score = hasTide ? base : Math.round(base * (100 / 80))
  return Math.min(100, Math.max(0, score))
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Drop everything and go'
  if (score >= 70) return 'Great day to fish'
  if (score >= 55) return 'Decent — pick your window'
  if (score >= 40) return 'Tough but possible'
  return 'Stay home'
}

export function scoreColor(score: number): string {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/scoringEngine.test.ts --no-coverage
```

Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add features/score/scoringEngine.ts __tests__/scoringEngine.test.ts
git commit -m "feat: add scoring engine with full algorithm and tests"
```

---

## Task 7: Tide Utilities & Species Scoring (Pure Functions)

**Files:** `features/tide/tideUtils.ts`, `features/species/speciesScoring.ts`, `__tests__/tideUtils.test.ts`, `__tests__/speciesScoring.test.ts`

- [ ] **Step 1: Write failing tests for tideUtils**

`__tests__/tideUtils.test.ts`:
```typescript
import { detectPhase, hoursFromLastTurn, formatTideHeight } from '../features/tide/tideUtils'

const risingCurve = [0.3,0.5,1.1,1.9,2.8,3.6,4.3,4.8,5.0,5.1,4.9,4.5,
                     3.8,3.0,2.2,1.5,1.0,0.8,0.9,1.3,1.9,2.7,3.2,3.8]

describe('detectPhase', () => {
  it('detects incoming tide', () => {
    expect(detectPhase(risingCurve, 3)).toBe('incoming')
  })
  it('detects outgoing tide', () => {
    expect(detectPhase(risingCurve, 12)).toBe('outgoing')
  })
  it('detects slack near peak', () => {
    expect(detectPhase(risingCurve, 9)).toBe('slack')
  })
})

describe('hoursFromLastTurn', () => {
  it('returns hours since last high or low', () => {
    const hrs = hoursFromLastTurn(risingCurve, 5)
    expect(hrs).toBeGreaterThanOrEqual(0)
    expect(hrs).toBeLessThanOrEqual(6)
  })
})

describe('formatTideHeight', () => {
  it('formats feet', () => expect(formatTideHeight(3.2, 'ft')).toBe('3.2 ft'))
  it('formats metres', () => expect(formatTideHeight(0.98, 'm')).toBe('1.0 m'))
})
```

`__tests__/speciesScoring.test.ts`:
```typescript
import { scoreSpecies } from '../features/species/speciesScoring'
import { westCoastSpecies } from '../data/species/westCoast'

const halibut = westCoastSpecies.find(s => s.id === 'ca_halibut')!

describe('scoreSpecies', () => {
  it('returns high score in peak month with matching conditions', () => {
    const result = scoreSpecies(halibut, {
      month: 6, waterTemp: 62, tidePhase: 'incoming', currentHour: 7,
    })
    expect(result.score).toBeGreaterThan(70)
    expect(result.status).toBe('Peak Season')
  })

  it('returns low score out of season', () => {
    const result = scoreSpecies(halibut, {
      month: 1, waterTemp: 62, tidePhase: 'incoming', currentHour: 7,
    })
    expect(result.score).toBeLessThan(40)
    expect(result.status).toBe('Inactive')
  })

  it('returns Present when present but not peak', () => {
    const result = scoreSpecies(halibut, {
      month: 3, waterTemp: 60, tidePhase: 'incoming', currentHour: 7,
    })
    expect(['Present', 'Active']).toContain(result.status)
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/tideUtils.test.ts __tests__/speciesScoring.test.ts --no-coverage
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement tideUtils**

`features/tide/tideUtils.ts`:
```typescript
export type TidePhase = 'incoming' | 'outgoing' | 'slack'

export function detectPhase(hourlyCurve: number[], currentHour: number): TidePhase {
  const i = Math.min(Math.max(currentHour, 1), 22)
  const prev = hourlyCurve[i - 1]
  const curr = hourlyCurve[i]
  const next = hourlyCurve[i + 1]
  const delta = curr - prev
  const slackThreshold = 0.25
  if (Math.abs(delta) < slackThreshold && Math.abs(next - curr) < slackThreshold) return 'slack'
  return delta > 0 ? 'incoming' : 'outgoing'
}

export function hoursFromLastTurn(hourlyCurve: number[], currentHour: number): number {
  for (let i = Math.min(currentHour, 22); i > 0; i--) {
    const prev = hourlyCurve[i - 1]
    const curr = hourlyCurve[i]
    const next = hourlyCurve[Math.min(23, i + 1)]
    const isLocalMax = curr >= prev && curr >= next
    const isLocalMin = curr <= prev && curr <= next
    if (isLocalMax || isLocalMin) return currentHour - i
  }
  return currentHour
}

export function formatTideHeight(height: number, unit: string): string {
  return `${height.toFixed(1)} ${unit}`
}
```

- [ ] **Step 4: Implement speciesScoring**

`features/species/speciesScoring.ts`:
```typescript
import type { Species, SpeciesScore } from '../../types/species'
import type { TidePhase } from '../tide/tideUtils'

interface ScoringContext {
  month: number         // 1–12
  waterTemp: number     // °F
  tidePhase: TidePhase
  currentHour: number   // 0–23
}

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
  if (tidePhase === 'slack') return 5
  return 8
}

function timePoints(species: Species, hour: number): number {
  const tod = hourToTimeOfDay(hour)
  if (species.preferred_time_of_day.includes(tod)) return 15
  return 5
}

function hourToTimeOfDay(hour: number): import('../../types/species').TimeOfDay {
  if (hour >= 5 && hour <= 7) return 'dawn'
  if (hour >= 8 && hour <= 11) return 'morning'
  if (hour >= 12 && hour <= 14) return 'midday'
  if (hour >= 15 && hour <= 17) return 'afternoon'
  if (hour >= 18 && hour <= 20) return 'dusk'
  return 'night'
}

function deriveStatus(score: number, isPeak: boolean, isPresent: boolean): SpeciesScore['status'] {
  if (!isPresent) return 'Inactive'
  if (isPeak && score >= 70) return 'Peak Season'
  if (score >= 55) return 'Active'
  return 'Present'
}

export function scoreSpecies(species: Species, ctx: ScoringContext): SpeciesScore {
  const isPresent = species.months_present.includes(ctx.month)
  const isPeak = species.months_peak.includes(ctx.month)
  const score = Math.min(100, monthPoints(species, ctx.month) +
    tempPoints(species, ctx.waterTemp) +
    tidePoints(species, ctx.tidePhase) +
    timePoints(species, ctx.currentHour))

  const { min, max } = species.water_temp_f
  const tempLabel = ctx.waterTemp >= min && ctx.waterTemp <= max
    ? `In range (${ctx.waterTemp}°F — ideal ${min}–${max}°F)`
    : `Outside range (${ctx.waterTemp}°F — ideal ${min}–${max}°F)`

  const tideLabel = species.preferred_tide === 'any'
    ? `${ctx.tidePhase} — neutral`
    : ctx.tidePhase === species.preferred_tide
      ? `${ctx.tidePhase} — preferred`
      : `${ctx.tidePhase} — not preferred`

  const tod = hourToTimeOfDay(ctx.currentHour)
  const timeLabel = species.preferred_time_of_day.includes(tod)
    ? `${tod} — prime time`
    : `${tod} — secondary`

  return {
    species,
    score,
    status: deriveStatus(score, isPeak, isPresent),
    waterTempMatch: tempLabel,
    tideMatch: tideLabel,
    timeMatch: timeLabel,
  }
}
```

- [ ] **Step 5: Run tests to confirm passing**

```bash
npx jest __tests__/tideUtils.test.ts __tests__/speciesScoring.test.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add features/tide/tideUtils.ts features/species/speciesScoring.ts \
  __tests__/tideUtils.test.ts __tests__/speciesScoring.test.ts
git commit -m "feat: add tide utilities and species scoring with tests"
```

---

## Task 8: ScoreDisplay Component

**Files:** `features/score/ScoreDisplay.tsx`, `__tests__/ScoreDisplay.test.tsx`

- [ ] **Step 1: Write failing component test**

`__tests__/ScoreDisplay.test.tsx`:
```typescript
import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { ScoreDisplay } from '../features/score/ScoreDisplay'

describe('ScoreDisplay', () => {
  const props = {
    score: 82,
    label: 'Great day to fish',
    bestWindow: { start: '2:00 PM', end: '5:00 PM', score: 91 },
  }

  it('renders the score number', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText('82')).toBeTruthy()
  })

  it('renders the label', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText('Great day to fish')).toBeTruthy()
  })

  it('renders best window', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText(/2:00 PM/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/ScoreDisplay.test.tsx --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ScoreDisplay**

`features/score/ScoreDisplay.tsx`:
```typescript
import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'

interface Props {
  score: number
  label: string
  bestWindow: { start: string; end: string; score: number }
}

export function ScoreDisplay({ score, label, bestWindow }: Props) {
  const animatedScore = useSharedValue(0)

  useEffect(() => {
    animatedScore.value = withTiming(score, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    })
  }, [score])

  const color = scoreColor(score)

  return (
    <View style={styles.container} testID="score-display">
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={styles.label}>{label}</Text>
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
  scoreNumber: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  bestWindow: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
})
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/ScoreDisplay.test.tsx --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add features/score/ScoreDisplay.tsx __tests__/ScoreDisplay.test.tsx
git commit -m "feat: add ScoreDisplay component with animated score"
```

---

## Task 9: ScoreTimeline Component

**Files:** `features/score/ScoreTimeline.tsx`

- [ ] **Step 1: Create ScoreTimeline**

`features/score/ScoreTimeline.tsx`:
```typescript
import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'
import type { HourlyScore } from '../../types/conditions'

interface Props {
  hourlyScores: HourlyScore[]
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 28

export function ScoreTimeline({ hourlyScores }: Props) {
  const maxScore = Math.max(...hourlyScores.map(h => h.score))

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Today's Forecast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {hourlyScores.map((item) => {
          const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
          const isPeak = item.score === maxScore
          const color = scoreColor(item.score)
          return (
            <View key={item.hour} style={styles.barWrapper}>
              <Text style={styles.scoreLabel}>{isPeak ? item.score : ''}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.7 },
                ]} />
              </View>
              <Text style={styles.hourLabel}>{item.hour}</Text>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  scroll: { paddingBottom: Spacing.xs, gap: Spacing.xs },
  barWrapper: { alignItems: 'center', width: BAR_WIDTH + 8 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  hourLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  scoreLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', height: 14 },
})
```

- [ ] **Step 2: Commit**

```bash
git add features/score/ScoreTimeline.tsx
git commit -m "feat: add ScoreTimeline horizontal bar chart component"
```

---

## Task 10: TideChart Component

**Files:** `features/tide/TideChart.tsx`, `__tests__/TideChart.test.tsx`

- [ ] **Step 1: Write failing test**

`__tests__/TideChart.test.tsx`:
```typescript
import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TideChart } from '../features/tide/TideChart'
import { MOCK_CONDITIONS } from '../data/mockData'

describe('TideChart', () => {
  const props = {
    tide: MOCK_CONDITIONS.tide!,
    currentHour: 14,
  }

  it('renders without crashing', () => {
    render(<TideChart {...props} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
  })

  it('shows high tide event label', () => {
    render(<TideChart {...props} />)
    expect(screen.getByText(/3:42 PM/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/TideChart.test.tsx --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement TideChart**

`features/tide/TideChart.tsx`:
```typescript
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle, Text as SvgText } from 'react-native-svg'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { TideData } from '../../types/conditions'

interface Props {
  tide: TideData
  currentHour: number
}

const CHART_WIDTH = 340
const CHART_HEIGHT = 140
const PADDING = { top: 20, bottom: 30, left: 8, right: 8 }

function curvePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

export function TideChart({ tide, currentHour }: Props) {
  const curve = tide.hourlyCurve
  const minH = Math.min(...curve)
  const maxH = Math.max(...curve)
  const range = maxH - minH || 1

  const chartW = CHART_WIDTH - PADDING.left - PADDING.right
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const toX = (i: number) => PADDING.left + (i / (curve.length - 1)) * chartW
  const toY = (h: number) => PADDING.top + chartH - ((h - minH) / range) * chartH

  const points = curve.map((h, i) => ({ x: toX(i), y: toY(h) }))
  const pathD = curvePath(points)
  const fillD = `${pathD} L ${toX(curve.length - 1)} ${CHART_HEIGHT - PADDING.bottom} L ${toX(0)} ${CHART_HEIGHT - PADDING.bottom} Z`

  const nowX = toX(currentHour)
  const nowY = toY(curve[currentHour] ?? curve[0])

  const hiLo = tide.events.slice(0, 2)

  return (
    <View style={styles.container} testID="tide-chart">
      <Text style={styles.sectionTitle}>Tides</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.ocean} stopOpacity={0.4} />
            <Stop offset="1" stopColor={Colors.ocean} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>
        <Path d={fillD} fill="url(#tideGrad)" />
        <Path d={pathD} stroke={Colors.ocean} strokeWidth={2} fill="none" />
        <Line x1={nowX} y1={PADDING.top} x2={nowX} y2={CHART_HEIGHT - PADDING.bottom}
          stroke={Colors.accent} strokeWidth={1.5} strokeDasharray="4 2" />
        <Circle cx={nowX} cy={nowY} r={4} fill={Colors.accent} />
      </Svg>
      <View style={styles.events}>
        {hiLo.map((ev, i) => (
          <Text key={i} style={styles.eventText}>
            {ev.type === 'high' ? '▲' : '▼'} {ev.time} {ev.height.toFixed(1)} ft
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  events: { flexDirection: 'row', gap: Spacing.lg, paddingTop: Spacing.xs },
  eventText: { fontSize: 12, color: Colors.textSecondary },
})
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/TideChart.test.tsx --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add features/tide/TideChart.tsx __tests__/TideChart.test.tsx
git commit -m "feat: add TideChart SVG component with bezier curve"
```

---

*Tasks 11–20 continue in Part 2 of this plan (see `2026-05-04-fishcast-phase-a-part2.md`).*
