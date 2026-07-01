# FishCast UX Overhaul — Phase 2: Real 7-Day Forecast

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the forecast stub with a real 7-day fishing forecast computed by the *same* scoring engine as today's score, gated with an honest teaser (2 days free, 5 locked), plus a per-day detail modal and a "tomorrow looks better" handoff on the dashboard.

**Architecture:** `forecastService.fetchForecast(spot)` combines one NOAA 7-day tide-predictions call, the existing NWS hourly call (~156 periods), and local per-day solunar, then runs `calculateScore()` per hour per day. Future days score with neutral pressure (pressure isn't forecastable from these APIs). A pure `buildForecastDays()` function does all computation so tests need no network mocking beyond fixtures.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript strict, TanStack Query v5, Jest + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-01-ux-overhaul-design.md` (Phase 2 section).

**Prerequisite:** Phase 1 plan (`2026-07-01-ux-overhaul-phase-1-data-trust.md`) is fully merged. This plan relies on: `HourlyScore.hourIndex`, `NwsData.hourlyForecast[].epochMs`, `ScoreTimeline`'s `currentHour: number | null` prop, `components/ProWaitlistSheet.tsx`, and the corrected NOAA URL params.

## Global Constraints

- Run `npx jest --no-coverage` AND `npx tsc --noEmit` before every commit. Both must be clean.
- Known pre-existing TS error `app/(tabs)/spots.tsx(63,27)` is expected — do NOT fix it, do NOT introduce new errors. When `router.push` to a new route upsets typed routes, cast the pathname `as any` (existing pattern: see `/detail/pressure` in `app/(tabs)/index.tsx`).
- No new npm dependencies.
- Dark theme only; use `Colors.*` / `Spacing.*` constants.
- Copy (user-facing strings) must match this plan exactly.
- Never fabricate data: hours beyond NWS coverage use documented neutral values; missing tide data means `tide: null`, not invented curves.

---

### Task 1: Export scoring helpers from scoringService

`forecastService` must reuse — not duplicate — the hour-scoring plumbing.

**Files:**
- Modify: `services/scoringService.ts`
- Test: `__tests__/scoringService.test.ts`

**Interfaces:**
- Consumes: existing private functions.
- Produces (exact exports later tasks import from `./scoringService`):
  - `export const NEUTRAL_PRESSURE: PressureData` (already defined, add `export`)
  - `export const NEUTRAL_WIND: WindData` (add `export`)
  - `export const NEUTRAL_SKY: SkyData` (add `export`)
  - `export function formatHourLabel(h: number): string` (add `export`)
  - `export function formatHourTime(h: number): string` (add `export`)
  - `export function getHourlySolunar(solunar: SolunarData, hour: number): ScoringInputs['solunar']` (add `export`)
  - `export function skyIconFor(cloudCover: number, rainChance: number): SkyData['icon']` (new)

- [ ] **Step 1: Write the failing test**

Add to `__tests__/scoringService.test.ts`:

```ts
import { skyIconFor } from '../services/scoringService'

describe('skyIconFor', () => {
  it('maps cloud cover and rain chance to icons', () => {
    expect(skyIconFor(80, 0)).toBe('overcast')
    expect(skyIconFor(50, 0)).toBe('partly-cloudy')
    expect(skyIconFor(10, 0)).toBe('clear')
    expect(skyIconFor(10, 35)).toBe('light-rain')
    expect(skyIconFor(10, 65)).toBe('heavy-rain')
  })
})
```

(Place the import at the top with the existing imports; the describe block at file bottom.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/scoringService.test.ts --no-coverage`
Expected: FAIL — `skyIconFor` is not exported.

- [ ] **Step 3: Implement**

In `services/scoringService.ts`:

1. Add `export` before the three neutral constants, `formatHourLabel`, `formatHourTime`, and `getHourlySolunar`.
2. Add the new pure function and use it inside `getHourlySky`:

```ts
export function skyIconFor(cloudCover: number, rainChance: number): SkyData['icon'] {
  let icon: SkyData['icon'] = cloudCover > 70 ? 'overcast' :
    cloudCover > 30 ? 'partly-cloudy' : 'clear'
  if (rainChance >= 60) icon = 'heavy-rain'
  else if (rainChance >= 30) icon = 'light-rain'
  return icon
}
```

In `getHourlySky`, replace the three lines that compute `icon` (the `let icon: SkyData['icon'] = ...` through `else if (rainChance >= 30) icon = 'light-rain'`) with:

```ts
  const icon = skyIconFor(period.cloudCover, rainChance)
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/scoringService.ts __tests__/scoringService.test.ts
git commit -m "refactor: export scoring helpers for reuse by forecastService"
```

---

### Task 2: NOAA 7-day tide predictions (`fetchTideWeek`)

**Files:**
- Modify: `services/noaaService.ts` (new export at bottom)
- Create: `__tests__/fixtures/noaaWeekCurve.json`, `__tests__/fixtures/noaaWeekHilo.json`
- Test: `__tests__/noaaService.test.ts`

**Interfaces:**
- Consumes: existing `BASE`, `COMMON`, `fetchProduct`, `formatNoaaTime` in the same file.
- Produces:

```ts
export interface TideWeek {
  curvesByDate: Record<string, number[]>   // 'YYYY-MM-DD' -> 24 hourly heights (ft)
  eventsByDate: Record<string, TideEvent[]>
}
export function fetchTideWeek(stationId: string): Promise<TideWeek | null>
```

- [ ] **Step 1: Create the fixtures**

`__tests__/fixtures/noaaWeekCurve.json`:

```json
{
  "predictions": [
    { "t": "2026-07-01 00:00", "v": "1.2" },
    { "t": "2026-07-01 01:00", "v": "1.8" },
    { "t": "2026-07-01 02:00", "v": "2.5" },
    { "t": "2026-07-02 00:00", "v": "0.9" },
    { "t": "2026-07-02 01:00", "v": "1.4" }
  ]
}
```

`__tests__/fixtures/noaaWeekHilo.json`:

```json
{
  "predictions": [
    { "t": "2026-07-01 04:12", "v": "5.1", "type": "H" },
    { "t": "2026-07-01 10:45", "v": "0.4", "type": "L" },
    { "t": "2026-07-02 05:02", "v": "4.8", "type": "H" }
  ]
}
```

- [ ] **Step 2: Write the failing tests**

Add to `__tests__/noaaService.test.ts` (new top-level describe; also add `fetchTideWeek` to the import from `'../services/noaaService'`):

```ts
const weekCurveFixture = require('./fixtures/noaaWeekCurve.json')
const weekHiloFixture = require('./fixtures/noaaWeekHilo.json')

describe('fetchTideWeek', () => {
  beforeEach(() => { global.fetch = jest.fn() })

  function mockWeek() {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => weekCurveFixture })
      .mockResolvedValueOnce({ ok: true, json: async () => weekHiloFixture })
  }

  it('requests a 168-hour range with datum and lst_ldt', async () => {
    mockWeek()
    await fetchTideWeek('9415020')
    const urls = (global.fetch as jest.Mock).mock.calls.map(c => c[0] as string)
    expect(urls).toHaveLength(2)
    for (const url of urls) {
      expect(url).toContain('begin_date=')
      expect(url).toContain('range=168')
      expect(url).toContain('datum=MLLW')
      expect(url).toContain('time_zone=lst_ldt')
      expect(url).toContain('product=predictions')
    }
    expect(urls[0]).toContain('interval=h')
    expect(urls[1]).toContain('interval=hilo')
  })

  it('groups hourly curve and events by local date', async () => {
    mockWeek()
    const week = await fetchTideWeek('9415020')
    expect(week).not.toBeNull()
    expect(Object.keys(week!.curvesByDate).sort()).toEqual(['2026-07-01', '2026-07-02'])
    expect(week!.curvesByDate['2026-07-01']).toHaveLength(24)
    expect(week!.curvesByDate['2026-07-01'][1]).toBeCloseTo(1.8, 1)
    expect(week!.eventsByDate['2026-07-01']).toHaveLength(2)
    expect(week!.eventsByDate['2026-07-01'][0].type).toBe('high')
    expect(week!.eventsByDate['2026-07-02']).toHaveLength(1)
  })

  it('returns null when the curve product fails', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => require('./fixtures/noaaMissingProduct.json') })
      .mockResolvedValueOnce({ ok: true, json: async () => weekHiloFixture })
    const week = await fetchTideWeek('9415020')
    expect(week).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/noaaService.test.ts --no-coverage`
Expected: FAIL — `fetchTideWeek` is not exported.

- [ ] **Step 4: Implement**

Add at the bottom of `services/noaaService.ts`:

```ts
export interface TideWeek {
  curvesByDate: Record<string, number[]>
  eventsByDate: Record<string, TideEvent[]>
}

function localDateOf(t: string): string {
  // NOAA t format: 'YYYY-MM-DD HH:mm'
  return t.split(' ')[0]
}

export async function fetchTideWeek(stationId: string): Promise<TideWeek | null> {
  const now = new Date()
  const beginDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const base = buildUrl(stationId, 'predictions', `&begin_date=${beginDate}&range=168&datum=MLLW`)

  const [curveRes, hiloRes] = await Promise.allSettled([
    fetchProduct(`${base}&interval=h`),
    fetchProduct(`${base}&interval=hilo`),
  ])
  const curveData = curveRes.status === 'fulfilled' ? curveRes.value : null
  const hiloData = hiloRes.status === 'fulfilled' ? hiloRes.value : null
  if (!curveData?.predictions) return null

  const curvesByDate: Record<string, number[]> = {}
  for (const p of curveData.predictions) {
    const key = localDateOf(p.t)
    const hour = parseInt((p.t.split(' ')[1] ?? '0:00').split(':')[0], 10)
    if (!curvesByDate[key]) curvesByDate[key] = new Array(24).fill(0)
    if (hour >= 0 && hour < 24) curvesByDate[key][hour] = parseFloat(p.v) || 0
  }

  const eventsByDate: Record<string, TideEvent[]> = {}
  for (const p of hiloData?.predictions ?? []) {
    const key = localDateOf(p.t)
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push({
      type: (p.type === 'H' ? 'high' : 'low') as 'high' | 'low',
      time: formatNoaaTime(p.t),
      height: parseFloat(p.v),
    })
  }

  return { curvesByDate, eventsByDate }
}
```

- [ ] **Step 5: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/noaaService.ts __tests__/noaaService.test.ts __tests__/fixtures/noaaWeekCurve.json __tests__/fixtures/noaaWeekHilo.json
git commit -m "feat: fetchTideWeek returns 7 days of tide curves and events grouped by date"
```

---

### Task 3: Extend `DayForecast` type and delete `MOCK_FORECAST`

**Files:**
- Modify: `types/conditions.ts` (`DayForecast`)
- Modify: `data/mockData.ts` (delete `MOCK_FORECAST` and its `DayForecast` import)

**Interfaces:**
- Produces (exact type — Tasks 4–7 depend on every field name):

```ts
export interface DayForecast {
  date: string                      // 'YYYY-MM-DD'
  dayLabel: string                  // 'Today', 'Thu', ...
  peakScore: number
  scoreLabel: string
  peakWindow: { start: string; end: string }
  hourlyScores: HourlyScore[]       // 24 entries
  tideEvents: TideEvent[]
  sun: SunData
}
```

- [ ] **Step 1: Update the type**

In `types/conditions.ts`, replace the `DayForecast` interface with the block above (it sits below `HourlyScore`; `TideEvent` and `SunData` are already defined in the same file).

- [ ] **Step 2: Delete `MOCK_FORECAST`**

In `data/mockData.ts`, delete the whole `export const MOCK_FORECAST: DayForecast[] = [...]` block and remove `DayForecast` from the imports. (Phase 1 already guaranteed no production file imports it; run `grep -rn "MOCK_FORECAST" . --include="*.ts*" -l | grep -v node_modules` — expected: no output.)

- [ ] **Step 3: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add types/conditions.ts data/mockData.ts
git commit -m "feat: extend DayForecast with hourly scores, tides, and sun; drop MOCK_FORECAST"
```

---

### Task 4: `forecastService` — real implementation

**Files:**
- Rewrite: `services/forecastService.ts` (currently a 6-line stub that throws)
- Create: `__tests__/forecastService.test.ts`

**Interfaces:**
- Consumes: `fetchNwsData`/`NwsData` (nwsService), `fetchTideWeek`/`TideWeek` (noaaService), `calculateSolunar` (solunarService), `calculateScore`/`scoreLabel` (scoringEngine), `detectPhase`/`hoursFromLastTurn` (tideUtils), and Task 1's scoringService exports.
- Produces:
  - `export function buildForecastDays(nws: NwsData | null, tideWeek: TideWeek | null, spot: Spot, now: Date): DayForecast[]` (pure, fully testable)
  - `export function fetchForecast(spot: Spot): Promise<DayForecast[]>` (network wrapper; each source failure degrades to null, never throws)

- [ ] **Step 1: Write the failing tests**

Create `__tests__/forecastService.test.ts`:

```ts
import { buildForecastDays } from '../services/forecastService'
import type { NwsData } from '../services/nwsService'
import type { TideWeek } from '../services/noaaService'
import type { Spot } from '../types/spot'

const SALT_SPOT: Spot = {
  id: 'spot_1', name: 'Bodega Bay', lat: 38.33, lng: -123.05,
  type: 'saltwater', stationId: '9415020', region: 'west_coast',
}
const FRESH_SPOT: Spot = { ...SALT_SPOT, id: 'spot_2', type: 'freshwater', stationId: null }

const NOW = new Date('2026-07-01T08:00:00')

function hourEpoch(dayOffset: number, hour: number): number {
  const d = new Date(NOW)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}

// 48 hours of NWS coverage (days 0–1 only, like a short NWS response)
const NWS: NwsData = {
  air: { temp: 62, high: 67, low: 52, humidity: 78, unit: '°F' },
  sky: { condition: 'Partly Cloudy', rainChance: 15, icon: 'partly-cloudy' },
  wind: { speed: 10, gusts: 15, direction: 225, directionLabel: 'SW', unit: 'mph' },
  hourlyForecast: Array.from({ length: 48 }, (_, i) => ({
    hour: i % 24,
    epochMs: hourEpoch(Math.floor(i / 24), i % 24),
    windSpeed: 8,
    cloudCover: 50,
    rainChance: 10,
    windDirection: 'SW',
  })),
}

function dateKey(dayOffset: number): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() + dayOffset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TIDE_WEEK: TideWeek = {
  curvesByDate: Object.fromEntries(
    Array.from({ length: 7 }, (_, d) => [
      dateKey(d),
      Array.from({ length: 24 }, (_, h) => 2 + 2 * Math.sin((h / 24) * Math.PI * 4)),
    ])
  ),
  eventsByDate: {
    [dateKey(0)]: [{ type: 'high', time: '4:12 AM', height: 5.1 }],
  },
}

describe('buildForecastDays', () => {
  it('returns 7 days, first labeled Today', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days).toHaveLength(7)
    expect(days[0].dayLabel).toBe('Today')
    expect(days[0].date).toBe(dateKey(0))
    expect(days[1].dayLabel).not.toBe('Today')
  })

  it('every day has 24 hourly scores in 0–100', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    for (const day of days) {
      expect(day.hourlyScores).toHaveLength(24)
      for (const h of day.hourlyScores) {
        expect(h.score).toBeGreaterThanOrEqual(0)
        expect(h.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('days beyond NWS coverage still produce scores (neutral weather fill)', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days[6].peakScore).toBeGreaterThan(0)
    expect(days[6].peakWindow.start).toBeTruthy()
  })

  it('freshwater spots work without tide data', () => {
    const days = buildForecastDays(NWS, null, FRESH_SPOT, NOW)
    expect(days).toHaveLength(7)
    expect(days[0].tideEvents).toEqual([])
    expect(days[0].peakScore).toBeGreaterThan(0)
  })

  it('passes tide events through for matching dates', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days[0].tideEvents).toHaveLength(1)
    expect(days[0].tideEvents[0].type).toBe('high')
    expect(days[1].tideEvents).toEqual([])
  })

  it('includes sunrise/sunset per day', () => {
    const days = buildForecastDays(NWS, TIDE_WEEK, SALT_SPOT, NOW)
    expect(days[0].sun.sunrise).toMatch(/\d+:\d{2} (AM|PM)/)
    expect(days[3].sun.sunset).toMatch(/\d+:\d{2} (AM|PM)/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/forecastService.test.ts --no-coverage`
Expected: FAIL — `buildForecastDays` doesn't exist (stub throws).

- [ ] **Step 3: Implement**

Replace `services/forecastService.ts` entirely with:

```ts
import { calculateScore, scoreLabel } from '../features/score/scoringEngine'
import { detectPhase, hoursFromLastTurn } from '../features/tide/tideUtils'
import { calculateSolunar } from './solunarService'
import { fetchNwsData } from './nwsService'
import type { NwsData } from './nwsService'
import { fetchTideWeek } from './noaaService'
import type { TideWeek } from './noaaService'
import {
  NEUTRAL_PRESSURE, NEUTRAL_WIND,
  formatHourLabel, formatHourTime, getHourlySolunar, skyIconFor,
} from './scoringService'
import type { DayForecast, HourlyScore } from '../types/conditions'
import type { Spot } from '../types/spot'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function buildForecastDays(
  nws: NwsData | null,
  tideWeek: TideWeek | null,
  spot: Spot,
  now: Date
): DayForecast[] {
  const days: DayForecast[] = []
  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(now)
    dayDate.setDate(dayDate.getDate() + d)
    dayDate.setHours(12, 0, 0, 0)
    const dateKey = localDateKey(dayDate)
    const solunar = calculateSolunar(spot.lat, spot.lng, dayDate)
    const curve = tideWeek?.curvesByDate[dateKey] ?? null

    const hourlyScores: HourlyScore[] = []
    for (let h = 0; h < 24; h++) {
      const target = new Date(dayDate)
      target.setHours(h, 0, 0, 0)
      const period = nws?.hourlyForecast.find(
        p => Math.abs(p.epochMs - target.getTime()) < 30 * 60 * 1000
      ) ?? null
      hourlyScores.push({
        hour: formatHourLabel(h),
        hourIndex: h,
        score: calculateScore({
          // Pressure is not forecastable from our free sources — future days score neutral.
          pressure: { value: NEUTRAL_PRESSURE.value, trend: NEUTRAL_PRESSURE.trend, rate: NEUTRAL_PRESSURE.rate },
          tide: curve
            ? { phase: detectPhase(curve, h), hoursFromTurn: hoursFromLastTurn(curve, h) }
            : null,
          waterTemp: { value: spot.type === 'saltwater' ? 65 : 68, spotType: spot.type },
          spotType: spot.type,
          solunar: getHourlySolunar(solunar, h),
          wind: { speed: period ? period.windSpeed : NEUTRAL_WIND.speed },
          sky: { condition: period ? skyIconFor(period.cloudCover, period.rainChance) : 'partly-cloudy' },
        }),
      })
    }

    let peak = {
      start: formatHourTime(0),
      end: formatHourTime(2),
      score: Math.round((hourlyScores[0].score + hourlyScores[1].score + hourlyScores[2].score) / 3),
    }
    for (let i = 1; i <= 21; i++) {
      const avg = Math.round(
        (hourlyScores[i].score + hourlyScores[i + 1].score + hourlyScores[i + 2].score) / 3
      )
      if (avg > peak.score) peak = { start: formatHourTime(i), end: formatHourTime(i + 2), score: avg }
    }

    days.push({
      date: dateKey,
      dayLabel: d === 0 ? 'Today' : DAY_LABELS[dayDate.getDay()],
      peakScore: peak.score,
      scoreLabel: scoreLabel(peak.score),
      peakWindow: { start: peak.start, end: peak.end },
      hourlyScores,
      tideEvents: tideWeek?.eventsByDate[dateKey] ?? [],
      sun: solunar.sun,
    })
  }
  return days
}

export async function fetchForecast(spot: Spot): Promise<DayForecast[]> {
  const [nws, tideWeek] = await Promise.all([
    fetchNwsData(spot).catch(() => null),
    spot.stationId ? fetchTideWeek(spot.stationId).catch(() => null) : Promise.resolve<TideWeek | null>(null),
  ])
  return buildForecastDays(nws, tideWeek, spot, new Date())
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/forecastService.ts __tests__/forecastService.test.ts
git commit -m "feat: real 7-day forecast from NOAA tides, NWS hourly, and solunar"
```

---

### Task 5: `useForecast` — real TanStack query

**Files:**
- Rewrite: `hooks/useForecast.ts`
- Modify: `app/(tabs)/index.tsx` (destructure new fields, refetch on pull-to-refresh)

**Interfaces:**
- Consumes: `fetchForecast` from Task 4.
- Produces: `useForecast(spot: Spot | null): { data: DayForecast[]; isLoading: boolean; isError: boolean; refetch: () => void }` — `data` is `[]` until resolved (never undefined).

- [ ] **Step 1: Replace `hooks/useForecast.ts` entirely with:**

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchForecast } from '../services/forecastService'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseForecastResult {
  data: DayForecast[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export function useForecast(spot: Spot | null): UseForecastResult {
  const query = useQuery({
    queryKey: ['forecast', spot?.id, todayKey()],
    queryFn: () => fetchForecast(spot!),
    enabled: !!spot,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => { query.refetch() },
  }
}
```

- [ ] **Step 2: Wire refetch into the dashboard**

In `app/(tabs)/index.tsx`:

1. Replace `const { data: forecast } = useForecast(activeSpot)` with:

```ts
  const {
    data: forecast, isLoading: forecastLoading, isError: forecastError, refetch: refetchForecast,
  } = useForecast(activeSpot)
```

2. Update the `RefreshControl`'s `onRefresh` to refresh both:

```tsx
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !!conditions}
            onRefresh={() => { refetch(); refetchForecast() }}
            tintColor={Colors.accent}
          />
        }
```

(`forecastLoading`/`forecastError` are consumed by Task 6's ForecastStrip props — TypeScript will flag them unused until then; to keep the suite green, pass them now as shown in Task 6 Step 3, or do Tasks 5 and 6 in one working tree before committing. Preferred: implement Task 5 and Task 6 Steps 1–3 together, then run tests, then make the two commits in order.)

- [ ] **Step 3: Commit** (after Task 6 Step 3 makes the props line up — see note above)

```bash
git add hooks/useForecast.ts
git commit -m "feat: useForecast fetches the real 7-day forecast with 6h cache"
```

---

### Task 6: ForecastStrip — teaser gate, skeletons, day tap

Free users see today + tomorrow with real scores; days 3–7 render locked. All 7 unlock with `isPro`.

**Files:**
- Rewrite: `features/forecast/ForecastStrip.tsx`
- Modify: `app/(tabs)/index.tsx` (props + day navigation)
- Create: `__tests__/ForecastStrip.test.tsx`

**Interfaces:**
- Consumes: `DayForecast` (Task 3), `ProWaitlistSheet` opening via `onUpgrade` (owned by the dashboard, Phase 1).
- Produces:

```ts
interface Props {
  forecast: DayForecast[]
  isLoading: boolean
  isError: boolean
  isPro: boolean
  onRetry: () => void
  onUpgrade: () => void
  onDayPress: (day: DayForecast) => void
}
```

`FREE_DAYS = 2` (day indexes 0 and 1 unlocked for free users).

- [ ] **Step 1: Write the failing test**

Create `__tests__/ForecastStrip.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ForecastStrip } from '../features/forecast/ForecastStrip'
import type { DayForecast } from '../types/conditions'

const DAYS: DayForecast[] = Array.from({ length: 7 }, (_, d) => ({
  date: `2026-07-0${d + 1}`,
  dayLabel: d === 0 ? 'Today' : `D${d}`,
  peakScore: 60 + d,
  scoreLabel: 'Decent — pick your window',
  peakWindow: { start: '6:00 AM', end: '8:00 AM' },
  hourlyScores: [],
  tideEvents: [],
  sun: { sunrise: '5:50 AM', sunset: '8:30 PM' },
}))

const noop = () => {}

describe('ForecastStrip', () => {
  it('locks days 3–7 for free users', () => {
    const { getAllByTestId, queryAllByTestId } = render(
      <ForecastStrip forecast={DAYS} isLoading={false} isError={false} isPro={false}
        onRetry={noop} onUpgrade={noop} onDayPress={noop} />
    )
    expect(getAllByTestId('day-locked')).toHaveLength(5)
    expect(queryAllByTestId('day-unlocked')).toHaveLength(2)
  })

  it('unlocks all 7 days for Pro', () => {
    const { queryAllByTestId } = render(
      <ForecastStrip forecast={DAYS} isLoading={false} isError={false} isPro={true}
        onRetry={noop} onUpgrade={noop} onDayPress={noop} />
    )
    expect(queryAllByTestId('day-locked')).toHaveLength(0)
    expect(queryAllByTestId('day-unlocked')).toHaveLength(7)
  })

  it('locked day tap calls onUpgrade; unlocked tap calls onDayPress', () => {
    const onUpgrade = jest.fn()
    const onDayPress = jest.fn()
    const { getAllByTestId } = render(
      <ForecastStrip forecast={DAYS} isLoading={false} isError={false} isPro={false}
        onRetry={noop} onUpgrade={onUpgrade} onDayPress={onDayPress} />
    )
    fireEvent.press(getAllByTestId('day-locked')[0])
    expect(onUpgrade).toHaveBeenCalled()
    fireEvent.press(getAllByTestId('day-unlocked')[0])
    expect(onDayPress).toHaveBeenCalledWith(DAYS[0])
  })

  it('shows a retry row on error', () => {
    const onRetry = jest.fn()
    const { getByText } = render(
      <ForecastStrip forecast={[]} isLoading={false} isError={true} isPro={false}
        onRetry={onRetry} onUpgrade={noop} onDayPress={noop} />
    )
    fireEvent.press(getByText('Could not load forecast — tap to retry'))
    expect(onRetry).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/ForecastStrip.test.tsx --no-coverage`
Expected: FAIL — props mismatch.

- [ ] **Step 3: Rewrite `features/forecast/ForecastStrip.tsx` entirely with:**

```tsx
import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from '../score/scoringEngine'
import type { DayForecast } from '../../types/conditions'

const FREE_DAYS = 2

interface Props {
  forecast: DayForecast[]
  isLoading: boolean
  isError: boolean
  isPro: boolean
  onRetry: () => void
  onUpgrade: () => void
  onDayPress: (day: DayForecast) => void
}

export function ForecastStrip({ forecast, isLoading, isError, isPro, onRetry, onUpgrade, onDayPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>7-Day Forecast</Text>

      {isError && forecast.length === 0 && (
        <TouchableOpacity style={styles.errorRow} onPress={onRetry}>
          <Text style={styles.errorText}>Could not load forecast — tap to retry</Text>
        </TouchableOpacity>
      )}

      {isLoading && forecast.length === 0 && !isError && (
        <View style={styles.scrollRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={[styles.dayCard, styles.skeleton]} testID="day-skeleton" />
          ))}
        </View>
      )}

      {forecast.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {forecast.map((day, i) => {
            const locked = !isPro && i >= FREE_DAYS
            if (locked) {
              return (
                <TouchableOpacity
                  key={day.date}
                  testID="day-locked"
                  style={[styles.dayCard, styles.lockedCard]}
                  onPress={onUpgrade}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <View style={styles.lockBadge}>
                    <Text style={styles.lockGlyph}>🔒</Text>
                  </View>
                  <Text style={styles.window}>Pro</Text>
                </TouchableOpacity>
              )
            }
            const color = scoreColor(day.peakScore)
            return (
              <TouchableOpacity
                key={day.date}
                testID="day-unlocked"
                style={styles.dayCard}
                onPress={() => onDayPress(day)}
                activeOpacity={0.7}
              >
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                <View style={[styles.scoreBadge, { borderColor: color }]}>
                  <Text style={[styles.scoreText, { color }]}>{day.peakScore}</Text>
                </View>
                <Text style={styles.window}>{day.peakWindow.start}</Text>
                <Text style={styles.window}>–{day.peakWindow.end}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  scroll: { gap: Spacing.sm },
  scrollRow: { flexDirection: 'row', gap: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.sm, alignItems: 'center', minWidth: 72,
  },
  lockedCard: { opacity: 0.55 },
  skeleton: { height: 96, flex: 1 },
  dayLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  scoreBadge: { borderWidth: 1.5, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { borderWidth: 1.5, borderColor: Colors.textTertiary, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  lockGlyph: { fontSize: 16 },
  scoreText: { fontSize: 15, fontWeight: '700' },
  window: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  errorRow: { backgroundColor: Colors.card, borderRadius: Spacing.cardRadius, padding: Spacing.md, alignItems: 'center' },
  errorText: { fontSize: 13, color: Colors.textSecondary },
})
```

Update the call site in `app/(tabs)/index.tsx`:

```tsx
            <ForecastStrip
              forecast={forecast}
              isLoading={forecastLoading}
              isError={forecastError}
              isPro={isPro}
              onRetry={refetchForecast}
              onUpgrade={() => setShowWaitlist(true)}
              onDayPress={(day) => router.push({
                pathname: '/detail/day' as any,
                params: { data: JSON.stringify(day) },
              })}
            />
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS. Now make the Task 5 commit, then:

- [ ] **Step 5: Commit**

```bash
git add features/forecast/ForecastStrip.tsx "app/(tabs)/index.tsx" __tests__/ForecastStrip.test.tsx
git commit -m "feat: forecast strip with real scores, teaser gate, skeletons, and retry"
```

---

### Task 7: Day detail modal

**Files:**
- Create: `app/detail/day.tsx`
- Modify: `app/_layout.tsx` (register route)
- Modify: `features/score/ScoreTimeline.tsx` (optional `title` prop)

**Interfaces:**
- Consumes: `DayForecast` passed as JSON route param `data` (pattern copied from `app/detail/wind.tsx`), `ScoreDisplay`, `ScoreTimeline` with `currentHour={null}`.
- Produces: route `/detail/day`.

- [ ] **Step 1: Add the optional title prop to ScoreTimeline**

In `features/score/ScoreTimeline.tsx`, change the Props interface and title line:

```ts
interface Props {
  hourlyScores: HourlyScore[]
  currentHour: number | null
  title?: string
}
```

```tsx
export function ScoreTimeline({ hourlyScores, currentHour, title = "Today's Forecast" }: Props) {
```

```tsx
      <Text style={styles.sectionTitle}>{title}</Text>
```

- [ ] **Step 2: Create `app/detail/day.tsx`**

```tsx
import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { ScoreDisplay } from '../../features/score/ScoreDisplay'
import { ScoreTimeline } from '../../features/score/ScoreTimeline'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { DayForecast } from '../../types/conditions'

export default function DayDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  let day: DayForecast | null = null
  try {
    day = data ? JSON.parse(data) : null
  } catch {
    day = null
  }
  if (!day || !day.hourlyScores) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Could not load day details</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.dayTitle}>{day.dayLabel} · {day.date}</Text>
      <ScoreDisplay
        score={day.peakScore}
        label={day.scoreLabel}
        bestWindow={{ ...day.peakWindow, score: day.peakScore }}
      />
      <ScoreTimeline hourlyScores={day.hourlyScores} currentHour={null} title="Hourly Scores" />
      {day.tideEvents.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tides</Text>
          {day.tideEvents.map((ev, i) => (
            <View key={i} style={styles.tideRow}>
              <Text style={styles.tideType}>{ev.type === 'high' ? '▲ High' : '▼ Low'}</Text>
              <Text style={styles.tideTime}>{ev.time}</Text>
              <Text style={styles.tideHeight}>{ev.height.toFixed(1)} ft</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sun</Text>
        <Text style={styles.sunText}>↑ {day.sun.sunrise}    ↓ {day.sun.sunset}</Text>
      </View>
      <Text style={styles.note}>
        Forecast scores assume neutral pressure — check back on the day for the full picture.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { paddingVertical: Spacing.md, paddingBottom: Spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  dayTitle: {
    fontSize: 18, fontWeight: '700', color: Colors.textPrimary,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad, marginBottom: Spacing.md, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  tideRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  tideType: { fontSize: 14, color: Colors.textPrimary, width: 80 },
  tideTime: { fontSize: 14, color: Colors.textSecondary, flex: 1 },
  tideHeight: { fontSize: 14, color: Colors.textSecondary },
  sunText: { fontSize: 14, color: Colors.textSecondary },
  note: {
    fontSize: 11, color: Colors.textTertiary, textAlign: 'center',
    marginHorizontal: Spacing.screenPad,
  },
})
```

- [ ] **Step 3: Register the route**

In `app/_layout.tsx`, after the `detail/pressure` screen, add:

```tsx
        <Stack.Screen
          name="detail/day"
          options={{ title: 'Day Forecast', presentation: 'modal', headerShown: true }}
        />
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/detail/day.tsx app/_layout.tsx features/score/ScoreTimeline.tsx
git commit -m "feat: day detail modal with hourly scores, tides, and sun times"
```

---

### Task 8: "Tomorrow looks better" handoff on the dashboard

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `conditions.bestWindow` (with `passed`), `forecast: DayForecast[]`, `isPro`.
- Produces: UI only.

- [ ] **Step 1: Implement**

In `app/(tabs)/index.tsx`, add below the `scoredSpecies` memo:

```ts
  const betterDay = useMemo(() => {
    if (!conditions || forecast.length < 2) return null
    const todayIsFine = !conditions.bestWindow.passed && conditions.bestWindow.score >= 55
    if (todayIsFine) return null
    // Only recommend days the user can actually open (free: tomorrow only)
    const visible = isPro ? forecast.slice(1) : forecast.slice(1, 2)
    return visible.find(d => d.peakScore >= 70) ?? null
  }, [conditions, forecast, isPro])
```

Then, directly after the `<ScoreDisplay ... />` element, add:

```tsx
            {betterDay && (
              <Text
                style={styles.betterDay}
                onPress={() => router.push({
                  pathname: '/detail/day' as any,
                  params: { data: JSON.stringify(betterDay) },
                })}
              >
                {betterDay.dayLabel} looks better — {betterDay.peakScore} at {betterDay.peakWindow.start}–{betterDay.peakWindow.end} ›
              </Text>
            )}
```

and add to styles:

```ts
  betterDay: {
    fontSize: 13, color: Colors.accent, textAlign: 'center',
    marginTop: -4, marginBottom: Spacing.md,
  },
```

- [ ] **Step 2: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: dashboard suggests a better upcoming day when today is poor"
```

---

### Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the stale sections**

1. **File Map**: change `forecastService.ts` line to: `forecastService.ts    7-day forecast — buildForecastDays() runs calculateScore per hour per day; neutral pressure for future days` and `useForecast.ts` line to: `useForecast.ts         TanStack query over fetchForecast (6h stale, keyed by spot + date)`.
2. **useConditions query table**: the forecast row from Phase 1 becomes: `Forecast | ['forecast', spot.id, 'YYYY-MM-DD'] | 6 hr | 24 hr`.
3. **What's Next**: remove the Phase B2 bullet (done); leave Phase C. Remove the line "`forecastService.ts` currently throws".
4. Add to **Key Patterns**: `Teaser gate: free users see forecast days 0–1; days 2–6 locked behind ProWaitlistSheet (FREE_DAYS const in ForecastStrip).`

- [ ] **Step 2: Final check and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for real 7-day forecast"
```
