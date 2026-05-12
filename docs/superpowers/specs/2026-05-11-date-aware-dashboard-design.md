# Date-Aware Dashboard & Tide Chart Time Scrub — Design Spec
**Date:** 2026-05-11

---

## Overview

Two related features:

1. **Tide chart time scrub** — when dragging the tide chart cursor, show the time of day below the current height label.
2. **Date-aware dashboard** — the dashboard defaults to today but can be switched to any of the next 7 days. Days 8+ are Pro-locked. All data updates to reflect the selected day.

---

## Feature 1: Tide Chart Time Scrub

### What changes

`TideChart.tsx` already tracks `touchedHour` (0–23) on drag and renders a height label at the cursor. We add a time label directly below it.

### Display format

```
4.2 ft
2:00 PM
```

`touchedHour` maps directly to display time: `hour 14` → `2:00 PM`. No new props needed — all information is already available inside the component.

### Scope

One small addition inside the existing scrub overlay render in `TideChart.tsx`. No other files change.

---

## Feature 2: Date-Aware Dashboard

### UI

**Dashboard header** gains a tappable date chip:

```
Mavericks                    Switch ›
       Mon, May 11  ▾
```

Tapping opens a bottom sheet with a horizontal scrollable row of day pills:

```
[ Today ] [ Tue ] [ Wed ] [ Thu ] [ Fri ] [ Sat ] [ Sun ] [ 🔒 ] [ 🔒 ] ...
```

- Selected day highlighted in accent color
- Days 8+ are dimmed with a lock icon
- Tapping a locked day dismisses the picker and shows the existing Pro upgrade prompt
- Selecting a free day closes the picker and updates the full dashboard

**Selected date** is local component state (`useState`) on the dashboard — resets to today on every app open. Nothing persisted in Zustand.

---

### Service Layer

All four services updated to return 7-day maps in a single fetch each.

#### `noaaService.ts`
- Replace `date=today` with `begin_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (today + 6 days) on both tide predictions calls (`hilo` and `h` interval)
- `parseTideEvents` and `parseHourlyCurve` split results by date
- Returns `Record<string, TideData>` keyed by `YYYY-MM-DD`

#### `nwsService.ts`
- No API change — hourly forecast already covers ~7 days
- Add `groupByDay(periods)` helper that buckets hourly periods into `Record<string, NwsData>` keyed by `YYYY-MM-DD`

#### `marineService.ts`
- Add `sea_surface_temperature` to the existing Open-Meteo marine fetch (same call, one extra variable)
- Add a second fetch to `api.open-meteo.com` for `surface_pressure` hourly (7-day range, no auth required)
- Returns `Record<string, { swell: SwellData, waterTemp: number, pressure: PressureData }>` keyed by date

#### `solunarService.ts`
- Already accepts a `Date` parameter — no changes needed
- Called per selected day at the hook level

#### `scoringService.ts`
- `buildConditionsData()` gains a `date` parameter
- Receives per-day slices from each service, assembles `ConditionsData` exactly as today

---

### Data Flow

```
useConditions(spot, selectedDate)
  ├── ['noaa', spot.id]    → Record<string, TideData>       staleTime: 30 min
  ├── ['nws', spot.id]     → Record<string, NwsData>        staleTime: 60 min
  ├── ['marine', spot.id]  → Record<string, MarineDay>      staleTime: 60 min
  └── ['solunar', spot.id, selectedDate] → SolunarData      staleTime: 24 hr

hook slices selectedDate's entry from each map
→ buildConditionsData(date, noaaDay, nwsDay, marineDay, solunar)
→ ConditionsData  (same shape as today — dashboard unchanged)
```

The 7-day payload is cached under the spot's query key and shared across all day views. Cache times are unchanged. The dashboard receives the same `ConditionsData` shape regardless of which day is selected.

---

### Data Availability by Day

| Variable | Source | Future days |
|---|---|---|
| Tide curve + events | NOAA predictions (date range) | ✓ real data |
| Wind | NWS hourly | ✓ real data |
| Sky / weather | NWS hourly | ✓ real data |
| Swell | Open-Meteo marine | ✓ real data |
| Water temperature | Open-Meteo marine (`sea_surface_temperature`) | ✓ real data |
| Barometric pressure | Open-Meteo weather (`surface_pressure`) | ✓ real data |
| Solunar periods | suncalc (local) | ✓ real data |

No N/A fallbacks required — all variables have forecast APIs covering 7+ days.

---

### Paywall

- **Days 0–6** (today + 6): always accessible
- **Days 7+**: Pro-locked — lock icon + dimmed in picker; tapping shows existing upgrade prompt
- `isPro` from `useSettingsStore` gates the lock
- When `isPro` is true all days unlock; data range stays 7 days (NWS/Open-Meteo don't go further anyway)
- Forward-compatible: if a longer-range source is added later, unlocking is just removing the gate

---

## Files Changed

| File | Change |
|---|---|
| `features/tide/TideChart.tsx` | Add time label below height in scrub overlay |
| `services/noaaService.ts` | 7-day date range fetch; return `Record<string, TideData>` |
| `services/nwsService.ts` | Add `groupByDay()` helper; return `Record<string, NwsData>` |
| `services/marineService.ts` | Add `sea_surface_temperature` + pressure fetch; return keyed map |
| `services/scoringService.ts` | Accept `date` param; slice per-day data |
| `hooks/useConditions.ts` | Accept `selectedDate`; slice maps; pass to `buildConditionsData` |
| `app/(tabs)/index.tsx` | Add date state; date chip in header; day picker bottom sheet |

---

## Out of Scope

- `useForecast` / `forecastService.ts` (Phase B2 stub) — left untouched; day-switching covers its role on the dashboard
- Species data for non-west-coast regions (Phase C)
- Push notifications (Phase C)
