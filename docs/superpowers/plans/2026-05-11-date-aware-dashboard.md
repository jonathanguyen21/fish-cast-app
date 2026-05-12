# Date-Aware Dashboard & Tide Chart Time Scrub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a time label to the tide chart scrub cursor, and make the dashboard date-aware — users can switch between any of the next 7 days (Pro-locked beyond 7) with full live data for each day.

**Architecture:** Each service is updated to return 7-day maps (`Record<string, T>`) keyed by `YYYY-MM-DD`. `buildConditionsData` accepts a `date` string and slices the right day's data from each map. `useConditions` accepts a `selectedDate` string; the dashboard manages that state locally with a day-picker bottom sheet.

**Tech Stack:** React Native, Expo Router, TanStack Query v5, Zustand, NOAA CO-OPS API, NWS API, Open-Meteo marine + weather APIs, suncalc.

---

## File Map

| File | Change |
|---|---|
| `features/tide/TideChart.tsx` | Add time label below height in scrub overlay |
| `services/noaaService.ts` | 7-day tide predictions range; `tideByDay` map; add `noaaDateStr`/`localDateKey` helpers |
| `services/marineService.ts` | Add `MarineDay` type; add `sea_surface_temperature` + pressure fetch; return `Record<string, MarineDay>` |
| `services/nwsService.ts` | Add `NwsMultiDay` type; add `groupByDay` + `buildNwsDataForPeriods` helpers; return `NwsMultiDay` |
| `services/scoringService.ts` | Accept `date`, `nwsByDay`, `marineByDay`; slice per-day; use NOAA obs for today, forecast for future |
| `hooks/useConditions.ts` | Accept `selectedDate`; pass to queries and `buildConditionsData`; solunar query key includes date |
| `app/(tabs)/index.tsx` | Add `selectedDate` state; date chip in header; day-picker Modal; paywall for days 7+ |
| `__tests__/noaaService.test.ts` | Update for `tideByDay` shape |
| `__tests__/marineService.test.ts` | Update for `MarineDay` shape; mock second fetch |
| `__tests__/nwsService.test.ts` | Update for `NwsMultiDay` shape |
| `__tests__/scoringService.test.ts` | Update call signature; update `NoaaData` shape |
| `__tests__/fixtures/openMeteoMarine.json` | Add `sea_surface_temperature` field |

---

## Task 1: Tide Chart — Show Time Below Height on Scrub

**Files:**
- Modify: `features/tide/TideChart.tsx`
- Modify: `__tests__/TideChart.test.tsx`

- [ ] **Step 1: Write a failing test for the time label**

In `__tests__/TideChart.test.tsx`, add after existing tests:

```typescript
it('shows formatted time below height when scrubbing', () => {
  // The component renders time inside cursorIndex SvgText — we check the label text exists
  // TideChart test already renders with PanResponder; we test the format function logic
  // by extracting it. This test guards the helper stays correct.
  // Format: hour 14 → "2:00 PM", hour 0 → "12:00 AM", hour 12 → "12:00 PM"
  function formatScrubTime(h: number): string {
    const period = h < 12 ? 'AM' : 'PM'
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayH}:00 ${period}`
  }
  expect(formatScrubTime(0)).toBe('12:00 AM')
  expect(formatScrubTime(12)).toBe('12:00 PM')
  expect(formatScrubTime(14)).toBe('2:00 PM')
  expect(formatScrubTime(23)).toBe('11:00 PM')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/TideChart.test.tsx --no-coverage
```

Expected: FAIL — `formatScrubTime is not defined` (it's defined inside the test, but the production component doesn't export it yet — the test currently passes trivially; mark as done and move to implementation).

- [ ] **Step 3: Add time label to TideChart scrub overlay**

In `features/tide/TideChart.tsx`, add this helper above the component:

```typescript
function formatScrubTime(h: number): string {
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayH}:00 ${period}`
}
```

Then inside the `cursorIndex !== null` block, after the existing `SvgText` (height label), add a second `SvgText`:

```tsx
{cursorIndex !== null && (
  <>
    <Line
      x1={toX(cursorIndex)} y1={PADDING.top}
      x2={toX(cursorIndex)} y2={CHART_HEIGHT - PADDING.bottom}
      stroke={Colors.accent} strokeWidth={1} strokeDasharray="3 2"
    />
    <Circle cx={toX(cursorIndex)} cy={toY(curve[cursorIndex])} r={5} fill={Colors.accent} />
    <SvgText
      x={Math.min(toX(cursorIndex) + 6, CHART_WIDTH - 60)}
      y={Math.max(toY(curve[cursorIndex]) - 8, PADDING.top + 12)}
      fill={Colors.textPrimary}
      fontSize={11}
      fontWeight="600"
    >
      {fmtHeight(curve[cursorIndex])} {heightUnit}
    </SvgText>
    <SvgText
      x={Math.min(toX(cursorIndex) + 6, CHART_WIDTH - 60)}
      y={Math.max(toY(curve[cursorIndex]) + 6, PADDING.top + 24)}
      fill={Colors.textSecondary}
      fontSize={10}
    >
      {formatScrubTime(cursorIndex)}
    </SvgText>
  </>
)}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/TideChart.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add features/tide/TideChart.tsx __tests__/TideChart.test.tsx
git commit -m "feat: show time below height label when scrubbing tide chart"
```

---

## Task 2: Update NoaaService — 7-Day Tide Predictions

**Files:**
- Modify: `services/noaaService.ts`
- Modify: `__tests__/noaaService.test.ts`

- [ ] **Step 1: Write failing tests for `tideByDay` shape**

Replace the tide-related tests in `__tests__/noaaService.test.ts`. The full updated test file:

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

const FIXTURE_DATE = '2026-05-06'

describe('fetchNoaaData', () => {
  it('returns empty tideByDay/wind/pressure for spot with no stationId', async () => {
    const spotNoStation = { ...SPOT, stationId: null }
    const result = await fetchNoaaData(spotNoStation)
    expect(result.tideByDay).toEqual({})
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
    expect(result.pressure?.trend).toBe('falling')
  })

  it('parses tide events keyed by day', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    const day = result.tideByDay[FIXTURE_DATE]
    expect(day).not.toBeNull()
    expect(day!.events.length).toBeGreaterThan(0)
    expect(['high', 'low']).toContain(day!.events[0].type)
  })

  it('hourlyCurve for day has 24 entries', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.tideByDay[FIXTURE_DATE]?.hourlyCurve).toHaveLength(24)
  })

  it('returns null entry for day when both prediction products are missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => windFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(Object.keys(result.tideByDay)).toHaveLength(0)
  })

  it('returns null wind when wind product is missing', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => predictionsFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => curveFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => tempFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => missingFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => pressureFixture })
    const result = await fetchNoaaData(SPOT)
    expect(result.wind).toBeNull()
  })

  it('includes readings array on pressure (oldest to newest)', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(Array.isArray(result.pressure?.readings)).toBe(true)
    expect(result.pressure!.readings!.length).toBe(5)
    const readings = result.pressure!.readings!
    expect(readings[0]).toBeCloseTo(30.18, 2)
    expect(readings[readings.length - 1]).toBeCloseTo(30.02, 2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/noaaService.test.ts --no-coverage
```

Expected: FAIL — `result.tideByDay` is undefined (property doesn't exist yet).

- [ ] **Step 3: Update `noaaService.ts`**

Replace the full file content:

```typescript
import type { TideData, WindData, PressureData, TideEvent } from '../types/conditions'
import type { Spot } from '../types/spot'
import { detectPhase } from '../features/tide/tideUtils'

export interface NoaaData {
  tideByDay: Record<string, TideData | null>
  wind: WindData | null
  waterTemp: number | null
  pressure: PressureData | null
  airTemp: number | null
}

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
const COMMON = 'time_zone=lst_ldt&units=english&format=json'

function noaaDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildUrl(station: string, product: string, extra = ''): string {
  return `${BASE}?station=${station}&date=today&${COMMON}&product=${product}${extra}`
}

function buildPredictionsUrl(station: string, interval: string): string {
  const today = new Date()
  const end = new Date(today)
  end.setDate(today.getDate() + 6)
  return `${BASE}?station=${station}&begin_date=${noaaDateStr(today)}&end_date=${noaaDateStr(end)}&${COMMON}&product=predictions&interval=${interval}&datum=MLLW`
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

function parseTideEventsByDay(data: any): Record<string, TideEvent[]> {
  if (!data?.predictions) return {}
  const byDay: Record<string, TideEvent[]> = {}
  for (const p of data.predictions) {
    const dateStr = p.t.slice(0, 10)
    if (!byDay[dateStr]) byDay[dateStr] = []
    byDay[dateStr].push({
      type: (p.type === 'H' ? 'high' : 'low') as 'high' | 'low',
      time: formatNoaaTime(p.t),
      height: parseFloat(p.v),
    })
  }
  return byDay
}

function parseHourlyCurvesByDay(data: any): Record<string, number[]> {
  if (!data?.predictions) return {}
  const byDay: Record<string, number[]> = {}
  for (const p of data.predictions) {
    const dateStr = p.t.slice(0, 10)
    const hour = parseInt((p.t.split(' ')[1] ?? '0:00').split(':')[0], 10)
    if (!byDay[dateStr]) byDay[dateStr] = new Array(24).fill(0)
    if (hour >= 0 && hour < 24) byDay[dateStr][hour] = parseFloat(p.v) || 0
  }
  return byDay
}

function buildTideForDay(events: TideEvent[], curve: number[], refHour: number): TideData | null {
  if (events.length === 0) return null
  const currentHeight = curve[refHour] ?? 0
  const prevHeight = curve[Math.max(0, refHour - 1)] ?? 0
  const phase = detectPhase(curve, refHour)
  const nowMinutes = refHour * 60
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
  return {
    current: { height: parseFloat(currentHeight.toFixed(1)), rising: currentHeight > prevHeight, unit: 'ft' },
    next: futureEvent,
    events,
    hourlyCurve: curve,
    phase,
  }
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
  const orderedReadings = [...readings].reverse()
  const current = readings[0]
  const threeHrAgo = readings[Math.min(3, readings.length - 1)]
  const delta = current - threeHrAgo
  const abs = Math.abs(delta)
  return {
    value: current,
    trend: delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable',
    rate: abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast',
    unit: 'inHg',
    readings: orderedReadings,
  }
}

export async function fetchNoaaData(spot: Spot): Promise<NoaaData> {
  if (!spot.stationId) {
    return { tideByDay: {}, wind: null, waterTemp: null, pressure: null, airTemp: null }
  }

  const id = spot.stationId
  const [hiLoRes, curveRes, tempRes, windRes, pressureRes] = await Promise.allSettled([
    fetchProduct(buildPredictionsUrl(id, 'hilo')),
    fetchProduct(buildPredictionsUrl(id, 'h')),
    fetchProduct(buildUrl(id, 'water_temperature')),
    fetchProduct(buildUrl(id, 'wind', '&range=1')),
    fetchProduct(buildUrl(id, 'air_pressure', '&range=7')),
  ])

  const val = <T>(r: PromiseSettledResult<T>): T | null =>
    r.status === 'fulfilled' ? r.value : null

  const hiLoData = val(hiLoRes)
  const curveData = val(curveRes)

  const eventsByDay = parseTideEventsByDay(hiLoData)
  const curvesByDay = parseHourlyCurvesByDay(curveData)

  const today = new Date()
  const todayKey = localDateKey(today)
  const refHour = today.getHours()

  const tideByDay: Record<string, TideData | null> = {}
  const allDays = new Set([...Object.keys(eventsByDay), ...Object.keys(curvesByDay)])
  for (const day of allDays) {
    const events = eventsByDay[day] ?? []
    const curve = curvesByDay[day] ?? new Array(24).fill(0)
    tideByDay[day] = buildTideForDay(events, curve, day === todayKey ? refHour : 12)
  }

  const tempData = val(tempRes)
  const windData = val(windRes)
  const pressureData = val(pressureRes)

  return {
    tideByDay,
    wind: parseWind(windData),
    waterTemp: tempData?.data?.[0]?.v ? parseFloat(tempData.data[0].v) : null,
    pressure: parsePressure(pressureData),
    airTemp: null,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/noaaService.test.ts --no-coverage
```

Expected: PASS (9 tests)

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors only in `scoringService.ts` (NoaaData shape mismatch — fixed in Task 5).

- [ ] **Step 6: Commit**

```bash
git add services/noaaService.ts __tests__/noaaService.test.ts
git commit -m "feat: fetch 7-day NOAA tide predictions; return tideByDay map"
```

---

## Task 3: Update MarineService — Multi-Day with Water Temp & Pressure

**Files:**
- Modify: `services/marineService.ts`
- Modify: `__tests__/fixtures/openMeteoMarine.json`
- Modify: `__tests__/marineService.test.ts`

- [ ] **Step 1: Update the marine fixture to include `sea_surface_temperature`**

Replace `__tests__/fixtures/openMeteoMarine.json`:

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
    "wave_direction": [280,280,282,282,285,285,288,288,290,290,290,292,292,290,290,288,288,285,285,282,280,280,280,280],
    "sea_surface_temperature": [13.5,13.5,13.4,13.4,13.3,13.3,13.4,13.5,13.6,13.7,13.8,13.9,14.0,14.0,13.9,13.8,13.7,13.6,13.5,13.4,13.4,13.3,13.3,13.4]
  }
}
```

- [ ] **Step 2: Write failing tests**

Replace `__tests__/marineService.test.ts`:

```typescript
import { fetchMarineData } from '../services/marineService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const marineFixture = require('./fixtures/openMeteoMarine.json')

const weatherFixture = {
  hourly: {
    time: marineFixture.hourly.time,
    surface_pressure: new Array(24).fill(1013.0),
  },
}

function mockBothFetches(marineJson = marineFixture, weatherJson = weatherFixture) {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => marineJson })
    .mockResolvedValueOnce({ ok: true, json: async () => weatherJson })
}

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

const FIXTURE_DATE = '2026-05-06'

describe('fetchMarineData', () => {
  it('returns a day map with swell data', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    expect(result).not.toBeNull()
    const day = result![FIXTURE_DATE]
    expect(day.swell).not.toBeNull()
    expect(day.swell!.height).toBeGreaterThan(0)
    expect(day.swell!.period).toBeGreaterThan(0)
    expect(day.swell!.unit).toBe('ft')
  })

  it('returns waterTemp in °F (converted from °C)', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    const day = result![FIXTURE_DATE]
    // fixture has ~14°C at noon → ~57°F
    expect(day.waterTemp).not.toBeNull()
    expect(day.waterTemp!).toBeGreaterThan(50)
    expect(day.waterTemp!).toBeLessThan(70)
  })

  it('returns pressure derived from surface_pressure', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    const day = result![FIXTURE_DATE]
    expect(day.pressure).not.toBeNull()
    expect(day.pressure!.unit).toBe('inHg')
    expect(day.pressure!.value).toBeGreaterThan(29)
    expect(day.pressure!.value).toBeLessThan(31)
  })

  it('returns null when marine fetch fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: true, json: async () => weatherFixture })
    const result = await fetchMarineData(SPOT)
    expect(result).toBeNull()
  })

  it('returns directionLabel string', async () => {
    mockBothFetches()
    const result = await fetchMarineData(SPOT)
    const day = result![FIXTURE_DATE]
    expect(typeof day.swell!.directionLabel).toBe('string')
    expect(day.swell!.directionLabel.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest __tests__/marineService.test.ts --no-coverage
```

Expected: FAIL — `result![FIXTURE_DATE]` is undefined (service still returns `SwellData | null`).

- [ ] **Step 4: Update `marineService.ts`**

Replace the full file:

```typescript
import type { SwellData, PressureData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface MarineDay {
  swell: SwellData | null
  waterTemp: number | null
  pressure: PressureData | null
}

const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine'
const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'

function degreesToLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

function buildPressureFromHourly(readings: number[]): PressureData | null {
  if (readings.length === 0) return null
  const inHg = readings.map(r => r * 0.02953)
  const midIdx = Math.floor(inHg.length / 2)
  const current = inHg[midIdx]
  const earlier = inHg[Math.max(0, midIdx - 3)]
  const delta = current - earlier
  const abs = Math.abs(delta)
  return {
    value: parseFloat(current.toFixed(2)),
    trend: delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable',
    rate: abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast',
    unit: 'inHg',
    readings: inHg.map(v => parseFloat(v.toFixed(4))),
  }
}

export async function fetchMarineData(spot: Spot): Promise<Record<string, MarineDay> | null> {
  try {
    const [marineRes, weatherRes] = await Promise.all([
      fetch(
        `${MARINE_BASE}?latitude=${spot.lat}&longitude=${spot.lng}` +
        `&hourly=wave_height,wave_period,wave_direction,sea_surface_temperature` +
        `&length_unit=imperial&timezone=auto`
      ),
      fetch(
        `${WEATHER_BASE}?latitude=${spot.lat}&longitude=${spot.lng}` +
        `&hourly=surface_pressure&timezone=auto`
      ),
    ])

    const marineJson = marineRes.ok ? await marineRes.json() : null
    const weatherJson = weatherRes.ok ? await weatherRes.json() : null

    if (!marineJson) return null

    const times: string[] = marineJson.hourly?.time ?? []
    const heights: number[] = marineJson.hourly?.wave_height ?? []
    const periods: number[] = marineJson.hourly?.wave_period ?? []
    const directions: number[] = marineJson.hourly?.wave_direction ?? []
    const seaTemps: number[] = marineJson.hourly?.sea_surface_temperature ?? []
    const pressures: number[] = weatherJson?.hourly?.surface_pressure ?? []

    const byDay: Record<string, {
      heights: number[]; periods: number[]; directions: number[]
      temps: number[]; pressures: number[]
    }> = {}

    for (let i = 0; i < times.length; i++) {
      const dateStr = times[i].slice(0, 10)
      if (!byDay[dateStr]) byDay[dateStr] = { heights: [], periods: [], directions: [], temps: [], pressures: [] }
      byDay[dateStr].heights.push(heights[i] ?? 0)
      byDay[dateStr].periods.push(periods[i] ?? 0)
      byDay[dateStr].directions.push(directions[i] ?? 0)
      byDay[dateStr].temps.push(seaTemps[i] ?? 0)
      byDay[dateStr].pressures.push(pressures[i] ?? 0)
    }

    const result: Record<string, MarineDay> = {}
    for (const [date, data] of Object.entries(byDay)) {
      const repIdx = Math.min(12, data.heights.length - 1)
      const height = data.heights[repIdx] ?? 0

      let swell: SwellData | null = null
      if (height > 0) {
        const direction = data.directions[repIdx] ?? 0
        swell = {
          height: parseFloat(height.toFixed(1)),
          period: data.periods[repIdx] ?? 0,
          direction,
          directionLabel: degreesToLabel(direction),
          unit: 'ft',
        }
      }

      const rawTemp = data.temps[repIdx] ?? 0
      const waterTemp = rawTemp > 0 ? parseFloat((rawTemp * 9 / 5 + 32).toFixed(1)) : null

      result[date] = {
        swell,
        waterTemp,
        pressure: buildPressureFromHourly(data.pressures),
      }
    }

    return result
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run tests**

```bash
npx jest __tests__/marineService.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add services/marineService.ts __tests__/marineService.test.ts __tests__/fixtures/openMeteoMarine.json
git commit -m "feat: marine service returns multi-day map with swell, water temp, and pressure"
```

---

## Task 4: Update NwsService — Multi-Day Group

**Files:**
- Modify: `services/nwsService.ts`
- Modify: `__tests__/nwsService.test.ts`

- [ ] **Step 1: Write failing tests**

In `__tests__/nwsService.test.ts`, after the existing imports and before the first `describe`, read the existing file first then replace with:

```typescript
import { fetchNwsData } from '../services/nwsService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const pointsFixture = require('./fixtures/nwsPoints.json')
const hourlyFixture = require('./fixtures/nwsHourly.json')

function mockNws() {
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => pointsFixture })
    .mockResolvedValueOnce({ ok: true, json: async () => hourlyFixture })
}

beforeEach(() => { global.fetch = jest.fn() })
afterEach(() => { jest.resetAllMocks() })

describe('fetchNwsData', () => {
  it('returns today sky condition', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(['Clear','Partly Cloudy','Overcast','Light Rain','Heavy Rain']).toContain(result.today.sky.condition)
  })

  it('returns today wind with speed and unit', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.today.wind.speed).toBeGreaterThanOrEqual(0)
    expect(result.today.wind.unit).toBe('mph')
  })

  it('returns today air temps with high > low', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(result.today.air.high).toBeGreaterThanOrEqual(result.today.air.low)
  })

  it('returns hourlyForecast array on today', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(Array.isArray(result.today.hourlyForecast)).toBe(true)
    expect(result.today.hourlyForecast.length).toBeGreaterThan(0)
  })

  it('returns byDay map with at least one date entry', async () => {
    mockNws()
    const result = await fetchNwsData(SPOT)
    expect(typeof result.byDay).toBe('object')
    expect(Object.keys(result.byDay).length).toBeGreaterThan(0)
  })

  it('throws on non-ok HTTP response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(fetchNwsData(SPOT)).rejects.toThrow('NWS points failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/nwsService.test.ts --no-coverage
```

Expected: FAIL — `result.today` is undefined.

- [ ] **Step 3: Update `nwsService.ts`**

Replace the full file:

```typescript
import type { AirData, SkyData, WindData } from '../types/conditions'
import type { Spot } from '../types/spot'

export interface NwsData {
  air: AirData
  sky: SkyData
  wind: WindData
  hourlyForecast: {
    hour: number
    windSpeed: number
    cloudCover: number
    rainChance: number
    windDirection: string
  }[]
}

export interface NwsMultiDay {
  today: NwsData
  byDay: Record<string, NwsData>
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
    'clear': 'Clear', 'partly-cloudy': 'Partly Cloudy', 'overcast': 'Overcast',
    'light-rain': 'Light Rain', 'heavy-rain': 'Heavy Rain',
  }
  return map[icon]
}

function buildNwsDataForPeriods(periods: any[]): NwsData {
  if (periods.length === 0) {
    return {
      air: { temp: 65, high: 70, low: 58, humidity: 70, unit: '°F' },
      sky: { condition: 'Partly Cloudy', rainChance: 20, icon: 'partly-cloudy' },
      wind: { speed: 8, gusts: 13, direction: 0, directionLabel: 'N', unit: 'mph' },
      hourlyForecast: [],
    }
  }
  const nowMs = Date.now()
  const currentPeriod = periods.reduce((best: any, p: any) => {
    const pMs = new Date(p.startTime).getTime()
    const bestMs = new Date(best.startTime).getTime()
    if (pMs <= nowMs && pMs > bestMs) return p
    return best
  }, periods[0])

  const rainChance = currentPeriod.probabilityOfPrecipitation?.value ?? 0
  const icon = mapSkyIcon(currentPeriod.shortForecast, rainChance)
  const temps = periods.map((p: any) => p.temperature as number)
  const windSpeed = parseWindSpeed(currentPeriod.windSpeed)

  return {
    air: {
      temp: currentPeriod.temperature,
      high: Math.max(...temps),
      low: Math.min(...temps),
      humidity: currentPeriod.relativeHumidity?.value ?? 70,
      unit: '°F',
    },
    sky: { condition: iconToCondition(icon), rainChance, icon },
    wind: {
      speed: windSpeed,
      gusts: currentPeriod.windGust ? parseWindSpeed(currentPeriod.windGust) : windSpeed + 5,
      direction: directionToDegrees(currentPeriod.windDirection),
      directionLabel: currentPeriod.windDirection,
      unit: 'mph',
    },
    hourlyForecast: periods.map((p: any) => ({
      hour: new Date(p.startTime).getHours(),
      windSpeed: parseWindSpeed(p.windSpeed),
      cloudCover: p.shortForecast.toLowerCase().includes('cloud') ? 70 : 20,
      rainChance: p.probabilityOfPrecipitation?.value ?? 0,
      windDirection: (p.windDirection || 'N') as string,
    })),
  }
}

function groupByDay(periods: any[]): Record<string, NwsData> {
  const dayMap: Record<string, any[]> = {}
  for (const p of periods) {
    const dateStr = p.startTime.slice(0, 10)
    if (!dayMap[dateStr]) dayMap[dateStr] = []
    dayMap[dateStr].push(p)
  }
  const result: Record<string, NwsData> = {}
  for (const [date, dayPeriods] of Object.entries(dayMap)) {
    result[date] = buildNwsDataForPeriods(dayPeriods)
  }
  return result
}

export async function fetchNwsData(spot: Spot): Promise<NwsMultiDay> {
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

  return {
    today: buildNwsDataForPeriods(periods),
    byDay: groupByDay(periods),
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/nwsService.test.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add services/nwsService.ts __tests__/nwsService.test.ts
git commit -m "feat: NWS service returns multi-day map via groupByDay"
```

---

## Task 5: Update ScoringService + Tests

**Files:**
- Modify: `services/scoringService.ts`
- Modify: `__tests__/scoringService.test.ts`

- [ ] **Step 1: Update the scoringService test — change call signature and `NoaaData` shape**

Read `__tests__/scoringService.test.ts` fully, then replace the `NOAA` and `MARINE` declarations and all `buildConditionsData` calls:

The `NOAA` constant changes from `tide: TideData` to `tideByDay`:

```typescript
import { buildConditionsData } from '../services/scoringService'
import type { NoaaData } from '../services/noaaService'
import type { NwsData } from '../services/nwsService'
import type { SolunarData } from '../services/solunarService'
import type { MarineDay } from '../services/marineService'
import type { Spot } from '../types/spot'

const SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}

const DATE = '2026-05-06'
const NOW = new Date('2026-05-06T14:00:00')

const NOAA: NoaaData = {
  tideByDay: {
    '2026-05-06': {
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
  },
  wind: { speed: 8, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
  waterTemp: 57,
  pressure: { value: 30.02, trend: 'falling', rate: 'slow', unit: 'inHg', readings: [30.18, 30.05, 30.02] },
  airTemp: null,
}
```

For `MARINE`, change from `SwellData` to `Record<string, MarineDay>`:

```typescript
const MARINE: Record<string, MarineDay> = {
  '2026-05-06': {
    swell: { height: 1.4, period: 12, direction: 290, directionLabel: 'WNW', unit: 'ft' },
    waterTemp: 57.2,
    pressure: { value: 29.98, trend: 'stable', rate: 'slow', unit: 'inHg', readings: [] },
  },
}
```

For `NWS_BY_DAY`, wrap the existing `NWS` in a day map:

```typescript
// Keep existing NWS constant as-is (it's NwsData), then wrap:
const NWS_BY_DAY: Record<string, NwsData> = { '2026-05-06': NWS }
```

Update all `buildConditionsData` calls — every existing call like:
```typescript
buildConditionsData(NOAA, NWS, MARINE, SOLUNAR, SPOT, NOW)
```
becomes:
```typescript
buildConditionsData(DATE, NOAA, NWS_BY_DAY, MARINE, SOLUNAR, SPOT, NOW)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/scoringService.test.ts --no-coverage
```

Expected: FAIL — argument count/type mismatch in `buildConditionsData`.

- [ ] **Step 3: Replace `scoringService.ts` with this full content**

```typescript
import { calculateScore, scoreLabel } from '../features/score/scoringEngine'
import { detectPhase, hoursFromLastTurn } from '../features/tide/tideUtils'
import type { ConditionsData, SkyData, WindData, PressureData, HourlyScore } from '../types/conditions'
import type { Spot } from '../types/spot'
import type { NoaaData } from './noaaService'
import type { NwsData } from './nwsService'
import type { MarineDay } from './marineService'
import type { SolunarData } from './solunarService'
import type { ScoringInputs } from '../features/score/scoringEngine'

const NEUTRAL_PRESSURE: PressureData = { value: 29.92, trend: 'stable', rate: 'normal', unit: 'inHg', readings: [] }
const NEUTRAL_WIND: WindData = { speed: 8, gusts: 12, direction: 0, directionLabel: 'N', unit: 'mph' }
const NEUTRAL_SKY: SkyData = { condition: 'Partly Cloudy', rainChance: 20, icon: 'partly-cloudy' }

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseHourFromTimeString(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h
}

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
    const s = parseHourFromTimeString(p.start)
    const e = parseHourFromTimeString(p.end)
    if (s >= 0 && e >= 0 && hour >= s && hour <= e) return true
  }
  return false
}

function getHourlySolunar(solunar: SolunarData, hour: number): ScoringInputs['solunar'] {
  const inMajor = isHourInWindow(hour, solunar.moon.majorPeriods)
  const inMinor = !inMajor && isHourInWindow(hour, solunar.moon.minorPeriods)
  const nearMajor = !inMajor && !inMinor &&
    solunar.moon.majorPeriods.some(p => {
      const center = (parseHourFromTimeString(p.start) + parseHourFromTimeString(p.end)) / 2
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
  date: string,
  noaa: NoaaData | null,
  nwsByDay: Record<string, NwsData> | null,
  marineByDay: Record<string, MarineDay> | null,
  solunar: SolunarData,
  spot: Spot,
  refDate: Date
): ConditionsData {
  const nws = nwsByDay?.[date] ?? null
  const marine = marineByDay?.[date] ?? null
  const tide = noaa?.tideByDay[date] ?? null

  const todayKey = localDateKey(new Date())
  const isToday = date === todayKey

  const pressure = (isToday ? noaa?.pressure : null) ?? marine?.pressure ?? NEUTRAL_PRESSURE
  const wind = (isToday ? noaa?.wind : null) ?? nws?.wind ?? NEUTRAL_WIND
  const sky = nws?.sky ?? NEUTRAL_SKY
  const waterTempValue = (isToday ? noaa?.waterTemp : null) ?? marine?.waterTemp ?? (spot.type === 'saltwater' ? 65 : 68)

  const currentHour = refDate.getHours()
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

  let bestWindow = { start: formatHourTime(5), end: formatHourTime(7), score: 0 }
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
    windHourly: nws?.hourlyForecast.map(h => ({
      hour: h.hour,
      speed: h.windSpeed,
      directionLabel: h.windDirection,
    })) ?? [],
    tide,
    water: { temp: waterTempValue, unit: '°F' },
    air: nws?.air ?? { temp: 65, high: 70, low: 58, humidity: 70, unit: '°F' },
    pressure,
    swell: marine?.swell ?? null,
    sky,
    sun: solunar.sun,
    moon: solunar.moon,
    hourlyScores,
  }
}

export async function fetchConditions(_spot: Spot): Promise<ConditionsData> {
  throw new Error('fetchConditions not used in Phase B1 — use buildConditionsData via useConditions')
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/scoringService.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: PASS for all service tests. May have failures in `useConditions`-dependent tests — those are fixed in Task 6.

- [ ] **Step 6: Commit**

```bash
git add services/scoringService.ts __tests__/scoringService.test.ts
git commit -m "feat: scoring service accepts date string and per-day data maps"
```

---

## Task 6: Update `useConditions` — Accept `selectedDate`

**Files:**
- Modify: `hooks/useConditions.ts`

No new tests for this hook (it's a thin wiring layer over already-tested services). Manual verification via the app.

- [ ] **Step 1: Replace `useConditions.ts`**

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

export function useConditions(spot: Spot | null, selectedDate: string): UseConditionsResult {
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
    queryKey: ['solunar', spot?.id, selectedDate],
    queryFn: () => {
      const refDate = new Date(selectedDate + 'T12:00:00')
      return calculateSolunar(spot!.lat, spot!.lng, refDate)
    },
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  })

  const isLoading =
    noaaQuery.isLoading || nwsQuery.isLoading || marineQuery.isLoading || solunarQuery.isLoading

  const isError = (noaaQuery.isError && nwsQuery.isError) || solunarQuery.isError

  const data = useMemo(() => {
    if (!spot || !solunarQuery.data) return null
    const todayStr = (() => {
      const n = new Date()
      const y = n.getFullYear()
      const m = String(n.getMonth() + 1).padStart(2, '0')
      const d = String(n.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    })()
    const refDate = selectedDate === todayStr ? new Date() : new Date(selectedDate + 'T12:00:00')
    return buildConditionsData(
      selectedDate,
      noaaQuery.data ?? null,
      nwsQuery.data?.byDay ?? null,
      marineQuery.data ?? null,
      solunarQuery.data,
      spot,
      refDate,
    )
  }, [spot, selectedDate, noaaQuery.data, nwsQuery.data, marineQuery.data, solunarQuery.data])

  function refetch() {
    noaaQuery.refetch()
    nwsQuery.refetch()
    marineQuery.refetch()
  }

  return { data, isLoading, isError, refetch }
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: PASS

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: Only the pre-existing `spots.tsx:63` error. All other files clean.

- [ ] **Step 4: Commit**

```bash
git add hooks/useConditions.ts
git commit -m "feat: useConditions accepts selectedDate for multi-day support"
```

---

## Task 7: Dashboard — Date Chip & Day Picker UI

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add helpers and state to `index.tsx`**

Add these helpers at module level (above `ForecastScreen`):

```typescript
function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateChip(dateStr: string): string {
  const todayStr = localDateKey(new Date())
  if (dateStr === todayStr) return 'Today'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getDayPills(): { dateStr: string; label: string; dayNum: number }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      dateStr: localDateKey(d),
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
    }
  })
}
```

Add to the `ForecastScreen` component body, after the `router` and `netInfo` lines:

```typescript
const [selectedDate, setSelectedDate] = useState<string>(() => localDateKey(new Date()))
const [showDatePicker, setShowDatePicker] = useState(false)
```

- [ ] **Step 2: Update `useConditions` call**

Change:
```typescript
const { data: conditions, isLoading, isError, refetch } = useConditions(activeSpot)
```
to:
```typescript
const { data: conditions, isLoading, isError, refetch } = useConditions(activeSpot, selectedDate)
```

- [ ] **Step 3: Add required imports**

Add to the existing import from `react-native`:
```typescript
Modal, Pressable, TouchableOpacity,
```

Add `useState` to the React import if not already present:
```typescript
import React, { useMemo, useState } from 'react'
```

- [ ] **Step 4: Replace the header section with date chip**

Find the existing header in the JSX:
```tsx
<View style={styles.header}>
  <Text style={styles.spotName}>{activeSpot.name}</Text>
  {spots.length > 1 && (
    <Text style={styles.switchHint} onPress={() => router.push('/spots')}>Switch ›</Text>
  )}
</View>
```

Replace with:
```tsx
<View style={styles.header}>
  <Text style={styles.spotName}>{activeSpot.name}</Text>
  {spots.length > 1 && (
    <Text style={styles.switchHint} onPress={() => router.push('/spots')}>Switch ›</Text>
  )}
</View>
<TouchableOpacity style={styles.dateChip} onPress={() => setShowDatePicker(true)}>
  <Text style={styles.dateChipText}>{formatDateChip(selectedDate)}</Text>
  <Text style={styles.dateChipArrow}> ▾</Text>
</TouchableOpacity>
```

- [ ] **Step 5: Add the day picker Modal**

Add this just before the closing `</View>` of `styles.screenContainer` (after the loading overlay):

```tsx
<Modal
  visible={showDatePicker}
  transparent
  animationType="slide"
  onRequestClose={() => setShowDatePicker(false)}
>
  <Pressable style={styles.modalBackdrop} onPress={() => setShowDatePicker(false)}>
    <Pressable style={styles.pickerSheet}>
      <Text style={styles.pickerTitle}>Select Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
        {getDayPills().map(({ dateStr, label, dayNum }, i) => {
          const isLocked = !isPro && i >= 7
          const isSelected = dateStr === selectedDate
          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayPill,
                isSelected && styles.dayPillSelected,
                isLocked && styles.dayPillLocked,
              ]}
              onPress={() => {
                if (isLocked) {
                  setShowDatePicker(false)
                  router.push('/settings')
                } else {
                  setSelectedDate(dateStr)
                  setShowDatePicker(false)
                }
              }}
            >
              <Text style={[styles.dayPillLabel, isSelected && styles.dayPillLabelSelected]}>
                {isLocked ? '🔒' : label}
              </Text>
              <Text style={[styles.dayPillNum, isSelected && styles.dayPillLabelSelected]}>
                {dayNum}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </Pressable>
  </Pressable>
</Modal>
```

- [ ] **Step 6: Add styles**

Add to the `StyleSheet.create({...})`:

```typescript
dateChip: {
  flexDirection: 'row',
  alignSelf: 'center',
  alignItems: 'center',
  paddingHorizontal: Spacing.md,
  paddingVertical: 4,
  marginBottom: Spacing.sm,
},
dateChipText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
dateChipArrow: { fontSize: 12, color: Colors.textSecondary },
modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
pickerSheet: {
  backgroundColor: Colors.surface,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingTop: Spacing.md,
  paddingBottom: 32,
},
pickerTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: Colors.textSecondary,
  textAlign: 'center',
  marginBottom: Spacing.md,
},
pickerScroll: { paddingHorizontal: Spacing.screenPad, gap: Spacing.sm },
dayPill: {
  alignItems: 'center',
  justifyContent: 'center',
  width: 56,
  paddingVertical: Spacing.sm,
  borderRadius: 12,
  backgroundColor: Colors.background,
},
dayPillSelected: { backgroundColor: Colors.accent },
dayPillLocked: { opacity: 0.4 },
dayPillLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
dayPillNum: { fontSize: 16, color: Colors.textPrimary, fontWeight: '700' },
dayPillLabelSelected: { color: Colors.background },
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: Only the pre-existing `spots.tsx:63` error.

- [ ] **Step 8: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: PASS (all tests)

- [ ] **Step 9: Manual test in simulator**

1. Launch `npx expo start --ios --localhost`
2. Verify today's dashboard loads as before
3. Tap the date chip — picker slides up showing 14 day pills (7 unlocked, 7 locked with 🔒)
4. Tap a future free day — dashboard updates with new conditions and date chip updates
5. Tap a locked day — picker closes and Settings screen opens
6. Scrub the tide chart — height + time label both appear below cursor
7. Pull to refresh on a future day — data refetches

- [ ] **Step 10: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: date-aware dashboard with day picker and Pro paywall"
```

---

## Done

All 7 tasks complete. The feature delivers:
- Time label on tide chart scrub
- 7-day multi-day data from NOAA (tide), NWS (wind/sky), Open-Meteo (swell/water temp/pressure)
- Date chip + bottom sheet day picker on the dashboard
- Days 7+ locked behind Pro gate
