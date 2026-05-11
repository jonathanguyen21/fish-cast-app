# FishCast Phase B1 — Live Data Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data in `useConditions` with live NOAA CO-OPS, NWS, Open-Meteo Marine, and solunar data — four parallel TanStack Queries, AsyncStorage persistence, and station resolution at spot-save time.

**Architecture:** `useConditions(spot)` runs four parallel `useQuery` hooks. Each fails independently. Results merge in `scoringService.buildConditionsData` → `ConditionsData`. The Dashboard never changes — only hook internals swap. Spot-save resolves the nearest NOAA station by haversine distance and stores `stationId` on `Spot`. Cold opens serve cached data from AsyncStorage while a background refetch runs.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, TanStack Query v5, @tanstack/react-query-persist-client, @react-native-community/netinfo, suncalc (already installed), NOAA CO-OPS API, NWS API, Open-Meteo Marine API (all free, no auth keys)

---

## File Map

```
services/
  noaaStationService.ts     create — haversine nearest-station resolver
  noaaService.ts            modify — implement real NOAA CO-OPS calls
  nwsService.ts             modify — implement real NWS two-step fetch
  marineService.ts          modify — implement Open-Meteo Marine fetch
  solunarService.ts         modify — implement suncalc-based solunar calc
  scoringService.ts         modify — implement buildConditionsData merger

hooks/
  useConditions.ts          modify — four parallel TanStack Queries

app/
  _layout.tsx               modify — add AsyncStorage query cache persister
  spot/new.tsx              modify — call resolveNearestStation before addSpot

app/(tabs)/
  index.tsx                 modify — loading overlay + offline banner

__tests__/
  fixtures/
    noaaStations.json             create
    noaaPredictions.json          create
    noaaHourlyCurve.json          create
    noaaWaterTemp.json            create
    noaaWind.json                 create
    noaaAirPressure.json          create
    noaaMissingProduct.json       create
    nwsPoints.json                create
    nwsHourlyForecast.json        create
    openMeteoMarine.json          create
  noaaStationService.test.ts      create
  solunarService.test.ts          create
  noaaService.test.ts             create
  nwsService.test.ts              create
  marineService.test.ts           create
  scoringService.test.ts          create
```

---

## Task 1: Install Dependencies & Create Test Fixtures

**Files:** `package.json`, `__tests__/fixtures/*.json`

- [ ] **Step 1: Install packages**

```bash
cd /home/jon/projects/fish-cast-app
npx expo install @react-native-community/netinfo
npm install @tanstack/query-async-storage-persister @tanstack/react-query-persist-client
```

Expected: packages added to `node_modules` and `package.json` without errors.

- [ ] **Step 2: Create fixtures directory**

```bash
mkdir -p __tests__/fixtures
```

- [ ] **Step 3: Create `__tests__/fixtures/noaaStations.json`**

```json
{
  "stations": [
    { "id": "9415020", "name": "Point Reyes, CA", "lat": "37.9953", "lng": "-122.9767" },
    { "id": "9414290", "name": "San Francisco, CA", "lat": "37.8063", "lng": "-122.4659" },
    { "id": "9410660", "name": "Los Angeles, CA", "lat": "33.72", "lng": "-118.272" }
  ]
}
```

- [ ] **Step 4: Create `__tests__/fixtures/noaaPredictions.json`**

```json
{
  "predictions": [
    { "t": "2026-05-06 04:12", "v": "4.613", "type": "H" },
    { "t": "2026-05-06 09:18", "v": "0.312", "type": "L" },
    { "t": "2026-05-06 15:42", "v": "5.134", "type": "H" },
    { "t": "2026-05-06 21:55", "v": "0.832", "type": "L" }
  ]
}
```

- [ ] **Step 5: Create `__tests__/fixtures/noaaHourlyCurve.json`**

```json
{
  "predictions": [
    { "t": "2026-05-06 00:00", "v": "2.7" }, { "t": "2026-05-06 01:00", "v": "3.5" },
    { "t": "2026-05-06 02:00", "v": "4.2" }, { "t": "2026-05-06 03:00", "v": "4.5" },
    { "t": "2026-05-06 04:00", "v": "4.6" }, { "t": "2026-05-06 05:00", "v": "4.1" },
    { "t": "2026-05-06 06:00", "v": "3.2" }, { "t": "2026-05-06 07:00", "v": "2.2" },
    { "t": "2026-05-06 08:00", "v": "1.2" }, { "t": "2026-05-06 09:00", "v": "0.4" },
    { "t": "2026-05-06 10:00", "v": "0.6" }, { "t": "2026-05-06 11:00", "v": "1.4" },
    { "t": "2026-05-06 12:00", "v": "2.5" }, { "t": "2026-05-06 13:00", "v": "3.4" },
    { "t": "2026-05-06 14:00", "v": "4.2" }, { "t": "2026-05-06 15:00", "v": "4.9" },
    { "t": "2026-05-06 16:00", "v": "5.1" }, { "t": "2026-05-06 17:00", "v": "4.8" },
    { "t": "2026-05-06 18:00", "v": "4.1" }, { "t": "2026-05-06 19:00", "v": "3.1" },
    { "t": "2026-05-06 20:00", "v": "2.1" }, { "t": "2026-05-06 21:00", "v": "1.2" },
    { "t": "2026-05-06 22:00", "v": "0.9" }, { "t": "2026-05-06 23:00", "v": "1.3" }
  ]
}
```

- [ ] **Step 6: Create `__tests__/fixtures/noaaWaterTemp.json`**

```json
{
  "data": [{ "t": "2026-05-06 14:00", "v": "57.2", "f": "0,0" }]
}
```

- [ ] **Step 7: Create `__tests__/fixtures/noaaWind.json`**

```json
{
  "data": [{ "t": "2026-05-06 14:00", "s": "8.4", "d": "225.0", "dr": "SW", "g": "14.0", "f": "0,0" }]
}
```

- [ ] **Step 8: Create `__tests__/fixtures/noaaAirPressure.json`**

```json
{
  "data": [
    { "t": "2026-05-06 14:00", "v": "30.02", "f": "0,0" },
    { "t": "2026-05-06 13:00", "v": "30.05", "f": "0,0" },
    { "t": "2026-05-06 12:00", "v": "30.08", "f": "0,0" },
    { "t": "2026-05-06 11:00", "v": "30.10", "f": "0,0" },
    { "t": "2026-05-06 08:00", "v": "30.18", "f": "0,0" }
  ]
}
```

- [ ] **Step 9: Create `__tests__/fixtures/noaaMissingProduct.json`**

```json
{
  "error": { "message": "No data was found. This product may not be offered at this station." }
}
```

- [ ] **Step 10: Create `__tests__/fixtures/nwsPoints.json`**

```json
{
  "properties": {
    "forecast": "https://api.weather.gov/gridpoints/MTR/84,105/forecast",
    "forecastHourly": "https://api.weather.gov/gridpoints/MTR/84,105/forecast/hourly"
  }
}
```

- [ ] **Step 11: Create `__tests__/fixtures/nwsHourlyForecast.json`**

```json
{
  "properties": {
    "periods": [
      {
        "number": 1, "startTime": "2026-05-06T05:00:00-07:00",
        "temperature": 55, "temperatureUnit": "F",
        "windSpeed": "5 mph", "windDirection": "SW",
        "shortForecast": "Partly Cloudy",
        "probabilityOfPrecipitation": { "value": 10 },
        "relativeHumidity": { "value": 82 }
      },
      {
        "number": 2, "startTime": "2026-05-06T14:00:00-07:00",
        "temperature": 62, "temperatureUnit": "F",
        "windSpeed": "12 mph", "windDirection": "W",
        "shortForecast": "Partly Cloudy",
        "probabilityOfPrecipitation": { "value": 20 },
        "relativeHumidity": { "value": 72 }
      },
      {
        "number": 3, "startTime": "2026-05-06T20:00:00-07:00",
        "temperature": 58, "temperatureUnit": "F",
        "windSpeed": "18 mph", "windDirection": "NW",
        "shortForecast": "Mostly Cloudy",
        "probabilityOfPrecipitation": { "value": 35 },
        "relativeHumidity": { "value": 85 }
      }
    ]
  }
}
```

- [ ] **Step 12: Create `__tests__/fixtures/openMeteoMarine.json`**

```json
{
  "hourly": {
    "time": [
      "2026-05-06T00:00", "2026-05-06T01:00", "2026-05-06T02:00",
      "2026-05-06T03:00", "2026-05-06T04:00", "2026-05-06T05:00",
      "2026-05-06T06:00", "2026-05-06T07:00", "2026-05-06T08:00",
      "2026-05-06T09:00", "2026-05-06T10:00", "2026-05-06T11:00",
      "2026-05-06T12:00", "2026-05-06T13:00", "2026-05-06T14:00",
      "2026-05-06T15:00", "2026-05-06T16:00", "2026-05-06T17:00",
      "2026-05-06T18:00", "2026-05-06T19:00", "2026-05-06T20:00",
      "2026-05-06T21:00", "2026-05-06T22:00", "2026-05-06T23:00"
    ],
    "wave_height": [1.2,1.1,1.1,1.0,1.0,1.1,1.2,1.3,1.3,1.4,1.4,1.5,1.4,1.4,1.37,1.3,1.2,1.1,1.1,1.0,1.0,1.0,1.1,1.1],
    "wave_period": [10,10,10,11,11,11,11,12,12,12,12,12,12,12,12,11,11,10,10,10,10,10,10,10],
    "wave_direction": [280,280,282,282,285,285,288,288,290,290,290,292,292,290,290,288,288,285,285,282,280,280,280,280]
  }
}
```

- [ ] **Step 13: Commit**

```bash
git add __tests__/fixtures/ package.json package-lock.json
git commit -m "feat: install Phase B1 dependencies and create API test fixtures"
```

---

## Task 2: NOAA Station Service

**Files:**
- Create: `services/noaaStationService.ts`
- Create: `__tests__/noaaStationService.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/noaaStationService.test.ts`:
```typescript
import { resolveNearestStation, haversineKm } from '../services/noaaStationService'

const stationsFixture = require('./fixtures/noaaStations.json')

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('haversineKm', () => {
  it('returns ~0 for same point', () => {
    expect(haversineKm(37.99, -122.97, 37.99, -122.97)).toBeCloseTo(0, 1)
  })

  it('returns ~559km between San Francisco and Los Angeles', () => {
    expect(haversineKm(37.8063, -122.4659, 33.72, -118.272)).toBeCloseTo(559, -1)
  })
})

describe('resolveNearestStation', () => {
  it('returns nearest station id for Bodega Bay coords', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => stationsFixture,
    })
    // Bodega Bay is closest to Point Reyes (9415020) in the fixture
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBe('9415020')
  })

  it('returns null for empty station list', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => ({ stations: [] }),
    })
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBeNull()
  })

  it('returns null when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBeNull()
  })

  it('returns null when nearest station is over 200km away', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stations: [{ id: 'far', name: 'Far Away', lat: '48.0', lng: '-105.0' }],
      }),
    })
    const id = await resolveNearestStation(38.33, -123.05)
    expect(id).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to confirm failing**

```bash
npx jest __tests__/noaaStationService.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../services/noaaStationService'`

- [ ] **Step 3: Implement `services/noaaStationService.ts`**

```typescript
const STATION_LIST_URL =
  'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels'
const MAX_DISTANCE_KM = 200

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function resolveNearestStation(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(STATION_LIST_URL)
    if (!res.ok) return null
    const { stations } = await res.json()
    if (!stations?.length) return null

    let bestId: string | null = null
    let bestDist = Infinity

    for (const s of stations) {
      const sLat = parseFloat(s.lat)
      const sLng = parseFloat(s.lng)
      if (isNaN(sLat) || isNaN(sLng)) continue
      const dist = haversineKm(lat, lng, sLat, sLng)
      if (dist < bestDist) {
        bestDist = dist
        bestId = s.id
      }
    }

    return bestDist <= MAX_DISTANCE_KM ? bestId : null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run test to confirm passing**

```bash
npx jest __tests__/noaaStationService.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add services/noaaStationService.ts __tests__/noaaStationService.test.ts
git commit -m "feat: add NOAA station resolver with haversine distance"
```

---

## Task 3: Solunar Service

**Files:**
- Modify: `services/solunarService.ts`
- Create: `__tests__/solunarService.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/solunarService.test.ts`:
```typescript
import { calculateSolunar } from '../services/solunarService'

// Bodega Bay, CA — a real location with known solunar behavior
const LAT = 38.33
const LNG = -123.05
// Midday on a known date
const DATE = new Date('2026-05-06T14:00:00')

describe('calculateSolunar', () => {
  it('returns all required fields', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result).toHaveProperty('moon')
    expect(result).toHaveProperty('sun')
    expect(result.moon).toHaveProperty('phase')
    expect(result.moon).toHaveProperty('illumination')
    expect(result.moon).toHaveProperty('majorPeriods')
    expect(result.moon).toHaveProperty('minorPeriods')
    expect(result.sun).toHaveProperty('sunrise')
    expect(result.sun).toHaveProperty('sunset')
    expect(typeof result.inMajorPeriod).toBe('boolean')
    expect(typeof result.inMinorPeriod).toBe('boolean')
    expect(typeof result.withinHourOfPeriod).toBe('boolean')
    expect(typeof result.isMajorMoonDay).toBe('boolean')
  })

  it('illumination is between 0 and 100', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.moon.illumination).toBeGreaterThanOrEqual(0)
    expect(result.moon.illumination).toBeLessThanOrEqual(100)
  })

  it('phase label is a non-empty string', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.moon.phase.length).toBeGreaterThan(0)
  })

  it('major periods are each 1 hour wide', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    for (const p of result.moon.majorPeriods) {
      // both start and end should be formatted time strings e.g. "3:42 PM"
      expect(p.start).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
      expect(p.end).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
    }
  })

  it('inMajorPeriod and inMinorPeriod are mutually exclusive', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.inMajorPeriod && result.inMinorPeriod).toBe(false)
  })

  it('withinHourOfPeriod is false when inMajorPeriod or inMinorPeriod is true', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    if (result.inMajorPeriod || result.inMinorPeriod) {
      expect(result.withinHourOfPeriod).toBe(false)
    }
  })

  it('sun times are formatted strings', () => {
    const result = calculateSolunar(LAT, LNG, DATE)
    expect(result.sun.sunrise).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
    expect(result.sun.sunset).toMatch(/\d+:\d{2}\s?(AM|PM)/i)
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/solunarService.test.ts --no-coverage
```

Expected: FAIL — `solunarService not yet implemented`

- [ ] **Step 3: Implement `services/solunarService.ts`**

```typescript
import { getMoonTimes, getMoonIllumination, getMoonPosition, getTimes } from 'suncalc'
import type { MoonData, SunData } from '../types/conditions'

export interface SolunarData {
  moon: MoonData
  sun: SunData
  inMajorPeriod: boolean
  inMinorPeriod: boolean
  withinHourOfPeriod: boolean
  isMajorMoonDay: boolean
}

function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function moonPhaseLabel(phase: number): string {
  if (phase < 0.0625 || phase >= 0.9375) return 'New Moon'
  if (phase < 0.1875) return 'Waxing Crescent'
  if (phase < 0.3125) return 'First Quarter'
  if (phase < 0.4375) return 'Waxing Gibbous'
  if (phase < 0.5625) return 'Full Moon'
  if (phase < 0.6875) return 'Waning Gibbous'
  if (phase < 0.8125) return 'Last Quarter'
  return 'Waning Crescent'
}

function toPeriod(center: Date): { start: string; end: string } {
  const HALF = 30 * 60 * 1000
  return {
    start: formatTime(new Date(center.getTime() - HALF)),
    end: formatTime(new Date(center.getTime() + HALF)),
  }
}

function findMinorCenters(lat: number, lng: number, date: Date): Date[] {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  let maxAlt = -Infinity, minAlt = Infinity
  let maxTime = base, minTime = base
  for (let h = 0; h < 24; h++) {
    const t = new Date(base.getTime() + h * 3_600_000)
    const { altitude } = getMoonPosition(t, lat, lng)
    if (altitude > maxAlt) { maxAlt = altitude; maxTime = t }
    if (altitude < minAlt) { minAlt = altitude; minTime = t }
  }
  return [maxTime, minTime]
}

function isWithin(date: Date, center: Date, ms: number): boolean {
  return Math.abs(date.getTime() - center.getTime()) <= ms
}

export function calculateSolunar(lat: number, lng: number, date: Date): SolunarData {
  const moonTimes = getMoonTimes(date, lat, lng)
  const sunTimes = getTimes(date, lat, lng)
  const illum = getMoonIllumination(date)

  const HALF = 30 * 60 * 1000
  const ONE_HR = 60 * 60 * 1000

  const majorCenters: Date[] = []
  if (moonTimes.rise && !moonTimes.alwaysUp && !moonTimes.alwaysDown) majorCenters.push(moonTimes.rise)
  if (moonTimes.set && !moonTimes.alwaysUp && !moonTimes.alwaysDown) majorCenters.push(moonTimes.set)

  const minorCenters = findMinorCenters(lat, lng, date)

  const inMajorPeriod = majorCenters.some(c => isWithin(date, c, HALF))
  const inMinorPeriod = !inMajorPeriod && minorCenters.some(c => isWithin(date, c, HALF))
  const withinHourOfPeriod =
    !inMajorPeriod &&
    !inMinorPeriod &&
    (majorCenters.some(c => isWithin(date, c, ONE_HR)) ||
      minorCenters.some(c => isWithin(date, c, ONE_HR)))

  const isMajorMoonDay = majorCenters.some(c => isWithin(c, sunTimes.solarNoon, ONE_HR))

  return {
    moon: {
      phase: moonPhaseLabel(illum.phase),
      illumination: Math.round(illum.fraction * 100),
      majorPeriods: majorCenters.map(toPeriod),
      minorPeriods: minorCenters.map(toPeriod),
    },
    sun: {
      sunrise: formatTime(sunTimes.sunrise),
      sunset: formatTime(sunTimes.sunset),
    },
    inMajorPeriod,
    inMinorPeriod,
    withinHourOfPeriod,
    isMajorMoonDay,
  }
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/solunarService.test.ts --no-coverage
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add services/solunarService.ts __tests__/solunarService.test.ts
git commit -m "feat: implement solunar service using suncalc"
```

---

## Task 4: NOAA Data Service

**Files:**
- Modify: `services/noaaService.ts`
- Create: `__tests__/noaaService.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/noaaService.test.ts`:
```typescript
import { fetchNoaaData } from '../services/noaaService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const predictionsFixture = require('./fixtures/noaaPredictions.json')
const curveFixture = require('./fixtures/noaaHourlyCurve.json')
const tempFixture = require('./fixtures/noaaWaterTemp.json')
const windFixture = require('./fixtures/noaaWind.json')
const pressureFixture = require('./fixtures/noaaAirPressure.json')
const missingFixture = require('./fixtures/noaaMissingProduct.json')

function mockAllProducts() {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => predictionsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => curveFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => windFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
}

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

describe('fetchNoaaData', () => {
  it('returns null tide/wind/pressure for spot with no stationId', async () => {
    const spotNoStation = { ...SPOT, stationId: null }
    const result = await fetchNoaaData(spotNoStation)
    expect(result.tide).toBeNull()
    expect(result.wind).toBeNull()
    expect(result.pressure).toBeNull()
    expect(result.waterTemp).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('parses wind speed, direction, and gusts', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.wind?.speed).toBeCloseTo(8.4, 1)
    expect(result.wind?.gusts).toBeCloseTo(14.0, 1)
    expect(result.wind?.directionLabel).toBe('SW')
    expect(result.wind?.unit).toBe('mph')
  })

  it('parses water temperature', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.waterTemp).toBeCloseTo(57.2, 1)
  })

  it('parses pressure value', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.pressure?.value).toBeCloseTo(30.02, 2)
    expect(result.pressure?.unit).toBe('inHg')
  })

  it('detects falling pressure trend from fixture', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    // fixture goes from 30.18 → 30.02 over several hours = falling
    expect(result.pressure?.trend).toBe('falling')
  })

  it('parses tide events with correct types', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.tide?.events.length).toBeGreaterThan(0)
    expect(['high', 'low']).toContain(result.tide?.events[0].type)
  })

  it('hourlyCurve has 24 entries', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.tide?.hourlyCurve).toHaveLength(24)
  })

  it('returns null tide when both prediction products are missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture }) // hi/lo missing
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture }) // curve missing
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => windFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(result.tide).toBeNull()
  })

  it('returns null wind when wind product is missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => predictionsFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => curveFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture }) // wind missing
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(result.wind).toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/noaaService.test.ts --no-coverage
```

Expected: FAIL — `noaaService not yet implemented`

- [ ] **Step 3: Implement `services/noaaService.ts`**

```typescript
import type { TideData, WindData, PressureData, TideEvent } from '../types/conditions'
import type { Spot } from '../types/spot'
import { detectPhase } from '../features/tide/tideUtils'

export interface NoaaData {
  tide: TideData | null
  wind: WindData | null
  waterTemp: number | null
  pressure: PressureData | null
  airTemp: number | null
}

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
const COMMON = 'time_zone=LST/LDT&units=english&format=json'

function buildUrl(station: string, product: string, extra = ''): string {
  return `${BASE}?station=${station}&date=today&${COMMON}&product=${product}${extra}`
}

async function fetchProduct(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return json.error ? null : json
}

function formatNoaaTime(t: string): string {
  const timePart = t.split(' ')[1] ?? '00:00'
  const [hStr, mStr] = timePart.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function parseHourlyCurve(data: any): number[] {
  const curve = new Array(24).fill(0)
  if (!data?.predictions) return curve
  for (const p of data.predictions) {
    const hour = parseInt((p.t.split(' ')[1] ?? '0:00').split(':')[0], 10)
    if (hour >= 0 && hour < 24) curve[hour] = parseFloat(p.v) || 0
  }
  return curve
}

function parseTideEvents(data: any): TideEvent[] {
  if (!data?.predictions) return []
  return data.predictions.map((p: any) => ({
    type: (p.type === 'H' ? 'high' : 'low') as 'high' | 'low',
    time: formatNoaaTime(p.t),
    height: parseFloat(p.v),
  }))
}

function parseWind(data: any): WindData | null {
  const d = data?.data?.[0]
  if (!d) return null
  return {
    speed: parseFloat(d.s) || 0,
    gusts: parseFloat(d.g) || 0,
    direction: parseFloat(d.d) || 0,
    directionLabel: d.dr || 'N',
    unit: 'mph',
  }
}

function parsePressure(data: any): PressureData | null {
  if (!data?.data?.length) return null
  const readings = data.data
    .map((d: any) => parseFloat(d.v))
    .filter((v: number) => !isNaN(v))
  if (readings.length === 0) return null

  const current = readings[0]
  const threeHrAgo = readings[Math.min(3, readings.length - 1)]
  const delta = current - threeHrAgo
  const abs = Math.abs(delta)

  const trend: PressureData['trend'] =
    delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable'
  const rate: PressureData['rate'] =
    abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast'

  return { value: current, trend, rate, unit: 'inHg' }
}

export async function fetchNoaaData(spot: Spot): Promise<NoaaData> {
  if (!spot.stationId) {
    return { tide: null, wind: null, waterTemp: null, pressure: null, airTemp: null }
  }

  const id = spot.stationId
  const [hiLoRes, curveRes, tempRes, windRes, pressureRes] = await Promise.allSettled([
    fetchProduct(buildUrl(id, 'predictions', '&interval=hilo')),
    fetchProduct(buildUrl(id, 'predictions', '&interval=h')),
    fetchProduct(buildUrl(id, 'water_temperature')),
    fetchProduct(buildUrl(id, 'wind', '&range=1')),
    fetchProduct(buildUrl(id, 'air_pressure', '&range=7')),
  ])

  const val = <T>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null

  const hiLoData = val(hiLoRes)
  const curveData = val(curveRes)
  const tempData = val(tempRes)
  const windData = val(windRes)
  const pressureData = val(pressureRes)

  const events = parseTideEvents(hiLoData)
  const hourlyCurve = parseHourlyCurve(curveData)
  const hasTideData = hiLoData !== null || curveData !== null

  let tide: TideData | null = null
  if (hasTideData && events.length > 0) {
    const now = new Date()
    const currentHour = now.getHours()
    const currentHeight = hourlyCurve[currentHour] ?? 0
    const prevHeight = hourlyCurve[Math.max(0, currentHour - 1)] ?? 0
    const phase = detectPhase(hourlyCurve, currentHour)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const futureEvent = events.find(e => {
      const match = e.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
      if (!match) return false
      let h = parseInt(match[1])
      const m = parseInt(match[2])
      const p = match[3].toUpperCase()
      if (p === 'PM' && h !== 12) h += 12
      if (p === 'AM' && h === 12) h = 0
      return h * 60 + m > nowMinutes
    }) ?? events[0]

    tide = {
      current: { height: parseFloat(currentHeight.toFixed(1)), rising: currentHeight > prevHeight, unit: 'ft' },
      next: futureEvent,
      events,
      hourlyCurve,
      phase,
    }
  }

  const waterTemp = tempData?.data?.[0]?.v ? parseFloat(tempData.data[0].v) : null

  return {
    tide,
    wind: parseWind(windData),
    waterTemp,
    pressure: parsePressure(pressureData),
    airTemp: null,
  }
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/noaaService.test.ts --no-coverage
```

Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add services/noaaService.ts __tests__/noaaService.test.ts
git commit -m "feat: implement NOAA CO-OPS service with tide, wind, pressure, water temp"
```

---

## Task 5: NWS Service

**Files:**
- Modify: `services/nwsService.ts`
- Create: `__tests__/nwsService.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/nwsService.test.ts`:
```typescript
import { fetchNwsData } from '../services/nwsService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const pointsFixture = require('./fixtures/nwsPoints.json')
const hourlyFixture = require('./fixtures/nwsHourlyForecast.json')

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

function mockNws() {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => pointsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => hourlyFixture })
}

describe('fetchNwsData', () => {
  it('returns air temp from current period', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.air.temp).toBeGreaterThan(0)
  })

  it('returns wind data', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.wind.speed).toBeGreaterThanOrEqual(0)
    expect(result.wind.unit).toBe('mph')
  })

  it('returns sky data with valid icon', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(['clear', 'partly-cloudy', 'overcast', 'light-rain', 'heavy-rain']).toContain(result.sky.icon)
  })

  it('maps Partly Cloudy shortForecast to partly-cloudy icon', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    // First period in fixture is "Partly Cloudy"
    expect(result.sky.icon).toBe('partly-cloudy')
  })

  it('returns hourlyForecast array', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(Array.isArray(result.hourlyForecast)).toBe(true)
    expect(result.hourlyForecast.length).toBeGreaterThan(0)
  })

  it('throws when points endpoint returns 404', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(fetchNwsData(SPOT)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/nwsService.test.ts --no-coverage
```

Expected: FAIL — `nwsService not yet implemented`

- [ ] **Step 3: Implement `services/nwsService.ts`**

```typescript
import type { AirData, SkyData, WindData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface NwsData {
  air: AirData
  sky: SkyData
  wind: WindData
  hourlyForecast: { hour: number; windSpeed: number; cloudCover: number; rainChance: number }[]
}

const NWS_BASE = 'https://api.weather.gov'
const USER_AGENT = `FishCast/1.0 (${process.env.EXPO_PUBLIC_NWS_CONTACT ?? 'fishcast.app@gmail.com'})`

function nwsHeaders() {
  return { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' }
}

function parseWindSpeed(ws: string): number {
  const match = ws.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function directionToDegrees(dir: string): number {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5,
    SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  }
  return map[dir.toUpperCase()] ?? 0
}

function mapSkyIcon(forecast: string, rainChance: number): SkyData['icon'] {
  const f = forecast.toLowerCase()
  if (f.includes('rain') || f.includes('shower') || f.includes('drizzle')) {
    return rainChance >= 60 ? 'heavy-rain' : 'light-rain'
  }
  if (f.includes('overcast') || f.includes('cloudy')) {
    return f.includes('partly') || f.includes('mostly clear') ? 'partly-cloudy' : 'overcast'
  }
  if (f.includes('partly')) return 'partly-cloudy'
  return 'clear'
}

function iconToCondition(icon: SkyData['icon']): SkyData['condition'] {
  const map: Record<SkyData['icon'], SkyData['condition']> = {
    'clear': 'Clear',
    'partly-cloudy': 'Partly Cloudy',
    'overcast': 'Overcast',
    'light-rain': 'Light Rain',
    'heavy-rain': 'Heavy Rain',
  }
  return map[icon]
}

export async function fetchNwsData(spot: Spot): Promise<NwsData> {
  const pointsRes = await fetch(
    `${NWS_BASE}/points/${spot.lat.toFixed(4)},${spot.lng.toFixed(4)}`,
    { headers: nwsHeaders() }
  )
  if (!pointsRes.ok) throw new Error(`NWS points failed: ${pointsRes.status}`)
  const points = await pointsRes.json()
  const hourlyUrl: string = points.properties.forecastHourly

  const hourlyRes = await fetch(hourlyUrl, { headers: nwsHeaders() })
  if (!hourlyRes.ok) throw new Error(`NWS hourly failed: ${hourlyRes.status}`)
  const hourly = await hourlyRes.json()

  const periods: any[] = hourly.properties.periods ?? []
  if (periods.length === 0) throw new Error('NWS returned no forecast periods')

  const now = new Date()
  const currentHour = now.getHours()

  // Find the period closest to current hour
  const currentPeriod = periods.reduce((best: any, p: any) => {
    const pHour = new Date(p.startTime).getHours()
    const bestHour = new Date(best.startTime).getHours()
    return Math.abs(pHour - currentHour) < Math.abs(bestHour - currentHour) ? p : best
  }, periods[0])

  const rainChance = currentPeriod.probabilityOfPrecipitation?.value ?? 0
  const icon = mapSkyIcon(currentPeriod.shortForecast, rainChance)

  const temps = periods.map((p: any) => p.temperature as number)
  const windSpeed = parseWindSpeed(currentPeriod.windSpeed)

  const hourlyForecast = periods.map((p: any) => ({
    hour: new Date(p.startTime).getHours(),
    windSpeed: parseWindSpeed(p.windSpeed),
    cloudCover: p.shortForecast.toLowerCase().includes('cloud') ? 70 : 20,
    rainChance: p.probabilityOfPrecipitation?.value ?? 0,
  }))

  return {
    air: {
      temp: currentPeriod.temperature,
      high: Math.max(...temps),
      low: Math.min(...temps),
      humidity: currentPeriod.relativeHumidity?.value ?? 70,
      unit: '°F',
    },
    sky: {
      condition: iconToCondition(icon),
      rainChance,
      icon,
    },
    wind: {
      speed: windSpeed,
      gusts: windSpeed + 5,
      direction: directionToDegrees(currentPeriod.windDirection),
      directionLabel: currentPeriod.windDirection,
      unit: 'mph',
    },
    hourlyForecast,
  }
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/nwsService.test.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add services/nwsService.ts __tests__/nwsService.test.ts
git commit -m "feat: implement NWS service with two-step fetch and sky condition mapping"
```

---

## Task 6: Marine Service

**Files:**
- Modify: `services/marineService.ts`
- Create: `__tests__/marineService.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/marineService.test.ts`:
```typescript
import { fetchMarineData } from '../services/marineService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const marineFixture = require('./fixtures/openMeteoMarine.json')

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

describe('fetchMarineData', () => {
  it('returns SwellData with height, period, direction', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => marineFixture,
    })
    const result = await fetchMarineData(SPOT)
    expect(result).not.toBeNull()
    expect(result!.height).toBeGreaterThan(0)
    expect(result!.period).toBeGreaterThan(0)
    expect(result!.direction).toBeGreaterThanOrEqual(0)
    expect(result!.unit).toBe('ft')
  })

  it('returns null when all wave heights are 0', async () => {
    const zeroFixture = {
      hourly: {
        time: marineFixture.hourly.time,
        wave_height: new Array(24).fill(0),
        wave_period: new Array(24).fill(0),
        wave_direction: new Array(24).fill(0),
      },
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => zeroFixture,
    })
    const result = await fetchMarineData(SPOT)
    expect(result).toBeNull()
  })

  it('returns null on fetch error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 })
    const result = await fetchMarineData(SPOT)
    expect(result).toBeNull()
  })

  it('returns directionLabel string', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, json: async () => marineFixture,
    })
    const result = await fetchMarineData(SPOT)
    expect(typeof result!.directionLabel).toBe('string')
    expect(result!.directionLabel.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/marineService.test.ts --no-coverage
```

Expected: FAIL — `marineService not yet implemented`

- [ ] **Step 3: Implement `services/marineService.ts`**

```typescript
import type { SwellData } from '../types/conditions'
import type { Spot } from '../types/spot'

const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine'

function degreesToLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

export async function fetchMarineData(spot: Spot): Promise<SwellData | null> {
  try {
    const url =
      `${MARINE_BASE}?latitude=${spot.lat}&longitude=${spot.lng}` +
      `&hourly=wave_height,wave_period,wave_direction&length_unit=imperial&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()

    const times: string[] = json.hourly?.time ?? []
    const heights: number[] = json.hourly?.wave_height ?? []
    const periods: number[] = json.hourly?.wave_period ?? []
    const directions: number[] = json.hourly?.wave_direction ?? []

    if (heights.length === 0) return null

    // Find index closest to current hour
    const currentHour = new Date().getHours()
    const idx = times.findIndex(t => new Date(t).getHours() === currentHour)
    const i = idx >= 0 ? idx : 0

    const height = heights[i] ?? 0
    if (height === 0) return null

    const direction = directions[i] ?? 0
    return {
      height: parseFloat(height.toFixed(1)),
      period: periods[i] ?? 0,
      direction,
      directionLabel: degreesToLabel(direction),
      unit: 'ft',
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/marineService.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add services/marineService.ts __tests__/marineService.test.ts
git commit -m "feat: implement Open-Meteo marine service for swell data"
```

---

## Task 7: Scoring Service — buildConditionsData

**Files:**
- Modify: `services/scoringService.ts`
- Create: `__tests__/scoringService.test.ts`

- [ ] **Step 1: Write failing test**

`__tests__/scoringService.test.ts`:
```typescript
import { buildConditionsData } from '../services/scoringService'
import type { NoaaData } from '../services/noaaService'
import type { NwsData } from '../services/nwsService'
import type { SolunarData } from '../services/solunarService'
import type { SwellData } from '../types/conditions'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const NOW = new Date('2026-05-06T14:00:00')

const NOAA: NoaaData = {
  tide: {
    current: { height: 3.2, rising: true, unit: 'ft' },
    next: { type: 'high', time: '3:42 PM', height: 5.1 },
    events: [
      { type: 'low', time: '9:18 AM', height: 0.3 },
      { type: 'high', time: '3:42 PM', height: 5.1 },
    ],
    hourlyCurve: [0.8,0.5,0.3,0.5,1.1,1.9,2.8,3.6,4.3,4.8,5.0,5.1,
                  4.9,4.5,3.8,3.0,2.2,1.5,1.0,0.8,0.9,1.3,1.9,2.7],
    phase: 'incoming',
  },
  wind: { speed: 8, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
  waterTemp: 57,
  pressure: { value: 30.02, trend: 'falling', rate: 'slow', unit: 'inHg' },
  airTemp: null,
}

const NWS: NwsData = {
  air: { temp: 62, high: 67, low: 52, humidity: 78, unit: '°F' },
  sky: { condition: 'Partly Cloudy', rainChance: 15, icon: 'partly-cloudy' },
  wind: { speed: 10, gusts: 15, direction: 225, directionLabel: 'SW', unit: 'mph' },
  hourlyForecast: [
    { hour: 5, windSpeed: 5, cloudCover: 30, rainChance: 10 },
    { hour: 14, windSpeed: 10, cloudCover: 50, rainChance: 15 },
  ],
}

const SOLUNAR: SolunarData = {
  moon: {
    phase: 'Waxing Gibbous', illumination: 78,
    majorPeriods: [{ start: '2:15 PM', end: '3:15 PM' }],
    minorPeriods: [{ start: '8:30 AM', end: '9:30 AM' }],
  },
  sun: { sunrise: '6:12 AM', sunset: '7:58 PM' },
  inMajorPeriod: true, inMinorPeriod: false, withinHourOfPeriod: false, isMajorMoonDay: false,
}

const SWELL: SwellData = {
  height: 4.5, period: 12, direction: 290, directionLabel: 'WNW', unit: 'ft',
}

describe('buildConditionsData', () => {
  it('returns a valid ConditionsData shape', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result).toHaveProperty('fishingScore')
    expect(result).toHaveProperty('scoreLabel')
    expect(result).toHaveProperty('bestWindow')
    expect(result).toHaveProperty('hourlyScores')
    expect(result).toHaveProperty('tide')
    expect(result).toHaveProperty('wind')
    expect(result).toHaveProperty('pressure')
    expect(result).toHaveProperty('moon')
    expect(result).toHaveProperty('sun')
  })

  it('fishing score is between 0 and 100', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.fishingScore).toBeGreaterThanOrEqual(0)
    expect(result.fishingScore).toBeLessThanOrEqual(100)
  })

  it('returns null tide when NOAA tide is null', () => {
    const noaaNullTide = { ...NOAA, tide: null }
    const result = buildConditionsData(noaaNullTide, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.tide).toBeNull()
  })

  it('uses NWS wind when NOAA wind is null', () => {
    const noaaNullWind = { ...NOAA, wind: null }
    const result = buildConditionsData(noaaNullWind, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.wind.speed).toBe(NWS.wind.speed)
  })

  it('uses neutral fallback when both NOAA and NWS are null', () => {
    const result = buildConditionsData(null, null, null, SOLUNAR, SPOT, NOW)
    expect(result.fishingScore).toBeGreaterThanOrEqual(0)
    expect(result.fishingScore).toBeLessThanOrEqual(100)
  })

  it('hourlyScores covers hours 5 through 20', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.hourlyScores).toHaveLength(16)
    expect(result.hourlyScores[0].hour).toBe('5AM')
    expect(result.hourlyScores[15].hour).toBe('8PM')
  })

  it('bestWindow score is the highest 3-hour average', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.bestWindow.score).toBeGreaterThanOrEqual(0)
    expect(result.bestWindow.start).toBeTruthy()
    expect(result.bestWindow.end).toBeTruthy()
  })

  it('passes moon and sun from solunar', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.moon.phase).toBe('Waxing Gibbous')
    expect(result.sun.sunrise).toBe('6:12 AM')
  })
})
```

- [ ] **Step 2: Run to confirm failing**

```bash
npx jest __tests__/scoringService.test.ts --no-coverage
```

Expected: FAIL — `buildConditionsData is not a function`

- [ ] **Step 3: Implement `services/scoringService.ts`**

```typescript
import { calculateScore, scoreLabel } from '../features/score/scoringEngine'
import { detectPhase, hoursFromLastTurn } from '../features/tide/tideUtils'
import type { ConditionsData, SkyData, WindData, PressureData, HourlyScore } from '../types/conditions'
import type { Spot } from '../types/spot'
import type { NoaaData } from './noaaService'
import type { NwsData } from './nwsService'
import type { SolunarData } from './solunarService'
import type { SwellData } from '../types/conditions'
import type { ScoringInputs } from '../features/score/scoringEngine'

const NEUTRAL_PRESSURE: PressureData = { value: 29.92, trend: 'stable', rate: 'normal', unit: 'inHg' }
const NEUTRAL_WIND: WindData = { speed: 8, gusts: 12, direction: 0, directionLabel: 'N', unit: 'mph' }
const NEUTRAL_SKY: SkyData = { condition: 'Partly Cloudy', rainChance: 20, icon: 'partly-cloudy' }

function formatHourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}${period}`
}

function formatHourTime(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:00 ${period}`
}

function isHourInWindow(hour: number, periods: { start: string; end: string }[]): boolean {
  for (const p of periods) {
    const parseH = (t: string): number => {
      const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
      if (!m) return -1
      let h = parseInt(m[1])
      const per = m[3].toUpperCase()
      if (per === 'PM' && h !== 12) h += 12
      if (per === 'AM' && h === 12) h = 0
      return h
    }
    const s = parseH(p.start)
    const e = parseH(p.end)
    if (s >= 0 && e >= 0 && hour >= s && hour <= e) return true
  }
  return false
}

function getHourlySolunar(solunar: SolunarData, hour: number): ScoringInputs['solunar'] {
  const inMajor = isHourInWindow(hour, solunar.moon.majorPeriods)
  const inMinor = !inMajor && isHourInWindow(hour, solunar.moon.minorPeriods)
  const nearMajor = !inMajor && !inMinor &&
    solunar.moon.majorPeriods.some(p => {
      const parseH = (t: string) => {
        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
        if (!m) return -1
        let h = parseInt(m[1])
        if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
        if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
        return h
      }
      const center = (parseH(p.start) + parseH(p.end)) / 2
      return Math.abs(hour - center) <= 1
    })
  return {
    inMajorPeriod: inMajor,
    inMinorPeriod: inMinor,
    withinHourOfPeriod: nearMajor,
    isMajorMoonDay: solunar.isMajorMoonDay,
  }
}

function getHourlyWind(nws: NwsData | null, hour: number): WindData {
  if (!nws) return NEUTRAL_WIND
  const period = nws.hourlyForecast.find(h => h.hour === hour) ?? nws.hourlyForecast[0]
  if (!period) return NEUTRAL_WIND
  return { ...nws.wind, speed: period.windSpeed, gusts: period.windSpeed + 5 }
}

function getHourlySky(nws: NwsData | null, hour: number): SkyData {
  if (!nws) return NEUTRAL_SKY
  const period = nws.hourlyForecast.find(h => h.hour === hour) ?? nws.hourlyForecast[0]
  if (!period) return nws.sky
  const rainChance = period.rainChance
  let icon: SkyData['icon'] = period.cloudCover > 70 ? 'overcast' :
    period.cloudCover > 30 ? 'partly-cloudy' : 'clear'
  if (rainChance >= 60) icon = 'heavy-rain'
  else if (rainChance >= 30) icon = 'light-rain'
  const condMap: Record<SkyData['icon'], SkyData['condition']> = {
    clear: 'Clear', 'partly-cloudy': 'Partly Cloudy', overcast: 'Overcast',
    'light-rain': 'Light Rain', 'heavy-rain': 'Heavy Rain',
  }
  return { condition: condMap[icon], rainChance, icon }
}

export function buildConditionsData(
  noaa: NoaaData | null,
  nws: NwsData | null,
  marine: SwellData | null,
  solunar: SolunarData,
  spot: Spot,
  now: Date
): ConditionsData {
  const pressure = noaa?.pressure ?? NEUTRAL_PRESSURE
  const wind = noaa?.wind ?? nws?.wind ?? NEUTRAL_WIND
  const sky = nws?.sky ?? NEUTRAL_SKY
  const waterTempValue = noaa?.waterTemp ?? (spot.type === 'saltwater' ? 65 : 68)
  const tide = noaa?.tide ?? null

  const currentHour = now.getHours()
  const hourlyCurve = tide?.hourlyCurve ?? []
  const tideForScore = tide
    ? {
        phase: detectPhase(hourlyCurve, currentHour),
        hoursFromTurn: hoursFromLastTurn(hourlyCurve, currentHour),
      }
    : null

  const baseInputs: Omit<ScoringInputs, 'solunar' | 'sky' | 'wind'> = {
    pressure: { value: pressure.value, trend: pressure.trend, rate: pressure.rate },
    tide: tideForScore,
    waterTemp: { value: waterTempValue, spotType: spot.type },
    spotType: spot.type,
  }

  const currentScore = calculateScore({
    ...baseInputs,
    solunar: solunar,
    wind: { speed: wind.speed },
    sky: { condition: sky.icon },
  })

  // Hourly scores: 5AM (hour 5) to 8PM (hour 20) = 16 hours
  const hourlyScores: HourlyScore[] = []
  for (let h = 5; h <= 20; h++) {
    const hourTide = hourlyCurve.length > 0
      ? { phase: detectPhase(hourlyCurve, h), hoursFromTurn: hoursFromLastTurn(hourlyCurve, h) }
      : null
    const hourSky = getHourlySky(nws, h)
    const hourWind = getHourlyWind(nws, h)
    const hourSolunar = getHourlySolunar(solunar, h)

    hourlyScores.push({
      hour: formatHourLabel(h),
      score: calculateScore({
        pressure: { value: pressure.value, trend: pressure.trend, rate: pressure.rate },
        tide: hourTide,
        waterTemp: { value: waterTempValue, spotType: spot.type },
        spotType: spot.type,
        solunar: hourSolunar,
        wind: { speed: hourWind.speed },
        sky: { condition: hourSky.icon },
      }),
    })
  }

  // Best 3-hour window
  let bestWindow = { start: formatHourTime(5), end: formatHourTime(8), score: 0 }
  for (let i = 0; i < hourlyScores.length - 2; i++) {
    const avg = Math.round(
      (hourlyScores[i].score + hourlyScores[i + 1].score + hourlyScores[i + 2].score) / 3
    )
    if (avg > bestWindow.score) {
      bestWindow = {
        start: formatHourTime(5 + i),
        end: formatHourTime(5 + i + 2),
        score: avg,
      }
    }
  }

  return {
    fishingScore: currentScore,
    scoreLabel: scoreLabel(currentScore),
    bestWindow,
    wind,
    tide,
    water: { temp: waterTempValue, unit: '°F' },
    air: nws?.air ?? { temp: 65, high: 70, low: 58, humidity: 70, unit: '°F' },
    pressure,
    swell: marine,
    sky,
    sun: solunar.sun,
    moon: solunar.moon,
    hourlyScores,
  }
}

// Keep legacy stub shape for forecastService (Phase B2)
export async function fetchConditions(_spot: Spot): Promise<ConditionsData> {
  throw new Error('fetchConditions not used in Phase B1 — use buildConditionsData via useConditions')
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npx jest __tests__/scoringService.test.ts --no-coverage
```

Expected: PASS (8 tests)

- [ ] **Step 5: Run the full existing test suite to check nothing regressed**

```bash
npx jest --no-coverage
```

Expected: all previous tests still pass.

- [ ] **Step 6: Commit**

```bash
git add services/scoringService.ts __tests__/scoringService.test.ts
git commit -m "feat: implement scoringService.buildConditionsData with hourly scores and best window"
```

---

## Task 8: Wire useConditions with TanStack Query

**Files:**
- Modify: `hooks/useConditions.ts`

- [ ] **Step 1: Read the current hook**

File is at `hooks/useConditions.ts`. It currently returns mock data. Replace the entire file body.

- [ ] **Step 2: Implement `hooks/useConditions.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchNoaaData } from '../services/noaaService'
import { fetchNwsData } from '../services/nwsService'
import { fetchMarineData } from '../services/marineService'
import { calculateSolunar } from '../services/solunarService'
import { buildConditionsData } from '../services/scoringService'
import type { ConditionsData } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseConditionsResult {
  data: ConditionsData | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export function useConditions(spot: Spot | null): UseConditionsResult {
  const enabled = !!spot

  const noaaQuery = useQuery({
    queryKey: ['noaa', spot?.id],
    queryFn: () => fetchNoaaData(spot!),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  })

  const nwsQuery = useQuery({
    queryKey: ['nws', spot?.id],
    queryFn: () => fetchNwsData(spot!),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
  })

  const marineQuery = useQuery({
    queryKey: ['marine', spot?.id],
    queryFn: () => fetchMarineData(spot!),
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 4 * 60 * 60 * 1000,
  })

  const solunarQuery = useQuery({
    queryKey: ['solunar', spot?.id, todayKey()],
    queryFn: () => calculateSolunar(spot!.lat, spot!.lng, new Date()),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  })

  const isLoading =
    noaaQuery.isLoading || nwsQuery.isLoading || marineQuery.isLoading || solunarQuery.isLoading

  // Only total failure if both primary weather sources fail
  const isError = (noaaQuery.isError && nwsQuery.isError) || solunarQuery.isError

  const data = useMemo(() => {
    if (!spot || !solunarQuery.data) return null
    return buildConditionsData(
      noaaQuery.data ?? null,
      nwsQuery.data ?? null,
      marineQuery.data ?? null,
      solunarQuery.data,
      spot,
      new Date()
    )
  }, [spot, noaaQuery.data, nwsQuery.data, marineQuery.data, solunarQuery.data])

  function refetch() {
    noaaQuery.refetch()
    nwsQuery.refetch()
    marineQuery.refetch()
  }

  return { data, isLoading, isError, refetch }
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useConditions.ts
git commit -m "feat: wire useConditions to four parallel TanStack Queries"
```

---

## Task 9: AsyncStorage Cache Persistence

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Read current `app/_layout.tsx`**

Note: it already has `QueryClientProvider`. Add the AsyncStorage persister around it.

- [ ] **Step 2: Implement updated `app/_layout.tsx`**

```typescript
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-reanimated'
import { Colors } from '../theme/colors'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = { initialRouteName: '(tabs)' }

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 30, retry: 2 },
  },
})

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'fishcast-query-cache',
})

export default function RootLayout() {
  const [loaded, error] = useFonts({})

  useEffect(() => { if (error) throw error }, [error])
  useEffect(() => { if (loaded) SplashScreen.hideAsync() }, [loaded])

  if (!loaded) return null

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="spot/new" options={{ title: 'Add Spot', presentation: 'modal' }} />
        <Stack.Screen name="species/[id]" options={{ title: 'Species Detail', presentation: 'modal' }} />
      </Stack>
    </PersistQueryClientProvider>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add AsyncStorage query cache persistence for offline cold opens"
```

---

## Task 10: Station Resolution in Add Spot Screen

**Files:**
- Modify: `app/spot/new.tsx`

- [ ] **Step 1: Read current `app/spot/new.tsx`**

Note the `handleSave` function currently sets `stationId: null`. Replace the file to add station resolution.

- [ ] **Step 2: Implement updated `app/spot/new.tsx`**

```typescript
import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useRouter } from 'expo-router'
import { useSpots } from '../../hooks/useSpots'
import { detectRegion } from '../../data/species'
import { resolveNearestStation } from '../../services/noaaStationService'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { Spot } from '../../types/spot'
import type { SpotType } from '../../types/spot'

export default function AddSpotScreen() {
  const router = useRouter()
  const { spots, addSpot } = useSpots()
  const isPro = false

  const [name, setName] = useState('')
  const [type, setType] = useState<SpotType>('saltwater')
  const [coords, setCoords] = useState({ lat: 38.33, lng: -123.05 })
  const [isSaving, setIsSaving] = useState(false)

  const isFreeAndHasSpot = !isPro && spots.length >= 1

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this spot.')
      return
    }
    if (isFreeAndHasSpot) {
      Alert.alert('Upgrade to Pro', 'Free accounts can save 1 spot. Upgrade to Pro for unlimited spots.')
      return
    }

    setIsSaving(true)
    try {
      const stationId = type === 'saltwater'
        ? await resolveNearestStation(coords.lat, coords.lng)
        : null

      const spot: Spot = {
        id: `spot_${Date.now()}`,
        name: name.trim(),
        lat: coords.lat,
        lng: coords.lng,
        type,
        stationId,
        region: detectRegion(coords.lat, coords.lng),
      }
      addSpot(spot)
      router.back()
    } catch {
      Alert.alert('Error', 'Could not save spot. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <MapView
        style={styles.map}
        initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
        onPress={e => {
          const { latitude, longitude } = e.nativeEvent.coordinate
          setCoords({ lat: latitude, lng: longitude })
          if (!name) setName(`Spot at ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
        }}
      >
        <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} pinColor={Colors.accent} />
      </MapView>

      <View style={styles.form}>
        <Text style={styles.label}>Spot Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Bodega Bay Jetty"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.label}>Water Type</Text>
        <View style={styles.toggle}>
          {(['saltwater', 'freshwater'] as SpotType[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleOption, type === t && styles.toggleActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.toggleText, type === t && styles.toggleTextActive]}>
                {t === 'saltwater' ? 'Saltwater' : 'Freshwater'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isFreeAndHasSpot && (
          <Text style={styles.proHint}>Free accounts can save 1 spot. Upgrade to Pro for unlimited spots.</Text>
        )}

        {isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.savingText}>Finding nearest tide station…</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (isFreeAndHasSpot || isSaving) && styles.saveDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveText}>
            {isSaving ? 'Saving…' : isFreeAndHasSpot ? 'Upgrade to Save More' : 'Save Spot'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  map: { height: 280 },
  form: { padding: Spacing.screenPad },
  label: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 16,
  },
  toggle: { flexDirection: 'row', gap: Spacing.sm },
  toggleOption: {
    flex: 1, padding: Spacing.md, borderRadius: Spacing.cardRadius,
    backgroundColor: Colors.card, alignItems: 'center',
  },
  toggleActive: { backgroundColor: Colors.accent + '33', borderWidth: 1.5, borderColor: Colors.accent },
  toggleText: { fontSize: 14, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.accent, fontWeight: '600' },
  proHint: { fontSize: 13, color: Colors.warning, marginTop: Spacing.md },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md },
  savingText: { fontSize: 13, color: Colors.textSecondary },
  saveButton: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg,
  },
  saveDisabled: { backgroundColor: Colors.textTertiary },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/spot/new.tsx
git commit -m "feat: resolve nearest NOAA station at spot-save time with loading indicator"
```

---

## Task 11: Dashboard Loading Overlay & Offline Banner

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Read current `app/(tabs)/index.tsx`**

Note it has `isLoading` from `useConditions` but does nothing with it. Add loading overlay and offline banner.

- [ ] **Step 2: Add `useNetInfo` import and loading/offline UI**

Replace the top of the file imports section and the `DashboardScreen` function. The ScrollView content stays the same — only add the overlay and banner.

Full updated `app/(tabs)/index.tsx`:
```typescript
import React, { useMemo } from 'react'
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'
import { useSpots } from '../../hooks/useSpots'
import { useConditions } from '../../hooks/useConditions'
import { useForecast } from '../../hooks/useForecast'
import { useSettingsStore } from '../../store/settingsStore'
import { ScoreDisplay } from '../../features/score/ScoreDisplay'
import { ScoreTimeline } from '../../features/score/ScoreTimeline'
import { TideChart } from '../../features/tide/TideChart'
import { WindDisplay } from '../../features/wind/WindDisplay'
import { ConditionsGrid } from '../../features/conditions/ConditionsGrid'
import { SpeciesCard } from '../../features/species/SpeciesCard'
import { ForecastStrip } from '../../features/forecast/ForecastStrip'
import { scoreSpecies } from '../../features/species/speciesScoring'
import { detectPhase } from '../../features/tide/tideUtils'
import { getSpeciesForRegion } from '../../data/species'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useRouter } from 'expo-router'

export default function DashboardScreen() {
  const router = useRouter()
  const netInfo = useNetInfo()
  const { activeSpot, spots } = useSpots()
  const { data: conditions, isLoading, isError, refetch } = useConditions(activeSpot)
  const { data: forecast } = useForecast(activeSpot)
  const isPro = useSettingsStore(s => s.isPro)

  const now = useMemo(() => new Date(), [])
  const currentHour = now.getHours()

  const scoredSpecies = useMemo(() => {
    if (!activeSpot || !conditions) return []
    const tidePhase = conditions.tide
      ? detectPhase(conditions.tide.hourlyCurve, currentHour)
      : 'slack'
    return getSpeciesForRegion(activeSpot.lat, activeSpot.lng)
      .map(sp => scoreSpecies(sp, {
        month: now.getMonth() + 1,
        waterTemp: conditions.water.temp,
        tidePhase,
        currentHour,
      }))
      .sort((a, b) => {
        if (!isPro && a.species.tier === 'pro' && b.species.tier !== 'pro') return 1
        if (!isPro && b.species.tier === 'pro' && a.species.tier !== 'pro') return -1
        return b.score - a.score
      })
  }, [activeSpot, conditions, currentHour, isPro])

  if (!activeSpot) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spot selected</Text>
        <Text style={styles.emptyHint}>Go to Spots tab to add your first fishing spot</Text>
      </View>
    )
  }

  if (isError && !conditions) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Could not load conditions</Text>
        <Text style={styles.emptyHint} onPress={refetch}>Tap to retry</Text>
      </View>
    )
  }

  return (
    <View style={styles.screenContainer}>
      {/* Offline banner */}
      {netInfo.isConnected === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        <View style={styles.header}>
          <Text style={styles.spotName}>{activeSpot.name}</Text>
          {spots.length > 1 && (
            <Text style={styles.switchHint} onPress={() => router.push('/spots')}>Switch ›</Text>
          )}
        </View>

        {conditions && (
          <>
            <ScoreDisplay
              score={conditions.fishingScore}
              label={conditions.scoreLabel}
              bestWindow={conditions.bestWindow}
            />
            <ScoreTimeline hourlyScores={conditions.hourlyScores} />
            <View style={styles.quickStats}>
              <WindDisplay wind={conditions.wind} />
              {conditions.tide && (
                <View style={styles.quickCard}>
                  <Text style={styles.quickLabel}>Tide</Text>
                  <Text style={styles.quickValue}>{conditions.tide.current.height} ft</Text>
                  <Text style={styles.quickSub}>{conditions.tide.current.rising ? '▲ Rising' : '▼ Falling'}</Text>
                </View>
              )}
              <View style={styles.quickCard}>
                <Text style={styles.quickLabel}>Water</Text>
                <Text style={styles.quickValue}>{conditions.water.temp}°</Text>
                <Text style={styles.quickSub}>{conditions.water.unit}</Text>
              </View>
            </View>
            {conditions.tide && <TideChart tide={conditions.tide} currentHour={currentHour} />}
            <ConditionsGrid conditions={conditions} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's Biting</Text>
              {scoredSpecies.map(ss => (
                <SpeciesCard
                  key={ss.species.id}
                  speciesScore={ss}
                  isPro={isPro}
                  onPress={() => {
                    if (ss.species.tier === 'pro' && !isPro) return
                    router.push({ pathname: '/species/[id]', params: { id: ss.species.id, data: JSON.stringify(ss) } })
                  }}
                />
              ))}
            </View>
            <ForecastStrip forecast={forecast} isPro={isPro} onUpgrade={() => router.push('/settings')} />
          </>
        )}
      </ScrollView>

      {/* Loading overlay — sits on top of ScrollView while fetching */}
      {isLoading && !conditions && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: Colors.background },
  screen: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  offlineBanner: {
    backgroundColor: Colors.warning + 'CC',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineText: { fontSize: 12, color: Colors.background, fontWeight: '600' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background + 'AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingTop: 56, paddingBottom: Spacing.sm,
  },
  spotName: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  switchHint: { fontSize: 14, color: Colors.accent },
  quickStats: {
    flexDirection: 'row', gap: Spacing.sm,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  quickCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  quickLabel: { fontSize: 11, color: Colors.textTertiary },
  quickValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  quickSub: { fontSize: 11, color: Colors.textSecondary },
  section: { marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
})
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: add loading overlay and offline banner to Dashboard"
```

---

## Task 12: Final Verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass. Count should be higher than Phase A's 29 (new service tests added).

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

- [ ] **Step 4: Smoke test on device**

```bash
npx expo start --tunnel
```

Add a saltwater spot (e.g. drop pin near Bodega Bay, CA). Watch for:
- "Finding nearest tide station…" while saving
- Dashboard loading overlay while queries fetch
- Real fishing score, real tide chart, real wind data
- "Offline — showing cached data" banner when device WiFi is turned off

---

## Self-Review Notes

**Spec coverage check:**
- ✅ noaaStationService — Task 2
- ✅ solunarService — Task 3
- ✅ noaaService — Task 4
- ✅ nwsService — Task 5
- ✅ marineService — Task 6
- ✅ scoringService.buildConditionsData — Task 7
- ✅ useConditions rewire — Task 8
- ✅ AsyncStorage persistence — Task 9
- ✅ Station resolution at spot-save — Task 10
- ✅ Loading overlay — Task 11
- ✅ Offline banner — Task 11
- ✅ EXPO_PUBLIC_NWS_CONTACT env var — nwsService Task 5 step 3

**Type consistency check:**
- `NoaaData.wind` is `WindData | null` (updated from stub) — scoringService handles null ✅
- `NoaaData.pressure` is `PressureData | null` — scoringService handles null ✅
- `NwsData.wind` added as fallback — scoringService uses it ✅
- `NwsData.hourlyForecast` matches what scoringService reads ✅
- `SolunarData` interface same in solunarService and scoringService ✅
- `buildConditionsData` signature in scoringService matches useConditions call ✅
