# FishCast Phase C1 — Design Spec

**Date:** 2026-05-11  
**Status:** Approved

---

## Overview

Five distinct improvements to the dashboard and data layer:

1. Clickable condition detail screens (wind redesign + 5 new screens)
2. Pressure cursor fix (show value + hour on drag)
3. Default Bay Area spots (auto-seed on first launch)
4. Tide chart tick marks at high/low events, remove text event list
5. Date selector moved to top as a calendar with per-day score dots

---

## Feature 1 — Condition Detail Screens

### Goal

Every card in `ConditionsGrid` is tappable and opens a full-screen detail view with an hourly chart. Wind already has a detail screen but needs a visual redesign. Five new screens are added (swell, air temp, sky/rain, moon, sun). Pressure already has a detail screen but needs its cursor fixed (see Feature 2).

### Data model changes

**`services/nwsService.ts`**  
Add `temp: number` to each item in `hourlyForecast`:
```ts
hourlyForecast: { hour, windSpeed, cloudCover, rainChance, windDirection, temp }[]
```
Source: `p.temperature` is already present on each NWS hourly period.

**`services/marineService.ts`**  
Expose a `swellHourly` array on each `MarineDay`:
```ts
swellHourly: { hour: number; height: number; period: number; directionLabel: string }[]
```
Built from the existing per-day `heights`, `periods`, `directions` arrays (already fetched, just not surfaced).

**`types/conditions.ts`**  
Add to `ConditionsData`:
```ts
swellHourly: { hour: number; height: number; period: number; directionLabel: string }[] | null
airHourly:   { hour: number; temp: number; rainChance: number; cloudCover: number }[]
```
`windHourly` already exists. `airHourly` must be an explicit field (not inferred) because `index.tsx` passes it as a JSON route param.

**`services/scoringService.ts`**  
Wire `swellHourly` from the marine data and `airHourly` from the NWS `hourlyForecast` (fields: `hour`, `temp`, `rainChance`, `cloudCover`) into `buildConditionsData()`.

### Chart designs (all on dark theme `#131C2E` background)

| Screen | Chart style | Y-axis | Drag tooltip |
|---|---|---|---|
| Wind (redesigned) | Smooth gradient area + gust band + direction arrows every 4 hrs | mph | speed + direction |
| Swell (new) | Height as teal bars, period as orange dot-line overlay, dual y-axes | ft / s | height + period + direction |
| Air Temp (new) | Gradient fill + temperature-mapped gradient line stroke (blue=cold → orange=hot) | °F | temp at hour |
| Sky/Rain (new) | Rain % as smooth area gradient, cloud cover as subtle grey overlay band | % | rain % + cloud % |
| Moon (new) | List view: major solunar periods (bold), minor periods (dim), moon phase + illumination % | — | — |
| Sun (new) | List view: sunrise, solar noon, sunset, civil twilight, golden hour windows | — | — |

All chart screens use `PanResponder` for drag-to-scrub (same pattern as existing wind/pressure screens). Y-axis labels on the left. X-axis hour labels every 4 hrs.

### Navigation

All new screens live under `app/detail/`:
- `app/detail/swell.tsx`
- `app/detail/airtemp.tsx`
- `app/detail/sky.tsx`
- `app/detail/moon.tsx`
- `app/detail/sun.tsx`

Data is passed as a JSON-encoded route param (same pattern as existing `wind.tsx` and `pressure.tsx`).

**`features/conditions/ConditionsGrid.tsx`**  
Add `onPressSwell`, `onPressAir`, `onPressSky`, `onPressMoon`, `onPressSun` props alongside existing `onPressPressure`. Each card wrapped in `TouchableOpacity`.

**`app/(tabs)/index.tsx`**  
Wire all 6 `onPress` handlers to `router.push` with the appropriate data param.

---

## Feature 2 — Pressure Cursor Fix

### Problem

The drag tooltip on `app/detail/pressure.tsx` shows the value but not the hour. The `readings[]` array has no stored timestamps.

### Fix

`readings[N-1]` is always the current reading (newest). Compute hour labels directly in the screen:

```ts
const currentHour = new Date().getHours()
const hourForIndex = (i: number) => currentHour - (readings.length - 1 - i)
```

Format negative values by wrapping (`+ 24`). Show in tooltip:  
`"29.98 inHg · 3 PM"`

Also add:
- Y-axis labels (inHg values at grid lines)
- X-axis hour labels at each reading point
- "Now" label at the rightmost point

No data model changes needed.

---

## Feature 3 — Default Bay Area Spots

### Goal

On first launch (when `spots` is empty after store hydration), automatically seed a curated list of Bay Area fishing spots so the app has data immediately.

### Spots list (`data/defaultSpots.ts`)

| Name | Lat | Lng | Type |
|---|---|---|---|
| Berkeley Marina | 37.8659 | -122.3189 | saltwater |
| Pinole Point | 37.9085 | -122.3648 | saltwater |
| Horseshoe Cove (Fort Baker) | 37.8330 | -122.4785 | saltwater |
| Coyote Point Marina | 37.5889 | -122.3182 | saltwater |
| San Mateo Bridge (W end) | 37.5774 | -122.2477 | freshwater |

Each entry has `lat`, `lng`, `name`, `type`. No `stationId` — that is resolved at seed time via the existing `resolveNearestStation()` function (same path as manually added spots).

### Seeding logic (`app/_layout.tsx`)

After Zustand store hydration, in a `useEffect`:

```ts
if (spots.length === 0) {
  DEFAULT_SPOTS.forEach(async (s) => {
    const stationId = s.type === 'saltwater'
      ? await resolveNearestStation(s.lat, s.lng)
      : null
    addSpot({
      id: `default-${s.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      type: s.type,
      stationId,
      region: detectRegion(s.lat, s.lng),
    })
  })
}
```

Runs once, non-blocking. If the network is unavailable the spots are added with `stationId: null` (NOAA data will be skipped, solunar/NWS still works).

Use a `hasSeeded` ref (not the spots array length as a dependency) to guard against multiple fires during async resolution:
```ts
const hasSeeded = useRef(false)
useEffect(() => {
  if (hasSeeded.current || spots.length > 0) return
  hasSeeded.current = true
  // ... seed logic
}, [])
```

---

## Feature 4 — Tide Chart Tick Marks

### Goal

Replace the text event list below the tide chart with permanent `▲`/`▼` tick marks rendered directly on the chart x-axis at each high/low tide time.

### Implementation (`features/tide/TideChart.tsx`)

**Parse event time to fractional hour:**
```ts
function parseEventHour(timeStr: string): number {
  // e.g. "3:45 PM" → 15.75
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h + min / 60
}
```

**SVG tick group per event:**
```
- Short vertical tick line at the baseline (y = CHART_HEIGHT - PADDING.bottom to +5)
- ▲ or ▼ symbol 8px below the baseline
- Height value (e.g. "4.2 ft") 8px below the symbol
- Time label (e.g. "3:45 PM") 8px below height — only if space allows (hide if < 30px from adjacent tick)
```

X position: `toX(parseEventHour(ev.time))`. Clamp to chart bounds so labels don't clip.

**Remove:** the `<View style={styles.events}>` block and `styles.events` / `styles.eventText` style entries.

Chart height may need +10px of bottom padding (`PADDING.bottom: 30 → 40`) to fit the tick labels.

---

## Feature 5 — Date Selector Calendar

### Goal

Replace the bottom-sheet horizontal-scroll day picker with a date chip at the top of the dashboard that expands into a full-month calendar grid. Each calendar day shows a small color-coded dot representing the forecasted fishing score.

### Layout

**Position:** Just below the spot name header, above `ScoreDisplay`. Replaces the existing `dateChip` `TouchableOpacity` and the `Modal` bottom sheet.

**Date chip (collapsed state):**  
`📅 Sun, May 11 — Today  ▾`  
Tapping it expands the calendar inline (not a modal). Tapping the chip again or tapping a date collapses it.

**Calendar (expanded state) — inline, not a modal:**
- Month header with ‹ › navigation to previous/next month
- Weekday headers: S M T W T F S
- Full month grid, 7 columns
- Each day cell: date number (large) + small score dot below

**Score dot colors:**

| Score | Color | Label |
|---|---|---|
| 85–100 | `#4CAF70` | Drop everything |
| 70–84 | `#8BC34A` | Great |
| 55–69 | `#FFC107` | Decent |
| 40–54 | `#FF9800` | Tough |
| 0–39 | `#F44336` | Stay home |
| Past day | `#2A3C50` | No dot (dim) |
| Pro-locked | Greyed + 🔒 | No dot |

**Score source:** `forecastService.ts` is a Phase B2 stub that currently throws. For this phase, score dots are only shown for **today** (from `conditions.fishingScore`). All future days render with a dim grey dot (no score yet). The calendar still functions for date selection — score dots for future days light up automatically once Phase B2 lands. Pro-locked days (8–14) show a 🔒 overlay regardless.

### State

`showCalendar: boolean` replaces `showDatePicker`. No `Modal` component needed — the calendar renders inline inside the `ScrollView` between the header and `ScoreDisplay`. When `showCalendar` is true, the calendar card appears and the scroll view shifts content down.

### Changes

- `app/(tabs)/index.tsx`: Replace `Modal` + horizontal `ScrollView` with inline calendar component
- New component: `features/calendar/DayCalendar.tsx` — self-contained, accepts `selectedDate`, `onSelect`, `forecast` (for score dots), `isPro`
- Remove `getDayPills()` helper and pill styles from `index.tsx`

---

## Out of Scope

- Species data for northeast/southeast/freshwater regions (Phase C)
- Push notifications (Phase C)
- RevenueCat Pro subscription integration (Phase C)
- `forecastService.ts` implementation (Phase B2)
