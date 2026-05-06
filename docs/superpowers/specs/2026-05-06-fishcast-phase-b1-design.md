# FishCast Phase B1 — Live Data Services Design Spec
**Date:** 2026-05-06

---

## 1. Goal

Replace the mock data in `useConditions` and `useForecast` with real API data from NOAA CO-OPS, NWS, Open-Meteo Marine, and local solunar calculations. The Dashboard component does not change — only the hook internals and service implementations are swapped.

---

## 2. Scope

**In scope:**
- `noaaService` — tide predictions, water temp, wind, pressure from NOAA CO-OPS
- `nwsService` — air temp, hourly forecast, cloud cover, rain probability from NWS
- `marineService` — swell height, period, direction from Open-Meteo Marine
- `solunarService` — moon phase, illumination, major/minor periods via `suncalc` (local, no network)
- `noaaStationService` — nearest NOAA station resolution at spot-save time
- `scoringService` — merge all four service outputs into `ConditionsData` + compute score
- `useConditions` hook — rewired to four parallel TanStack Queries
- AsyncStorage cache persistence — cold opens show cached data instantly
- Unit tests for all six services

**Out of scope (separate subsystems):**
- `useForecast` / 7-day forecast service (Phase B2)
- RevenueCat / Pro gating (Phase B3)
- Background fetch + push notifications (Phase B4)

---

## 3. APIs Used

All APIs are free with no authentication key required.

| API | Base URL | Auth |
|---|---|---|
| NOAA CO-OPS Data | `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` | None |
| NOAA CO-OPS Metadata | `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi` | None |
| NWS Weather API | `https://api.weather.gov` | None (User-Agent header required) |
| Open-Meteo Marine | `https://marine-api.open-meteo.com/v1/marine` | None |

NWS requires a `User-Agent` header identifying the app: `User-Agent: FishCast/1.0 (jonathandnguyen21@gmail.com)`.

---

## 4. Architecture

### Data Flow

```
useConditions(spot)
  ├── useQuery(['noaa', spot.id])      → noaaService.fetchNoaaData(spot)
  ├── useQuery(['nws', spot.id])       → nwsService.fetchNwsData(spot)
  ├── useQuery(['marine', spot.id])    → marineService.fetchMarineData(spot)
  └── useQuery(['solunar', spot.id])   → solunarService.calculateSolunar(lat, lng, now)
        ↓ all four resolve (success or null)
  scoringService.buildConditionsData(noaa, nws, marine, solunar) → ConditionsData
```

Four queries run in parallel. Each fails independently. `useConditions` is `isLoading` until all four have settled. The `scoringService.buildConditionsData` function accepts `null` for any input and handles it gracefully.

### Cache TTLs

| Service | `staleTime` | `gcTime` |
|---|---|---|
| NOAA | 30 minutes | 2 hours |
| NWS | 60 minutes | 4 hours |
| Open-Meteo | 60 minutes | 4 hours |
| Solunar | 24 hours | 48 hours |

### Cache Persistence

`react-query-async-storage-persister` + `persistQueryClient` wired in `app/_layout.tsx`. On cold open, TanStack Query hydrates from AsyncStorage and serves cached data immediately while background refetch runs. Max cache age: 24 hours.

---

## 5. File Map

```
services/
  noaaService.ts              modify — implement real NOAA CO-OPS calls
  nwsService.ts               modify — implement real NWS calls
  marineService.ts            modify — implement real Open-Meteo calls
  solunarService.ts           modify — implement using suncalc
  scoringService.ts           modify — implement buildConditionsData merger
  noaaStationService.ts       create — station list fetch + haversine nearest

hooks/
  useConditions.ts            modify — four parallel TanStack Queries

app/
  _layout.tsx                 modify — add AsyncStorage cache persister
  spot/new.tsx                modify — call resolveNearestStation before addSpot

__tests__/
  noaaService.test.ts         create
  nwsService.test.ts          create
  marineService.test.ts       create
  solunarService.test.ts      create
  scoringService.test.ts      create
  noaaStationService.test.ts  create
```

---

## 6. Service Specifications

### 6.1 `noaaStationService`

Called once when a user saves a spot. Fetches the full NOAA station list, filters to stations with tide/water level capability, finds the nearest by haversine distance, and returns the station ID. Stored on `Spot.stationId`.

```typescript
export async function resolveNearestStation(lat: number, lng: number): Promise<string | null>
```

**Station list endpoint:**
```
GET https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels
```

Returns stations with water level capability. For freshwater spots with no nearby NOAA station, returns `null` (tide section hidden, score redistributed).

**Haversine formula** for distance between two lat/lng points in km — standard implementation, no library needed.

---

### 6.2 `noaaService`

Fetches four products in parallel for the resolved station. All four requests use the same base params:
```
station={stationId}&date=today&time_zone=LST/LDT&units=english&format=json
```

| Product | Param | Output field |
|---|---|---|
| Tide hi/lo events | `product=predictions&interval=hilo` | `tide.events` |
| Tide hourly curve | `product=water_level&interval=h` | `tide.hourlyCurve` |
| Water temperature | `product=water_temperature` | `waterTemp` |
| Wind | `product=wind` | `wind` |
| Air pressure | `product=air_pressure` | `pressure` |

Any product returning an error code in the JSON (NOAA returns `{"error": {"message": "..."}}` for unavailable products) sets that field to `null`. The service never throws for missing products — only throws for network failures.

```typescript
export interface NoaaData {
  tide: TideData | null
  wind: WindData | null
  waterTemp: number | null
  pressure: PressureData | null
  airTemp: number | null
}

export async function fetchNoaaData(spot: Spot): Promise<NoaaData>
```

Note: `wind` and `pressure` fields changed to nullable vs the Phase A stub — `scoringService` handles nulls.

---

### 6.3 `nwsService`

Two-step fetch:

**Step 1** — resolve forecast URLs:
```
GET https://api.weather.gov/points/{lat},{lng}
→ response.properties.forecastHourly  (URL for hourly forecast)
```

**Step 2** — fetch hourly forecast and extract current + next 24 hours:
```
GET {forecastHourly}
→ parse: windSpeed, windDirection, shortForecast, probabilityOfPrecipitation, temperature
```

```typescript
export interface NwsData {
  air: AirData
  sky: SkyData
  wind: WindData   // fallback if NOAA wind unavailable
  hourlyForecast: { hour: number; windSpeed: number; cloudCover: number; rainChance: number }[]
}

export async function fetchNwsData(spot: Spot): Promise<NwsData>
```

Sky condition mapped from NWS `shortForecast` string to `SkyData.icon`:
- Contains "Clear" or "Sunny" → `clear`
- Contains "Partly" → `partly-cloudy`
- Contains "Cloudy" or "Overcast" → `overcast`
- Contains "Rain" and probability < 60 → `light-rain`
- Contains "Rain" and probability ≥ 60 → `heavy-rain`

---

### 6.4 `marineService`

```
GET https://marine-api.open-meteo.com/v1/marine
  ?latitude={lat}&longitude={lng}
  &hourly=wave_height,wave_period,wave_direction
  &wind_speed_unit=mph
  &length_unit=imperial
  &timezone=auto
```

Extracts the current hour's values. Returns `null` if wave height is 0 or unavailable (inland spot).

```typescript
export async function fetchMarineData(spot: Spot): Promise<SwellData | null>
```

---

### 6.5 `solunarService`

Pure local calculation using `suncalc` (already installed). No network call.

```typescript
export function calculateSolunar(lat: number, lng: number, date: Date): SolunarData
```

**Major periods** — 1-hour windows centered on moonrise and moonset:
```typescript
const { rise, set } = suncalc.getMoonTimes(date, lat, lng)
// major period 1: rise ± 30min
// major period 2: set ± 30min
```

**Minor periods** — 1-hour windows when moon is directly overhead or underfoot:
```typescript
const { azimuth, altitude } = suncalc.getMoonPosition(date, lat, lng)
// overhead: altitude near peak for the day
// underfoot: altitude near nadir for the day
// approximate by sampling hourly and finding local max/min
```

**`isMajorMoonDay`** — true if moonrise or moonset falls within 1 hour of solar noon (peak solunar day).

**Moon phase** mapped from `suncalc.getMoonIllumination(date).phase` (0–1) to label string:
- 0: New Moon, 0.25: First Quarter, 0.5: Full Moon, 0.75: Last Quarter, interpolated between.

---

### 6.6 `scoringService`

Merges the four service outputs into a single `ConditionsData`. This is the only place that touches the scoring engine.

```typescript
export function buildConditionsData(
  noaa: NoaaData | null,
  nws: NwsData | null,
  marine: SwellData | null,
  solunar: SolunarData,
  spot: Spot,
  now: Date
): ConditionsData
```

**Score inputs assembled from available data:**
- `pressure`: from `noaa.pressure`, falls back to `{ value: 29.92, trend: 'stable', rate: 'normal' }` if null (neutral score)
- `wind`: from `noaa.wind` → fallback `nws.wind` → fallback neutral (8 mph, stable)
- `waterTemp`: from `noaa.waterTemp` → fallback neutral (65°F saltwater, 68°F freshwater)
- `sky`: from `nws.sky` → fallback `partly-cloudy`
- `tide`: from `noaa.tide` → null if unavailable (triggers 20pt redistribution in scoring engine)
- `solunar`: always available (local)

**Hourly scores** — calculated by running `calculateScore` for each hour 5AM–9PM using that hour's forecast wind/sky from NWS hourly data + fixed tide curve + solunar periods.

**Best window** — 3-hour sliding window with highest average hourly score.

---

## 7. `useConditions` Hook

```typescript
export function useConditions(spot: Spot | null): UseConditionsResult {
  const noaaQuery = useQuery({ queryKey: ['noaa', spot?.id], queryFn: () => fetchNoaaData(spot!), enabled: !!spot, staleTime: 30 * 60 * 1000 })
  const nwsQuery  = useQuery({ queryKey: ['nws',  spot?.id], queryFn: () => fetchNwsData(spot!),  enabled: !!spot, staleTime: 60 * 60 * 1000 })
  const marineQuery = useQuery({ queryKey: ['marine', spot?.id], queryFn: () => fetchMarineData(spot!), enabled: !!spot, staleTime: 60 * 60 * 1000 })
  const solunarQuery = useQuery({ queryKey: ['solunar', spot?.id, todayKey], queryFn: () => calculateSolunar(spot!.lat, spot!.lng, new Date()), enabled: !!spot, staleTime: 24 * 60 * 60 * 1000 })

  const isLoading = noaaQuery.isLoading || nwsQuery.isLoading || marineQuery.isLoading || solunarQuery.isLoading
  const isError = noaaQuery.isError && nwsQuery.isError  // total failure only if both primary sources fail

  const data = useMemo(() => {
    if (!spot || !solunarQuery.data) return null
    return buildConditionsData(noaaQuery.data ?? null, nwsQuery.data ?? null, marineQuery.data ?? null, solunarQuery.data, spot, new Date())
  }, [spot, noaaQuery.data, nwsQuery.data, marineQuery.data, solunarQuery.data])

  return { data, isLoading, isError, refetch: () => { noaaQuery.refetch(); nwsQuery.refetch(); marineQuery.refetch() } }
}
```

---

## 8. NOAA Station Resolution at Spot-Save Time

`app/spot/new.tsx` calls `resolveNearestStation(lat, lng)` before saving. The Add Spot screen shows a brief "Finding nearest tide station…" indicator during resolution. If resolution fails or returns `null`, the spot saves with `stationId: null` — tide section will show "Unavailable" on the dashboard.

---

## 9. Loading & Error States

**Loading:** dashboard shows a dimmed overlay (`opacity: 0.4`) with a centered `ActivityIndicator` in `Colors.accent` while `isLoading` is true.

**Offline:** `useNetInfo` from `@react-native-community/netinfo` detects connectivity. When offline, a banner renders at the top of the dashboard: *"Offline — showing data from [formatted cache time]"*. TanStack Query serves AsyncStorage-persisted cache automatically.

**Total failure:** if both NOAA and NWS fail simultaneously, `isError` is true and dashboard shows a full-screen error state with a Retry button.

> **Future:** Replace loading overlay with per-section skeleton shimmers. Each section independently transitions from shimmer → content or shimmer → "Unavailable" chip.

---

## 10. Testing Strategy

All service tests use Jest with manual fetch mocks — no real network calls. Fixture JSON files stored in `__tests__/fixtures/`.

| Test file | Key cases |
|---|---|
| `noaaStationService.test.ts` | Nearest station from fixture list; haversine distance; null when no nearby station |
| `noaaService.test.ts` | Full parse from fixture; null per missing product; throws on network error |
| `nwsService.test.ts` | Two-step fetch resolves; sky condition mapping; 404 on points endpoint |
| `marineService.test.ts` | Current hour extraction; null for zero/inland values |
| `solunarService.test.ts` | Major/minor periods in expected windows for known date+location; phase labels |
| `scoringService.test.ts` | Full merge; tide null triggers redistribution; all-null fallbacks produce valid output |

---

## 11. Dependencies to Install

```bash
npx expo install @react-native-community/netinfo
npm install @tanstack/query-async-storage-persister @tanstack/react-query-persist-client
```

`suncalc` is already installed.
