# FishCast UI Refresh — Design Spec
Date: 2026-05-10

## Overview

Four features: circle fishing score, interactive metric charts with modals, GPS-centered spot picker with NOAA station markers, and settings unit conversions wired through all display components.

---

## Feature 1: Circle Fishing Score

**What changes:** `features/score/ScoreDisplay.tsx`

Replace the plain large number with an SVG circular progress arc. The arc fills clockwise from the top as score increases (empty at 0, full at 100).

**Visual style (confirmed: Option B):**
- Background track: dark ring at full 360°
- Progress arc: gradient stroke (dark blue `#0077b6` → teal `#48cae4`), rounded linecap
- Inside the ring, stacked vertically:
  - Score number (white, ~42px, bold)
  - "Fishing Score" (teal, ~10px, letter-spaced uppercase)
  - Score label e.g. "Great day to fish" (muted, ~9px)
- Best window text stays below the circle as-is
- Arc animates from 0 on mount using the existing `react-native-reanimated` shared value; drive `stroke-dasharray` via a derived animated prop

**Implementation notes:**
- `react-native-svg` is already installed — use `<Circle>` with `stroke-dasharray`
- Arc circumference = 2π × r. At r=58, circumference ≈ 364. Filled length = `(score/100) × 364`
- SVG rotated -90° so arc starts at top

---

## Feature 2: Forecast Screen (renamed from Dashboard)

### 2a. Tab rename
- `app/(tabs)/_layout.tsx`: change the tab label from "Dashboard" / "index" to "Forecast"
- `app/(tabs)/index.tsx`: rename exported function `DashboardScreen` → `ForecastScreen`

### 2b. Stat cards — daily hi/lo
The three quick-stat cards (Wind, Tide, Water) each gain a fourth line showing the daily range or peak below the current value:

| Card | Current | Added line |
|------|---------|------------|
| Wind | speed + direction | "↑ {peak} mph max" (max from NOAA hourly wind array) |
| Tide | height + rising/falling | "▲ {high}ft @ {time}" (next high tide event) |
| Water | temp + unit | Omit range — NOAA water_temperature is a single point reading, not hourly; showing a fake range would be misleading |

Wind peak and hourly wind array come from NOAA's `wind` product (already fetched in `noaaService.ts`). Expose the raw hourly array on `ConditionsData` so both the stat card and the wind modal can use it. The tide next-high-event is already present in `conditions.tide.events`.

### 2c. Tide chart — touch-draggable cursor
**What changes:** `features/tide/TideChart.tsx`

Wrap the `<Svg>` in a `<View>` with a `PanResponder` (or `react-native-gesture-handler` `Gesture.Pan`). On touch/drag:
- Compute the hour index from the touch X position: `hourIndex = Math.round((touchX - PADDING.left) / chartW × (curve.length - 1))`
- Clamp to valid range
- Render a vertical `<Line>` at that X position
- Render a small label bubble above the line: `"{height} ft"` at the computed Y
- On release, cursor stays visible; a second tap anywhere dismisses it (or it auto-fades after 2s)

No new screen or modal for tide.

### 2d. Wind detail modal
**New file:** `app/detail/wind.tsx`

Opened via `router.push('/detail/wind')` when user taps the WindDisplay card. Pass conditions data as a JSON param (same pattern as `species/[id].tsx`).

Contents:
- Header: "Wind" + close button (`router.back()`)
- Hourly bar chart: NOAA hourly wind speeds (same array used for wind peak on stat card), bars colored by intensity
- Scrub interaction: touch/drag over bars → floating label shows `"{speed} mph {direction}"` for that hour
- Below chart: "Peak: {max} mph at {time}" — one line, no table

**Data note:** `nwsService.ts` currently returns only the current-period wind. The NOAA `wind` product already returns an hourly array — use that as the source for both the modal chart and the daily peak. No NWS changes needed.

**Route registration:** Add `app/detail/wind.tsx` as a modal in the root Stack in `app/_layout.tsx` (same as `spot/new` and `species/[id]`).

### 2e. Pressure detail modal
**New file:** `app/detail/pressure.tsx`

Opened via `router.push('/detail/pressure')` when user taps PressureCard.

Contents:
- Header: "Pressure" + close button
- Line chart: NOAA hourly air_pressure readings for the available window (up to 8 readings)
- Scrub interaction: touch → floating label shows `"{reading} inHg"` at that hour
- Below chart: plain-English trend sentence, e.g. "Falling slowly — barometric drop often triggers feeding activity" or "Rising fast — fish tend to go deep and feed less"

### 2f. Score bar — Pro paywall placeholder
When user taps a bar in `ScoreTimeline`, show a small inline tooltip: "Score breakdown — Pro feature" with an upgrade prompt. No factor breakdown is built. This is a placeholder for a future AI-powered explainer (Phase C).

---

## Feature 3: Add Spot — GPS Location + NOAA Station Markers

### 3a. GPS centering
**What changes:** `app/spot/new.tsx`

On mount, request foreground location via `expo-location` (`Location.requestForegroundPermissionsAsync()`). If granted, call `Location.getCurrentPositionAsync()` and:
- Update `coords` state to user's lat/lng
- Re-center the `MapView` via a `ref` + `animateToRegion()`
- Set a reasonable zoom (latitudeDelta: 0.3, longitudeDelta: 0.3)

If denied, map stays at the existing default (38.33, -123.05).

### 3b. Nearby NOAA station markers
**What changes:** `services/noaaStationService.ts`

Add a new exported function:
```ts
export async function getNearbyStations(
  lat: number, lng: number, radiusKm: number = 150
): Promise<Array<{ id: string; name: string; lat: number; lng: number }>>
```

This reuses the existing station list fetch but returns the top N stations (cap at 20) sorted by distance within `radiusKm`, with their name and coordinates.

**In `app/spot/new.tsx`:**
- After GPS resolves (or on initial mount with default coords), call `getNearbyStations(lat, lng)`
- Store result in local state `nearbyStations`
- Render each as a `<Marker>` on the map with a distinct color (e.g. `Colors.ocean`) and a small label showing the station name
- Tapping a station marker:
  - Sets `coords` to the station's lat/lng
  - Pre-fills `name` with the station name (if name field is still empty)
  - The user's draggable pin moves to that position

### 3c. No changes to spot save flow
`resolveNearestStation()` still runs on save for saltwater spots. The marker tap just pre-fills UI state — the actual station ID is still resolved at save time.

---

## Feature 4: Settings Unit Conversions

The `settingsStore` already persists `speedUnit`, `tempUnit`, and `lengthUnit` correctly. The bug is that display components never read from the store.

### Conversion factors
- Speed: `mph → kts`: multiply by `0.868`
- Temp: `F → C`: `(F - 32) × 5/9`
- Length: `ft → m`: multiply by `0.3048`

### Components to update

| Component | Setting | Where to apply |
|-----------|---------|----------------|
| `WindDisplay.tsx` | `speedUnit` | Convert speed value before display; show "mph" or "kts" label |
| Wind detail modal (new) | `speedUnit` | Same conversion on all hourly values |
| Water temp quick card (`index.tsx`) | `tempUnit` | Convert `conditions.water.temp`; show "°F" or "°C" (no range — single reading) |
| `TideChart.tsx` event heights | `lengthUnit` | Convert `ev.height` in events list; show "ft" or "m" |
| Tide draggable cursor bubble | `lengthUnit` | Convert displayed height |
| Tide quick card (`index.tsx`) | `lengthUnit` | Convert `conditions.tide.current.height` |

Each component reads `const { speedUnit } = useSettingsStore(s => ({ speedUnit: s.speedUnit }))` (subscribe to only the relevant field to avoid unnecessary re-renders).

---

## Files Changed / Created

| File | Change |
|------|--------|
| `features/score/ScoreDisplay.tsx` | Rewrite to SVG circle arc |
| `app/(tabs)/_layout.tsx` | Rename tab label |
| `app/(tabs)/index.tsx` | Rename fn, stat card hi/lo, tappable Wind + Pressure cards |
| `features/tide/TideChart.tsx` | Add touch-drag cursor |
| `features/wind/WindDisplay.tsx` | Unit conversion + `onPress` prop |
| `features/conditions/PressureCard.tsx` | `onPress` prop |
| `features/score/ScoreTimeline.tsx` | Pro lock on bar tap |
| `services/noaaStationService.ts` | Add `getNearbyStations()` |
| `app/spot/new.tsx` | GPS centering + station markers |
| `app/_layout.tsx` | Register new modal routes |
| `app/detail/wind.tsx` | **New** — wind detail modal |
| `app/detail/pressure.tsx` | **New** — pressure detail modal |

---

## Out of Scope

- Wind map / particle visualization (Windy.com style) — deferred, requires gridded data
- Score factor breakdown — placeholder only; AI explainer is Phase C Pro feature
- Species detail modals — unchanged
- Forecast strip (Phase B2) — unchanged
- Water temp detail modal — not enough data to justify; range shown inline only
