# FishCast MVP — Design Spec
**Date:** 2026-05-04
**Tagline:** "Open app. See your spot. Know if you should go."

---

## 1. Overview

FishCast is a React Native + Expo iOS app that replaces the 4–5 apps anglers check before every fishing trip (Windy, NOAA tides, Weather, Surfline, solunar tables) with a single screen per spot. It combines real-time weather, wind, tides, water conditions, a composite fishing score, and species activity data into one glanceable view.

**Target user:** Recreational saltwater and freshwater anglers in the US.
**Primary launch region:** West Coast US (California / Pacific Northwest).
**Multi-region:** Species database architected for Northeast, Southeast, and freshwater from day one — West Coast populated at launch, others stubbed.

---

## 2. MVP Scope

The MVP is a fully working app with real API data — no mock-only release.

### Included in MVP
- Spot Dashboard with all P0 + P1 features from the plan
- Real-time conditions from NOAA, NWS, and Open-Meteo
- Composite fishing score (0–100) with algorithm from the plan
- Tide chart (SVG), score timeline, conditions grid, wind display
- What's Biting — West Coast species cards
- 7-day fishing score forecast
- Saved spots (unlimited for Pro, 1 for Free) via AsyncStorage
- Push notifications (score threshold alerts, local via Expo)
- RevenueCat subscription paywall
- Settings: units, notification threshold, subscription management

### Explicitly Out of MVP
- Supabase / user accounts / cloud sync (v1.5)
- Animated wind map overlay (v1.5)
- Apple Watch / iOS widget (v2.0)
- Spot sharing (v2.0)
- Historical comparison (v2.0)
- Species databases for Northeast, Southeast, Freshwater (stubs only)

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Expo SDK 52+, React Native, TypeScript | Cross-platform, Expo Go for fast iteration |
| Navigation | Expo Router (file-based) | Built-in deep linking, less boilerplate, Expo standard |
| Server state | TanStack Query v5 | Handles caching, loading/error states, background refetch |
| Client state | Zustand + AsyncStorage | Simple local state; spots + settings persist across restarts |
| Charts/SVG | react-native-svg | Tide curve, score timeline |
| Animations | react-native-reanimated | Score count-up, wind arrow rotation |
| Moon/Sun | suncalc (local) | No API needed for solunar calculations |
| Push notifications | Expo Notifications + Expo TaskManager | Local notifications, no backend required for MVP |
| Subscriptions | RevenueCat (react-native-purchases) | Handles App Store billing, pre-built paywall UI |
| Maps | react-native-maps | Spot picker on add-spot screen |
| Build / test | EAS Build + Expo Go | Test on real device without a simulator |

---

## 4. Architecture

### Approach
Feature-based folder structure. Each feature domain owns its components, hooks, and utilities. A central `useConditions(spot)` hook is the single data interface for the dashboard — it returns a normalized `ConditionsData` shape whether the source is mock data (Phase A) or real APIs (Phase B). **Dashboard components never change between phases.**

### Folder Structure

```
app/                          ← Expo Router screens
  (tabs)/
    index.tsx                 ← Dashboard (main tab)
    spots.tsx                 ← Spots list tab
    settings.tsx              ← Settings tab
  spot/
    new.tsx                   ← Add spot (map picker)
    [id].tsx                  ← Edit spot
  species/
    [id].tsx                  ← Species detail

features/
  score/
    ScoreDisplay.tsx          ← Big score + label + best window
    ScoreTimeline.tsx         ← Hourly bar chart
    scoringEngine.ts          ← Pure scoring algorithm (no UI, no side effects)
  tide/
    TideChart.tsx             ← SVG tide curve with current position marker
    tideUtils.ts              ← Phase detection (incoming/outgoing/slack)
  wind/
    WindDisplay.tsx           ← Speed, direction arrow, gusts
  conditions/
    ConditionsGrid.tsx        ← 2×3 card grid
    PressureCard.tsx
    MoonCard.tsx
  species/
    SpeciesCard.tsx           ← Collapsed card (name, score, status)
    SpeciesDetail.tsx         ← Full detail screen content
    speciesScoring.ts         ← Per-species score calculator

services/
  noaaService.ts              ← Tides, wind, water temp, pressure (NOAA CO-OPS)
  nwsService.ts               ← Air temp, forecast, cloud cover, rain (NWS)
  marineService.ts            ← Swell height/period/direction (Open-Meteo)
  solunarService.ts           ← Moon/sun calculations (suncalc, no network)
  scoringService.ts           ← Merges all inputs → ConditionsData + score
  forecastService.ts          ← 7-day score array from NWS 7-day + solunar

hooks/
  useConditions.ts            ← Main hook: all conditions for active spot
  useForecast.ts              ← 7-day score forecast
  useSpots.ts                 ← Zustand-backed saved spots CRUD

data/
  mockData.ts                 ← Full mock ConditionsData (Phase A)
  species/
    westCoast.ts              ← 15–20 West Coast species (populated)
    northeast.ts              ← Stub (empty array, correct types)
    southeast.ts              ← Stub
    freshwater.ts             ← Stub
    index.ts                  ← getSpeciesForRegion(lat, lng) → species[]

store/
  spotsStore.ts               ← Zustand: saved spots list, active spot ID
  settingsStore.ts            ← Zustand: units, alert threshold, isPro flag

theme/
  colors.ts                   ← Full palette (background, surface, card, accents)
  typography.ts
  spacing.ts

types/
  conditions.ts               ← ConditionsData, TideData, WindData, etc.
  species.ts                  ← Species, SpeciesScore
  spot.ts                     ← Spot (id, name, lat, lng, type, stationId)
```

### Core Data Contract

```typescript
// types/conditions.ts — the shape useConditions always returns
interface ConditionsData {
  fishingScore: number
  scoreLabel: string
  bestWindow: { start: string; end: string; score: number }
  wind: WindData
  tide: TideData
  water: { temp: number; unit: string }
  air: AirData
  pressure: PressureData
  swell: SwellData
  sky: SkyData
  sun: SunData
  moon: MoonData
  hourlyScores: { hour: string; score: number }[]
}
```

---

## 5. Services & Caching

### NOAA CO-OPS
- **Data:** tide predictions (hi/lo + hourly curve), wind, water temperature, barometric pressure, air temperature
- **Cache TTL:** 30 minutes
- **Auth:** None required
- **Station resolution:** On spot save, fetch full station list → filter to stations that have at minimum `water_level` OR `predictions` (tide data) → find closest by haversine distance → store `stationId` on the `Spot` object. Wind and temperature are optional — fall back to NWS if unavailable at the selected station.

### NWS Weather API
- **Data:** air temp, hourly forecast, cloud cover, rain probability
- **Cache TTL:** 60 minutes
- **Auth:** None (User-Agent header identifying FishCast required)
- **Flow:** `GET /points/{lat},{lng}` → extract `forecastHourly` URL → fetch hourly forecast

### Open-Meteo Marine
- **Data:** swell height, period, direction
- **Cache TTL:** 60 minutes
- **Auth:** None required

### Solunar (local)
- **Data:** moon phase, illumination, rise/set times, major/minor periods
- **Cache TTL:** 24 hours (pure math, no network call)
- **Library:** `suncalc`

### Forecast Service (7-day)
- Pulls NWS 7-day hourly forecast (wind, cloud, rain, air temp)
- Calculates solunar periods for each of the 7 days locally
- Uses last-known NOAA water temp (valid for 7-day outlook — changes slowly)
- Runs scoring algorithm per hour → extracts peak score + best window per day
- Returns: `DayForecast[]` with `{ date, peakScore, peakWindow, scoreLabel }`

### NOAA Station Fallback
Some NOAA stations lack certain products (e.g., inland gauges have no tide data). Fallback rules:
- No water level → hide tide section, show "Tides unavailable for this location"
- No water temperature → hide water temp card
- No wind from NOAA → use NWS wind data instead
- For freshwater spots: tide section hidden, tide weighting redistributed to other scoring factors

---

## 6. Navigation

### Structure
```
Bottom tabs (3):
  Dashboard (index)     ← default tab
  Spots List
  Settings

Stack screens (modal slide-up):
  Add/Edit Spot         ← from Spots tab "+" button
  Species Detail        ← from species card tap
```

### Tab Bar
Dark background (`#0B1622`), sea foam green (`#00C9A7`) active indicator. Icons: compass (Dashboard), map pin (Spots), gear (Settings).

---

## 7. Screens

### Dashboard (Tab 1)
Single `ScrollView`, sections top to bottom:

1. **Header** — spot name + chevron (taps to Spots tab to switch spot)
2. **Score display** — large score number (60–72px), color-coded, label, best window callout, count-up animation on load
3. **Score timeline** — horizontal bar chart, 16 hours, color-coded bars, peak hour highlighted
4. **Quick stats row** — wind speed/direction, tide height/trend, water temp (3 cards in a row)
5. **Tide chart** — SVG bezier curve, gradient fill, hi/lo labels, current position marker
6. **Conditions grid** — 2×3 cards: pressure (with trend arrow), swell, air temp, sky/rain, moon phase, sunrise/sunset
7. **What's Biting** — species cards, expandable on tap, sorted by species score desc
8. **7-day forecast** — horizontally scrollable strip of day cards (day name, score badge, best window)

### Spots List (Tab 2)
- `FlatList` of saved spots — spot name + current fishing score badge
- Swipe left to delete (with confirmation alert)
- Tap → sets active spot in Zustand, switches to Dashboard tab
- "+" button → navigates to Add Spot
- Empty state: "Add your first fishing spot to get started"
- Free tier: shows upgrade prompt when user tries to add a second spot

### Settings (Tab 3)
- **Units:** °F / °C toggle, mph / kts toggle, ft / m toggle
- **Score alerts:** on/off toggle + threshold slider (40–90)
- **Notifications:** permission status + re-request prompt if denied
- **Pro subscription:** current status, upgrade CTA, manage plan (links to RevenueCat)
- **App version / about**

### Add Spot (Stack)
1. Search field (geocode by name) OR tap to drop pin on MapView
2. react-native-maps MapView, full screen with pin
3. "Name this spot" text input (pre-filled with geocode result)
4. Saltwater / Freshwater selector (affects scoring weights + species list)
5. Save → resolves nearest NOAA station → persists to Zustand/AsyncStorage → pops back

### Species Detail (Stack)
- Full species info (name, scientific name, image placeholder)
- 12-month activity heatmap bar (green = peak, teal = present, grey = absent)
- "Currently at your spot" badge if species score ≥ 60
- Preferred conditions breakdown: temp range, tide preference, time of day
- Fishing tip text
- Navigation: back to Dashboard

---

## 8. Scoring Algorithm

See full algorithm in `references/fishcast-project-plan-v2.md` Section 5.

Key implementation notes:
- `scoringEngine.ts` is a pure function: `calculateScore(inputs: ScoringInputs): number` — no async, no side effects, fully testable
- For freshwater spots, the 20-point tide weight is redistributed: +10 to barometric pressure, +5 to wind, +5 to water temp
- Score is clamped to 0–100

### Score Display Thresholds
| Score | Color | Label |
|---|---|---|
| 85–100 | `#10B981` green | "Drop everything and go" |
| 70–84 | `#10B981` green | "Great day to fish" |
| 55–69 | `#F59E0B` amber | "Decent — pick your window" |
| 40–54 | `#F59E0B` amber | "Tough but possible" |
| 0–39 | `#EF4444` red | "Stay home" |

---

## 9. Species Database

### Data Shape (per species)
```typescript
interface Species {
  id: string
  common_name: string
  scientific_name: string
  region: 'west_coast' | 'northeast' | 'southeast' | 'freshwater'
  type: 'saltwater' | 'freshwater'
  tier: 'free' | 'pro'            // free = common/small fish; pro = desirable/trophy
  months_present: number[]        // 1–12
  months_peak: number[]
  water_temp_f: { min: number; max: number; peak_min: number; peak_max: number }
  preferred_tide: 'incoming' | 'outgoing' | 'any'
  preferred_time_of_day: ('dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night')[]
  migration_notes: string
  tips: string
}
```

### West Coast Launch Species (15–20)
California Halibut, Pacific Salmon (Chinook/Coho), Rockfish, Lingcod, White Seabass, Yellowtail, Striped Bass (Delta/Bay), Surfperch, Cabezon, Albacore Tuna, Dungeness Crab, Pacific Bonito, Bat Ray, Leopard Shark, Sand Bass

### Region Detection
`getSpeciesForRegion(lat, lng)` maps lat/lng to region automatically at spot-save time. No user input needed. West Coast: lng < -114 and lat between 32–49. Falls back gracefully if no match.

---

## 10. Push Notifications

- Expo Notifications for permission + token registration
- Expo TaskManager registers a background fetch task (fires hourly when app is backgrounded)
- Background task: fetch current score for active spot → if score ≥ user threshold → fire local notification
- Local notifications require no backend for MVP
- Notification copy: *"Fishing score at [Spot Name] just hit [Score] — [label]"*
- Limitation: iOS background fetch frequency is OS-controlled and not guaranteed; acceptable for MVP

---

## 11. Free vs Pro Gating

| Feature | Free | Pro |
|---|---|---|
| Saved spots | 1 | Unlimited |
| Current conditions + score | ✓ | ✓ |
| Tide chart | ✓ | ✓ |
| Score timeline (today) | ✓ | ✓ |
| Swell data | ✓ | ✓ |
| What's Biting — common/small species | ✓ | ✓ |
| What's Biting — desirable/trophy species | — | ✓ |
| 7-day forecast | — | ✓ |
| Push alerts | — | ✓ |
| Ad-free | — | ✓ |

### What's Biting Gating Detail
Each species in the database gets a `tier: 'free' | 'pro'` field. Free users see the full species list but desirable/trophy species show a blurred card with a lock icon and "Upgrade to Pro to see what's biting" CTA. This gives free users the hook ("something good is active right now") without the payoff.

**West Coast tier examples:**
- Free: Surfperch, Bat Ray, Leopard Shark, Cabezon, Pacific Bonito
- Pro: California Halibut, Pacific Salmon (Chinook/Coho), Rockfish, Lingcod, White Seabass, Yellowtail, Albacore Tuna, Striped Bass (Delta/Bay)

`settingsStore.isPro` (boolean, synced from RevenueCat `CustomerInfo` at launch) gates all Pro features. RevenueCat pre-built paywall UI for MVP — no custom paywall to build.

**Pricing (to be finalized — indicative):**
- Pro Monthly: ~$4.99/mo
- Pro Annual: ~$34.99/yr
- Pro Lifetime: ~$24.99 one-time (limited time launch offer)

---

## 12. Error Handling & Loading States

- **Loading:** Skeleton placeholder shimmer per section — never a full-screen spinner
- **API error:** Section shows "Unavailable" with retry icon — app never crashes
- **Partial data:** Dashboard renders available sections; missing sections show "Unavailable" inline
- **No internet:** Serve TanStack Query cached data; show subtle "Offline — showing cached data" banner
- **NOAA station missing products:** Per-section fallback (see Services section above)

---

## 13. Build Sequence

### Phase A — Static UI (Weeks 1–4)
1. Project scaffold (Expo Router, theme, Zustand stores, mock data)
2. Score display + score timeline component
3. Tide chart (SVG bezier curve)
4. Wind display + conditions grid
5. Full dashboard assembly — testable via Expo Go
6. Spots list + add spot (map picker, AsyncStorage)
7. Species cards + species detail screen
8. 7-day forecast strip (mock)
9. Settings screen + notification permission flow

### Phase B — Real Data (Weeks 5–8)
1. NOAA service → wire to `useConditions`
2. NWS service → wire to `useConditions`
3. Open-Meteo marine service → wire to `useConditions`
4. Solunar service (local, suncalc)
5. Scoring algorithm (real inputs)
6. 7-day forecast service
7. Background fetch + local push notifications
8. RevenueCat paywall + Pro gating

Each Phase B step: build service → unit test service → swap into `useConditions` → verify dashboard unchanged.

---

## 14. Design Tokens

```
Background:       #0B1622
Surface:          #142233
Card:             #1A2D42
Primary accent:   #00C9A7  (sea foam green — scores, CTAs)
Secondary accent: #3B82F6  (ocean blue — tide, water data)
Warning:          #F59E0B  (amber)
Danger:           #EF4444  (red)
Success:          #10B981  (green)
Text primary:     #F1F5F9
Text secondary:   #94A3B8
Text tertiary:    #64748B
```

Dark theme default. No light theme for MVP.
