# FishCast UX Overhaul — Phase 1: Data Correctness & Trust Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the NOAA integration actually work in production (it currently fails on every request), and remove every place the app lies to the user (mock forecast data, past tide events, past "best windows", fabricated water temps, dead settings).

**Architecture:** No structural changes. All fixes are inside existing files: `services/noaaService.ts` (request params + parsing), `services/scoringService.ts` (24-hour scoring + future-aware best window), `hooks/useForecast.ts` (remove mock), and the Forecast screen/components. One new component: `components/ProWaitlistSheet.tsx`.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript strict, TanStack Query v5, Zustand v5, Jest + React Native Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-01-ux-overhaul-design.md` (read the Audit Summary section for why each fix exists).

## Global Constraints

- Run `npx jest --no-coverage` AND `npx tsc --noEmit` before every commit. Both must be clean.
- Known pre-existing TS error `app/(tabs)/spots.tsx(63,27)` is expected — do NOT fix it, do NOT introduce new errors.
- No new npm dependencies.
- Dark theme only; use `theme/colors.ts` (`Colors.*`) and `theme/spacing.ts` (`Spacing.*`) constants, never raw hex/numbers in components.
- Copy (user-facing strings) must match this plan exactly.
- Commit after every task with the message given in the task.
- Test fixtures MUST match the live NOAA API shape: timestamps ascending (oldest first), pressure in millibars, wind in knots. This was verified against the live API on 2026-07-01 — hand-written fixtures with wrong assumptions caused the production bugs this phase fixes.

---

### Task 1: Fix NOAA request parameters

The live API rejects every request the app makes: `time_zone=LST/LDT` must be `lst_ldt`, and the `predictions` product requires `datum=MLLW`. Observational products should use trailing-hour ranges instead of `date=today` so "current" readings are actually current.

**Files:**
- Modify: `services/noaaService.ts` (lines 13–18 and 97–103)
- Test: `__tests__/noaaService.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: unchanged signature `fetchNoaaData(spot: Spot): Promise<NoaaData>`; internally requests now use `time_zone=lst_ldt`, `datum=MLLW` on predictions, and `range=N` (no `date=today`) on observational products. The fetch-call order stays: hilo predictions, hourly predictions, water_temperature, wind, air_pressure — tests mock in this order.

- [ ] **Step 1: Write the failing test**

Add to the `describe('fetchNoaaData', ...)` block in `__tests__/noaaService.test.ts`:

```ts
  it('requests products with lst_ldt time zone and MLLW datum on predictions', async () => {
    mockAllProducts()
    await fetchNoaaData(SPOT)
    const urls = (global.fetch as jest.Mock).mock.calls.map(c => c[0] as string)
    expect(urls).toHaveLength(5)
    for (const url of urls) {
      expect(url).toContain('time_zone=lst_ldt')
      expect(url).not.toContain('LST/LDT')
    }
    // predictions (hilo, then hourly) need datum and date=today
    expect(urls[0]).toContain('product=predictions')
    expect(urls[0]).toContain('interval=hilo')
    expect(urls[0]).toContain('datum=MLLW')
    expect(urls[0]).toContain('date=today')
    expect(urls[1]).toContain('interval=h')
    expect(urls[1]).toContain('datum=MLLW')
    // observational products use trailing ranges, never date=today
    expect(urls[2]).toContain('product=water_temperature')
    expect(urls[2]).toContain('range=2')
    expect(urls[2]).not.toContain('date=today')
    expect(urls[3]).toContain('product=wind')
    expect(urls[3]).toContain('range=2')
    expect(urls[3]).not.toContain('date=today')
    expect(urls[4]).toContain('product=air_pressure')
    expect(urls[4]).toContain('range=7')
    expect(urls[4]).not.toContain('date=today')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/noaaService.test.ts --no-coverage`
Expected: FAIL — the new test fails on `time_zone=lst_ldt` (current code sends `LST/LDT`). All other tests still pass.

- [ ] **Step 3: Implement**

In `services/noaaService.ts`, replace:

```ts
const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
const COMMON = 'time_zone=LST/LDT&units=english&format=json'

function buildUrl(station: string, product: string, extra = ''): string {
  return `${BASE}?station=${station}&date=today&${COMMON}&product=${product}${extra}`
}
```

with:

```ts
const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
// Verified against the live API 2026-07-01: time_zone must be lst_ldt (LST/LDT is rejected)
const COMMON = 'time_zone=lst_ldt&units=english&format=json'

function buildUrl(station: string, product: string, extra = ''): string {
  return `${BASE}?station=${station}&${COMMON}&product=${product}${extra}`
}
```

and replace the `Promise.allSettled` block in `fetchNoaaData`:

```ts
  const [hiLoRes, curveRes, tempRes, windRes, pressureRes] = await Promise.allSettled([
    fetchProduct(buildUrl(id, 'predictions', '&date=today&datum=MLLW&interval=hilo')),
    fetchProduct(buildUrl(id, 'predictions', '&date=today&datum=MLLW&interval=h')),
    fetchProduct(buildUrl(id, 'water_temperature', '&range=2')),
    fetchProduct(buildUrl(id, 'wind', '&range=2')),
    fetchProduct(buildUrl(id, 'air_pressure', '&range=7')),
  ])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/noaaService.test.ts --no-coverage`
Expected: PASS (all tests).

- [ ] **Step 5: Live smoke check (no code change)**

Run these and confirm each returns JSON with a `predictions` or `data` array (NOT an `error` object):

```bash
curl -s "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&time_zone=lst_ldt&units=english&format=json&product=predictions&date=today&datum=MLLW&interval=hilo" | head -c 200
curl -s "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9414290&time_zone=lst_ldt&units=english&format=json&product=air_pressure&range=7" | head -c 200
```

- [ ] **Step 6: Commit**

```bash
git add services/noaaService.ts __tests__/noaaService.test.ts
git commit -m "fix: NOAA requests use lst_ldt time zone, MLLW datum, and trailing ranges"
```

---

### Task 2: Fix NOAA observational parsing (data order + units)

The live API returns observational data **oldest-first** (the code assumed newest-first, inverting the pressure trend), pressure in **millibars** (code assumed inHg), and wind in **knots** (code assumed mph). Fixtures are rewritten to match reality.

**Files:**
- Modify: `services/noaaService.ts` (`parseWind`, `parsePressure`, water temp line in `fetchNoaaData`)
- Rewrite: `__tests__/fixtures/noaaWind.json`, `__tests__/fixtures/noaaWaterTemp.json`, `__tests__/fixtures/noaaAirPressure.json`
- Test: `__tests__/noaaService.test.ts`

**Interfaces:**
- Consumes: Task 1's request params.
- Produces: `NoaaData` unchanged in shape. Semantics now correct: `wind.speed`/`wind.gusts` in mph (converted from knots, rounded to integers), `pressure.value` and `pressure.readings[]` in inHg (converted from mb, 2 decimals), `pressure.readings` = hourly samples oldest-first, `waterTemp` = most recent reading.

- [ ] **Step 1: Rewrite the three fixtures to match the live API**

Replace the entire contents of `__tests__/fixtures/noaaWind.json` with (ascending 6-minute timestamps, speeds in knots):

```json
{
  "metadata": { "id": "9415020", "name": "Point Reyes", "lat": "37.9961", "lon": "-122.9767" },
  "data": [
    { "t": "2026-07-01 13:48", "s": "6.5", "d": "215.0", "dr": "SW", "g": "11.0", "f": "0,0" },
    { "t": "2026-07-01 13:54", "s": "7.0", "d": "222.0", "dr": "SW", "g": "11.8", "f": "0,0" },
    { "t": "2026-07-01 14:00", "s": "7.3", "d": "225.0", "dr": "SW", "g": "12.2", "f": "0,0" }
  ]
}
```

Replace the entire contents of `__tests__/fixtures/noaaWaterTemp.json` with:

```json
{
  "metadata": { "id": "9415020", "name": "Point Reyes", "lat": "37.9961", "lon": "-122.9767" },
  "data": [
    { "t": "2026-07-01 13:54", "v": "57.0", "f": "0,0,0" },
    { "t": "2026-07-01 14:00", "v": "57.2", "f": "0,0,0" }
  ]
}
```

Replace the entire contents of `__tests__/fixtures/noaaAirPressure.json` with (31 ascending 6-minute readings in millibars, falling linearly 1013.00 → 1011.50):

```json
{
  "metadata": { "id": "9415020", "name": "Point Reyes", "lat": "37.9961", "lon": "-122.9767" },
  "data": [
    { "t": "2026-07-01 11:00", "v": "1013.00", "f": "0,0,0" },
    { "t": "2026-07-01 11:06", "v": "1012.95", "f": "0,0,0" },
    { "t": "2026-07-01 11:12", "v": "1012.90", "f": "0,0,0" },
    { "t": "2026-07-01 11:18", "v": "1012.85", "f": "0,0,0" },
    { "t": "2026-07-01 11:24", "v": "1012.80", "f": "0,0,0" },
    { "t": "2026-07-01 11:30", "v": "1012.75", "f": "0,0,0" },
    { "t": "2026-07-01 11:36", "v": "1012.70", "f": "0,0,0" },
    { "t": "2026-07-01 11:42", "v": "1012.65", "f": "0,0,0" },
    { "t": "2026-07-01 11:48", "v": "1012.60", "f": "0,0,0" },
    { "t": "2026-07-01 11:54", "v": "1012.55", "f": "0,0,0" },
    { "t": "2026-07-01 12:00", "v": "1012.50", "f": "0,0,0" },
    { "t": "2026-07-01 12:06", "v": "1012.45", "f": "0,0,0" },
    { "t": "2026-07-01 12:12", "v": "1012.40", "f": "0,0,0" },
    { "t": "2026-07-01 12:18", "v": "1012.35", "f": "0,0,0" },
    { "t": "2026-07-01 12:24", "v": "1012.30", "f": "0,0,0" },
    { "t": "2026-07-01 12:30", "v": "1012.25", "f": "0,0,0" },
    { "t": "2026-07-01 12:36", "v": "1012.20", "f": "0,0,0" },
    { "t": "2026-07-01 12:42", "v": "1012.15", "f": "0,0,0" },
    { "t": "2026-07-01 12:48", "v": "1012.10", "f": "0,0,0" },
    { "t": "2026-07-01 12:54", "v": "1012.05", "f": "0,0,0" },
    { "t": "2026-07-01 13:00", "v": "1012.00", "f": "0,0,0" },
    { "t": "2026-07-01 13:06", "v": "1011.95", "f": "0,0,0" },
    { "t": "2026-07-01 13:12", "v": "1011.90", "f": "0,0,0" },
    { "t": "2026-07-01 13:18", "v": "1011.85", "f": "0,0,0" },
    { "t": "2026-07-01 13:24", "v": "1011.80", "f": "0,0,0" },
    { "t": "2026-07-01 13:30", "v": "1011.75", "f": "0,0,0" },
    { "t": "2026-07-01 13:36", "v": "1011.70", "f": "0,0,0" },
    { "t": "2026-07-01 13:42", "v": "1011.65", "f": "0,0,0" },
    { "t": "2026-07-01 13:48", "v": "1011.60", "f": "0,0,0" },
    { "t": "2026-07-01 13:54", "v": "1011.55", "f": "0,0,0" },
    { "t": "2026-07-01 14:00", "v": "1011.50", "f": "0,0,0" }
  ]
}
```

- [ ] **Step 2: Update the test expectations**

In `__tests__/noaaService.test.ts`, replace these four tests (keep all others unchanged):

```ts
  it('parses wind from the most recent reading, converted knots to mph', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    // last fixture entry: 7.3 kn -> 8 mph, gusts 12.2 kn -> 14 mph
    expect(result.wind?.speed).toBe(8)
    expect(result.wind?.gusts).toBe(14)
    expect(result.wind?.directionLabel).toBe('SW')
    expect(result.wind?.unit).toBe('mph')
  })

  it('parses water temperature from the most recent reading', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    expect(result.waterTemp).toBeCloseTo(57.2, 1)
  })

  it('parses pressure value in inHg from the most recent mb reading', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    // 1011.50 mb * 0.02953 = 29.87 inHg
    expect(result.pressure?.value).toBeCloseTo(29.87, 2)
    expect(result.pressure?.unit).toBe('inHg')
  })

  it('detects slow falling pressure trend from ascending fixture', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    // fixture falls 1013.00 -> 1011.50 mb over 3h = -0.04 inHg -> falling, slow
    expect(result.pressure?.trend).toBe('falling')
    expect(result.pressure?.rate).toBe('slow')
  })
```

and replace the readings test:

```ts
  it('includes hourly readings array on pressure (oldest to newest, inHg)', async () => {
    mockAllProducts()
    const result = await fetchNoaaData(SPOT)
    const readings = result.pressure!.readings!
    // hourly samples at 11:00, 12:00, 13:00, 14:00
    expect(readings).toHaveLength(4)
    expect(readings[0]).toBeCloseTo(29.91, 2)
    expect(readings[readings.length - 1]).toBeCloseTo(29.87, 2)
  })
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/noaaService.test.ts --no-coverage`
Expected: FAIL — the four updated tests fail (old parsing reads `data[0]` = oldest reading and treats mb as inHg).

- [ ] **Step 4: Implement the parsing fixes**

In `services/noaaService.ts`, replace `parseWind` with:

```ts
const KNOTS_TO_MPH = 1.15078
const MB_TO_INHG = 0.02953

function parseWind(data: any): WindData | null {
  const entries: any[] = data?.data ?? []
  if (entries.length === 0) return null
  // API returns readings oldest-first — most recent is last
  const d = entries[entries.length - 1]
  return {
    speed: Math.round((parseFloat(d.s) || 0) * KNOTS_TO_MPH),
    gusts: Math.round((parseFloat(d.g) || 0) * KNOTS_TO_MPH),
    direction: parseFloat(d.d) || 0,
    directionLabel: d.dr || 'N',
    unit: 'mph',
  }
}
```

Replace `parsePressure` with:

```ts
function parsePressure(data: any): PressureData | null {
  const entries: any[] = data?.data ?? []
  const values = entries
    .map((d: any) => ({ t: d.t as string, v: parseFloat(d.v) }))
    .filter((e: { v: number }) => !isNaN(e.v))
  if (values.length === 0) return null

  // API returns 6-minute readings oldest-first, in millibars
  const toInHg = (mb: number) => parseFloat((mb * MB_TO_INHG).toFixed(2))
  const current = toInHg(values[values.length - 1].v)
  // ~3 hours back = 30 readings at 6-minute intervals
  const threeHoursBack = toInHg(values[Math.max(0, values.length - 1 - 30)].v)
  const delta = current - threeHoursBack
  const abs = Math.abs(delta)

  const trend: PressureData['trend'] =
    delta > 0.03 ? 'rising' : delta < -0.03 ? 'falling' : 'stable'
  const rate: PressureData['rate'] =
    abs < 0.06 ? 'slow' : abs < 0.12 ? 'normal' : 'fast'

  // hourly samples (minute :00) for the detail chart, oldest-first
  let readings = values.filter(e => e.t.slice(-2) === '00').map(e => toInHg(e.v))
  if (readings.length === 0) readings = values.slice(-8).map(e => toInHg(e.v))

  return { value: current, trend, rate, unit: 'inHg', readings }
}
```

In `fetchNoaaData`, replace the water temp line:

```ts
  const waterTemp = tempData?.data?.[0]?.v ? parseFloat(tempData.data[0].v) : null
```

with:

```ts
  const tempEntries: any[] = tempData?.data ?? []
  const lastTemp = tempEntries.length > 0 ? parseFloat(tempEntries[tempEntries.length - 1].v) : NaN
  const waterTemp = isNaN(lastTemp) ? null : lastTemp
```

- [ ] **Step 5: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS. If `PressureDetail.test.tsx` or `scoringService.test.ts` fail because they hand-build `PressureData` objects, those tests construct their own data and should NOT be affected — investigate before changing them.

- [ ] **Step 6: Commit**

```bash
git add services/noaaService.ts __tests__/noaaService.test.ts __tests__/fixtures/noaaWind.json __tests__/fixtures/noaaWaterTemp.json __tests__/fixtures/noaaAirPressure.json
git commit -m "fix: parse NOAA data oldest-first and convert mb->inHg, knots->mph"
```

---

### Task 3: Remove mock forecast data from production

`useForecast` currently returns `MOCK_FORECAST` — Pro users see fake scores. Until Phase 2 lands the real forecast, it returns an empty array and the strip hides for Pro.

**Files:**
- Modify: `hooks/useForecast.ts` (whole file)
- Modify: `features/forecast/ForecastStrip.tsx` (top of component)

**Interfaces:**
- Consumes: nothing.
- Produces: `useForecast(spot: Spot | null): { data: DayForecast[]; isLoading: boolean }` — same signature, now always `data: []`. Phase 2 replaces the body with a real TanStack query.

- [ ] **Step 1: Replace `hooks/useForecast.ts` entirely with:**

```ts
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

interface UseForecastResult {
  data: DayForecast[]
  isLoading: boolean
}

// Phase 2 replaces this with a real TanStack query over forecastService.
// Until then: no data is better than fake data.
export function useForecast(_spot: Spot | null): UseForecastResult {
  return { data: [], isLoading: false }
}
```

- [ ] **Step 2: Hide the strip for Pro users when there is no data**

In `features/forecast/ForecastStrip.tsx`, add as the first line of the `ForecastStrip` function body (before the `if (!isPro)` block):

```ts
  if (isPro && forecast.length === 0) return null
```

- [ ] **Step 3: Verify no production file imports mockData**

Run: `grep -rn "mockData" app hooks services features store data --include="*.ts" --include="*.tsx" | grep -v "data/mockData.ts"`
Expected: no output. If anything appears, remove that import path the same way.

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useForecast.ts features/forecast/ForecastStrip.tsx
git commit -m "fix: remove mock forecast data from production path"
```

---

### Task 4: Tide quick card — next event + length units

The dashboard shows the first high tide of the day (possibly hours in the past) and hardcodes "ft" ignoring the user's unit setting. `noaaService` already computes the correct next-future event in `tide.next`.

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `conditions.tide.next: { type: 'high' | 'low'; time: string; height: number }` (already populated), `useSettingsStore(s => s.lengthUnit): 'ft' | 'm'`.
- Produces: UI only.

- [ ] **Step 1: Implement**

In `app/(tabs)/index.tsx`:

1. Delete this line:

```ts
  const tideNextHigh = conditions?.tide?.events.find(e => e.type === 'high')
```

2. Below the `const tempUnit = ...` line, add:

```ts
  const lengthUnit = useSettingsStore(s => s.lengthUnit)
  const formatHeight = (ft: number) =>
    lengthUnit === 'm' ? `${(ft * 0.3048).toFixed(1)} m` : `${ft.toFixed(1)} ft`
```

3. Replace the tide quick card block:

```tsx
              {conditions.tide && (
                <View style={styles.quickCard}>
                  <Text style={styles.quickLabel}>Tide</Text>
                  <Text style={styles.quickValue}>{conditions.tide.current.height} ft</Text>
                  <Text style={styles.quickSub}>{conditions.tide.current.rising ? '▲ Rising' : '▼ Falling'}</Text>
                  {tideNextHigh && (
                    <Text style={styles.quickPeak}>▲ {tideNextHigh.height.toFixed(1)} ft {tideNextHigh.time}</Text>
                  )}
                </View>
              )}
```

with:

```tsx
              {conditions.tide && (
                <View style={styles.quickCard}>
                  <Text style={styles.quickLabel}>Tide</Text>
                  <Text style={styles.quickValue}>{formatHeight(conditions.tide.current.height)}</Text>
                  <Text style={styles.quickSub}>{conditions.tide.current.rising ? '▲ Rising' : '▼ Falling'}</Text>
                  <Text style={styles.quickPeak}>
                    {conditions.tide.next.type === 'high' ? '▲' : '▼'} {formatHeight(conditions.tide.next.height)} {conditions.tide.next.time}
                  </Text>
                </View>
              )}
```

- [ ] **Step 2: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS. (No component test exists for this screen — it requires full provider mocking; the change is type-checked and visually verifiable.)

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "fix: tide card shows next future event and respects length unit setting"
```

---

### Task 5: 24-hour scoring + future-aware best window

Hourly scores currently cover only 5AM–8PM and "best window" can recommend a window that already passed. Score all 24 hours; only recommend windows starting now or later; late at night, honestly report the day's peak as passed.

**Files:**
- Modify: `types/conditions.ts` (`HourlyScore`, `ConditionsData.bestWindow`)
- Modify: `services/scoringService.ts` (hour loop + best window)
- Modify: `features/score/ScoreDisplay.tsx` (passed label)
- Modify: `data/mockData.ts` (type compliance for tests)
- Test: `__tests__/scoringService.test.ts`

**Interfaces:**
- Consumes: existing `calculateScore`, `detectPhase`, `hoursFromLastTurn`.
- Produces:
  - `HourlyScore = { hour: string; hourIndex: number; score: number }` (`hourIndex` 0–23)
  - `ConditionsData['bestWindow'] = { start: string; end: string; score: number; passed?: boolean }`
  - `buildConditionsData` returns 24 `hourlyScores` entries, index == hour.
  - Phase 2/3 rely on `hourIndex` and `passed` — keep these exact names.

- [ ] **Step 1: Write the failing tests**

In `__tests__/scoringService.test.ts`, replace the test `'hourlyScores covers hours 5 through 20'` with:

```ts
  it('hourlyScores covers all 24 hours with hourIndex', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.hourlyScores).toHaveLength(24)
    expect(result.hourlyScores[0].hour).toBe('12AM')
    expect(result.hourlyScores[0].hourIndex).toBe(0)
    expect(result.hourlyScores[23].hour).toBe('11PM')
    expect(result.hourlyScores[23].hourIndex).toBe(23)
  })
```

and add two new tests:

```ts
  it('bestWindow starts at or after the current hour', () => {
    // NOW is 2:00 PM (hour 14)
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.bestWindow.passed).toBeUndefined()
    const m = result.bestWindow.start.match(/(\d+):00 (AM|PM)/)!
    let h = parseInt(m[1], 10)
    if (m[2] === 'PM' && h !== 12) h += 12
    if (m[2] === 'AM' && h === 12) h = 0
    expect(h).toBeGreaterThanOrEqual(14)
  })

  it('flags bestWindow as passed late at night', () => {
    const LATE = new Date('2026-05-06T23:00:00')
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, LATE)
    expect(result.bestWindow.passed).toBe(true)
    expect(result.bestWindow.score).toBeGreaterThan(0)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/scoringService.test.ts --no-coverage`
Expected: FAIL — length is 16, `hourIndex` undefined, `passed` undefined.

- [ ] **Step 3: Update types**

In `types/conditions.ts`, replace:

```ts
export interface HourlyScore {
  hour: string
  score: number
}
```

with:

```ts
export interface HourlyScore {
  hour: string
  hourIndex: number
  score: number
}
```

and in `ConditionsData`, replace:

```ts
  bestWindow: { start: string; end: string; score: number }
```

with:

```ts
  bestWindow: { start: string; end: string; score: number; passed?: boolean }
```

- [ ] **Step 4: Update `services/scoringService.ts`**

Replace the hourly-scores loop and best-window block (everything from the `// Hourly scores:` comment through the end of the best-window `for` loop) with:

```ts
  // Hourly scores: all 24 hours (0–23); hourIndex == hour
  const hourlyScores: HourlyScore[] = []
  for (let h = 0; h < 24; h++) {
    const hourTide = hourlyCurve.length > 0
      ? { phase: detectPhase(hourlyCurve, h), hoursFromTurn: hoursFromLastTurn(hourlyCurve, h) }
      : null
    const hourSky = getHourlySky(nws, h)
    const hourWind = getHourlyWind(nws, h)
    const hourSolunar = getHourlySolunar(solunar, h)

    hourlyScores.push({
      hour: formatHourLabel(h),
      hourIndex: h,
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

  // Best 3-hour window that starts now or later
  const windowAvg = (i: number) => Math.round(
    (hourlyScores[i].score + hourlyScores[i + 1].score + hourlyScores[i + 2].score) / 3
  )
  let bestWindow: ConditionsData['bestWindow'] | null = null
  for (let i = currentHour; i <= 21; i++) {
    const avg = windowAvg(i)
    if (!bestWindow || avg > bestWindow.score) {
      bestWindow = { start: formatHourTime(i), end: formatHourTime(i + 2), score: avg }
    }
  }
  if (!bestWindow) {
    // 10 PM or later — every window today has already started; report the day's peak honestly
    let peak = { start: formatHourTime(0), end: formatHourTime(2), score: windowAvg(0) }
    for (let i = 1; i <= 21; i++) {
      const avg = windowAvg(i)
      if (avg > peak.score) peak = { start: formatHourTime(i), end: formatHourTime(i + 2), score: avg }
    }
    bestWindow = { ...peak, passed: true }
  }
```

(The old `let bestWindow = { start: formatHourTime(5), ... }` initialization is fully replaced by this block. `currentHour` is already defined earlier in the function.)

- [ ] **Step 5: Update `ScoreDisplay` for the passed label**

In `features/score/ScoreDisplay.tsx`, change the `Props` interface:

```ts
interface Props {
  score: number
  label: string
  bestWindow: { start: string; end: string; score: number; passed?: boolean }
}
```

and replace the best-window `<Text>`:

```tsx
      <Text style={styles.bestWindow}>
        {bestWindow.passed
          ? `Peak today was ${bestWindow.start}–${bestWindow.end} · Score ${bestWindow.score}`
          : `Best window: ${bestWindow.start}–${bestWindow.end} · Score ${bestWindow.score}`}
      </Text>
```

- [ ] **Step 6: Fix `data/mockData.ts` type compliance**

`MOCK_CONDITIONS.hourlyScores` entries need `hourIndex`. Replace the `hourlyScores` array with:

```ts
  hourlyScores: [
    { hour: '5AM', hourIndex: 5, score: 65 }, { hour: '6AM', hourIndex: 6, score: 72 },
    { hour: '7AM', hourIndex: 7, score: 68 }, { hour: '8AM', hourIndex: 8, score: 55 },
    { hour: '9AM', hourIndex: 9, score: 48 }, { hour: '10AM', hourIndex: 10, score: 42 },
    { hour: '11AM', hourIndex: 11, score: 38 }, { hour: '12PM', hourIndex: 12, score: 45 },
    { hour: '1PM', hourIndex: 13, score: 58 }, { hour: '2PM', hourIndex: 14, score: 78 },
    { hour: '3PM', hourIndex: 15, score: 91 }, { hour: '4PM', hourIndex: 16, score: 88 },
    { hour: '5PM', hourIndex: 17, score: 82 }, { hour: '6PM', hourIndex: 18, score: 75 },
    { hour: '7PM', hourIndex: 19, score: 70 }, { hour: '8PM', hourIndex: 20, score: 62 },
  ],
```

- [ ] **Step 7: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add types/conditions.ts services/scoringService.ts features/score/ScoreDisplay.tsx data/mockData.ts __tests__/scoringService.test.ts
git commit -m "feat: score all 24 hours and only recommend future best windows"
```

---

### Task 6: ScoreTimeline — now marker, past dimming, auto-scroll

**Files:**
- Modify: `features/score/ScoreTimeline.tsx`
- Modify: `app/(tabs)/index.tsx` (pass `currentHour`)
- Create: `__tests__/ScoreTimeline.test.tsx`

**Interfaces:**
- Consumes: `HourlyScore.hourIndex` from Task 5.
- Produces: `ScoreTimeline({ hourlyScores, currentHour }: { hourlyScores: HourlyScore[]; currentHour: number | null })`. `currentHour: null` renders no marker and no dimming (Phase 2's day-detail modal uses null). Keep this exact prop name.

- [ ] **Step 1: Write the failing test**

Create `__tests__/ScoreTimeline.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { ScoreTimeline } from '../features/score/ScoreTimeline'
import type { HourlyScore } from '../types/conditions'

const HOURS: HourlyScore[] = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'AM' : 'PM'}`,
  hourIndex: h,
  score: 40 + (h % 5) * 10,
}))

describe('ScoreTimeline', () => {
  it('renders all 24 hour bars', () => {
    const { getAllByTestId } = render(<ScoreTimeline hourlyScores={HOURS} currentHour={14} />)
    expect(getAllByTestId('timeline-bar')).toHaveLength(24)
  })

  it('shows a Now label at the current hour', () => {
    const { getByText } = render(<ScoreTimeline hourlyScores={HOURS} currentHour={14} />)
    expect(getByText('Now')).toBeTruthy()
  })

  it('shows no Now label when currentHour is null', () => {
    const { queryByText } = render(<ScoreTimeline hourlyScores={HOURS} currentHour={null} />)
    expect(queryByText('Now')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/ScoreTimeline.test.tsx --no-coverage`
Expected: FAIL — `currentHour` prop doesn't exist, no `timeline-bar` testID.

- [ ] **Step 3: Implement**

Replace `features/score/ScoreTimeline.tsx` entirely with:

```tsx
import React, { useRef, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'
import { useSettingsStore } from '../../store/settingsStore'
import type { HourlyScore } from '../../types/conditions'

interface Props {
  hourlyScores: HourlyScore[]
  currentHour: number | null
}

const BAR_MAX_HEIGHT = 80
const BAR_WIDTH = 28
const BAR_SLOT = BAR_WIDTH + 12 // wrapper width + gap, used for auto-scroll math

export function ScoreTimeline({ hourlyScores, currentHour }: Props) {
  const isPro = useSettingsStore(s => s.isPro)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  if (hourlyScores.length === 0) return null
  const maxScore = Math.max(...hourlyScores.map(h => h.score))

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Today's Forecast</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onContentSizeChange={() => {
          if (currentHour !== null) {
            scrollRef.current?.scrollTo({ x: Math.max(0, (currentHour - 2) * BAR_SLOT), animated: false })
          }
        }}
      >
        {hourlyScores.map((item) => {
          const barHeight = (item.score / 100) * BAR_MAX_HEIGHT
          const isPeak = item.score === maxScore
          const isNow = currentHour !== null && item.hourIndex === currentHour
          const isPast = currentHour !== null && item.hourIndex < currentHour
          const color = scoreColor(item.score)
          return (
            <TouchableOpacity
              key={item.hour}
              testID="timeline-bar"
              style={[styles.barWrapper, isPast && styles.pastBar]}
              onPress={() => { if (!isPro) setTooltipVisible(true) }}
              activeOpacity={isPro ? 1 : 0.7}
            >
              <Text style={styles.scoreLabel}>{isPeak ? item.score : ''}</Text>
              <View style={[styles.barTrack, isNow && styles.nowTrack]}>
                <View style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color, opacity: isPeak ? 1 : 0.7 },
                ]} />
              </View>
              <Text style={[styles.hourLabel, isNow && styles.nowLabel]}>
                {isNow ? 'Now' : item.hour}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <Modal transparent visible={tooltipVisible} onRequestClose={() => setTooltipVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setTooltipVisible(false)}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipTitle}>Score Breakdown</Text>
            <Text style={styles.tooltipBody}>Detailed hourly score breakdown is a Pro feature.</Text>
            <Text style={styles.tooltipHint}>Tap anywhere to dismiss</Text>
          </View>
        </Pressable>
      </Modal>
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
  pastBar: { opacity: 0.4 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: 'flex-end' },
  nowTrack: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  bar: { width: BAR_WIDTH, borderRadius: 4 },
  hourLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 4 },
  nowLabel: { color: Colors.accent, fontWeight: '700' },
  scoreLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', height: 14 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  tooltip: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.lg, margin: Spacing.xl, alignItems: 'center',
  },
  tooltipTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  tooltipBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  tooltipHint: { fontSize: 12, color: Colors.textTertiary, marginTop: Spacing.md },
})
```

(The Pro tooltip is intentionally kept — Phase 3 replaces it with the free score-breakdown sheet.)

In `app/(tabs)/index.tsx`, update the call site:

```tsx
            <ScoreTimeline hourlyScores={conditions.hourlyScores} currentHour={currentHour} />
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/score/ScoreTimeline.tsx "app/(tabs)/index.tsx" __tests__/ScoreTimeline.test.tsx
git commit -m "feat: 24-hour timeline with Now marker, past dimming, and auto-scroll"
```

---

### Task 7: Honest estimated water temperature

When NOAA has no water temp, the app silently invents 65°F/68°F and feeds it to display AND species scoring. Flag it.

**Files:**
- Modify: `types/conditions.ts` (`ConditionsData.water`)
- Modify: `services/scoringService.ts` (`buildConditionsData` return)
- Modify: `data/mockData.ts` (`water` field)
- Modify: `app/(tabs)/index.tsx` (water card + species caveat)
- Test: `__tests__/scoringService.test.ts`

**Interfaces:**
- Consumes: `NoaaData.waterTemp: number | null`.
- Produces: `ConditionsData['water'] = { temp: number; unit: string; estimated: boolean }`. Phase 3's species empty-state work reads `estimated` — keep the name.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/scoringService.test.ts`:

```ts
  it('marks water temp as estimated when NOAA has none', () => {
    const noaaNoTemp = { ...NOAA, waterTemp: null }
    const result = buildConditionsData(noaaNoTemp, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.water.estimated).toBe(true)
    expect(result.water.temp).toBe(65) // saltwater default
  })

  it('marks water temp as real when NOAA provides it', () => {
    const result = buildConditionsData(NOAA, NWS, SWELL, SOLUNAR, SPOT, NOW)
    expect(result.water.estimated).toBe(false)
    expect(result.water.temp).toBe(57)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/scoringService.test.ts --no-coverage`
Expected: FAIL — `estimated` is undefined.

- [ ] **Step 3: Implement**

In `types/conditions.ts`, inside `ConditionsData`, replace:

```ts
  water: { temp: number; unit: string }
```

with:

```ts
  water: { temp: number; unit: string; estimated: boolean }
```

In `services/scoringService.ts` `buildConditionsData`, the line `const waterTempValue = ...` already exists; add directly below it:

```ts
  const waterTempEstimated = noaa?.waterTemp == null
```

and in the return object replace:

```ts
    water: { temp: waterTempValue, unit: '°F' },
```

with:

```ts
    water: { temp: waterTempValue, unit: '°F', estimated: waterTempEstimated },
```

In `data/mockData.ts` replace:

```ts
  water: { temp: 57, unit: '°F' },
```

with:

```ts
  water: { temp: 57, unit: '°F', estimated: false },
```

- [ ] **Step 4: Surface it in the UI**

In `app/(tabs)/index.tsx`, replace the Water quick card:

```tsx
              <View style={styles.quickCard}>
                <Text style={styles.quickLabel}>Water</Text>
                <Text style={styles.quickValue}>
                  {tempUnit === 'C'
                    ? Math.round((conditions.water.temp - 32) * 5 / 9)
                    : conditions.water.temp}°
                </Text>
                <Text style={styles.quickSub}>{tempUnit === 'C' ? '°C' : '°F'}</Text>
              </View>
```

with:

```tsx
              <View style={styles.quickCard}>
                <Text style={styles.quickLabel}>Water</Text>
                <Text style={styles.quickValue}>
                  {conditions.water.estimated ? '~' : ''}
                  {tempUnit === 'C'
                    ? Math.round((conditions.water.temp - 32) * 5 / 9)
                    : conditions.water.temp}°
                </Text>
                <Text style={styles.quickSub}>
                  {tempUnit === 'C' ? '°C' : '°F'}{conditions.water.estimated ? ' · est.' : ''}
                </Text>
              </View>
```

In the "What's Biting" section, directly under the `<Text style={styles.sectionTitle}>What's Biting</Text>` line, add:

```tsx
              {conditions.water.estimated && (
                <Text style={styles.estimateNote}>
                  Species activity estimated — no live water temp at this station
                </Text>
              )}
```

and add to the `styles` object:

```ts
  estimateNote: { fontSize: 11, color: Colors.textTertiary, marginBottom: Spacing.sm },
```

- [ ] **Step 5: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add types/conditions.ts services/scoringService.ts data/mockData.ts "app/(tabs)/index.tsx" __tests__/scoringService.test.ts
git commit -m "feat: label estimated water temp instead of presenting fallback as real"
```

---

### Task 8: Correct hourly weather lookup (NWS timestamps)

NWS returns ~156 hourly periods spanning 6.5 days, but scoring matches them by hour number only — for hours earlier than now, the first match is *tomorrow's* period. Carry real timestamps and match today's.

**Files:**
- Modify: `services/nwsService.ts` (`NwsData` interface + `hourlyForecast` mapping)
- Modify: `services/scoringService.ts` (`getHourlyWind`, `getHourlySky`, `windHourly`)
- Test: `__tests__/nwsService.test.ts`, `__tests__/scoringService.test.ts`

**Interfaces:**
- Consumes: NWS `periods[].startTime` (ISO string, already fetched).
- Produces: `NwsData.hourlyForecast` entries gain `epochMs: number`. Phase 2's `forecastService` matches forecast hours via `epochMs` — keep the name. `buildConditionsData`'s `windHourly` now contains only today's periods.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/nwsService.test.ts` inside the existing describe block (it already mocks the two-step fetch with `nwsPoints.json` + `nwsHourlyForecast.json` — reuse the same mock helper the other tests use):

```ts
  it('includes epochMs derived from period startTime', async () => {
    mockNwsFetches() // use this file's existing fetch-mock helper name; if it differs, use that
    const result = await fetchNwsData(SPOT)
    const fixture = require('./fixtures/nwsHourlyForecast.json')
    const firstStart = new Date(fixture.properties.periods[0].startTime).getTime()
    expect(result.hourlyForecast[0].epochMs).toBe(firstStart)
  })
```

Note: open `__tests__/nwsService.test.ts` first and copy the exact mock-setup pattern its other tests use (helper name and `SPOT` constant) — do not invent a new one.

In `__tests__/scoringService.test.ts`, the `NWS` constant's `hourlyForecast` entries need `epochMs`. Replace the `NWS` constant with:

```ts
const dayMs = (h: number) => new Date('2026-05-06T00:00:00').getTime() + h * 3_600_000

const NWS: NwsData = {
  air: { temp: 62, high: 67, low: 52, humidity: 78, unit: '°F' },
  sky: { condition: 'Partly Cloudy', rainChance: 15, icon: 'partly-cloudy' },
  wind: { speed: 10, gusts: 15, direction: 225, directionLabel: 'SW', unit: 'mph' },
  hourlyForecast: [
    { hour: 5, epochMs: dayMs(5), windSpeed: 5, cloudCover: 30, rainChance: 10, windDirection: 'SW' },
    { hour: 14, epochMs: dayMs(14), windSpeed: 10, cloudCover: 50, rainChance: 15, windDirection: 'W' },
  ],
}
```

and add a test proving `windHourly` filters to today:

```ts
  it('windHourly only includes periods from today', () => {
    const tomorrow5am = dayMs(24 + 5)
    const nwsTwoDays: NwsData = {
      ...NWS,
      hourlyForecast: [
        { hour: 5, epochMs: dayMs(5), windSpeed: 5, cloudCover: 30, rainChance: 10, windDirection: 'SW' },
        { hour: 5, epochMs: tomorrow5am, windSpeed: 22, cloudCover: 30, rainChance: 10, windDirection: 'SW' },
      ],
    }
    const result = buildConditionsData(NOAA, nwsTwoDays, null, SOLUNAR, SPOT, NOW)
    expect(result.windHourly).toHaveLength(1)
    expect(result.windHourly[0].speed).toBe(5)
  })
```

Also update the existing test `'includes windHourly derived from NWS hourlyForecast'`: it passes `new Date()` as `now`, which no longer matches the fixed 2026-05-06 epochs. Change both `new Date()` arguments in that test and in `'returns empty windHourly when NWS unavailable'` and `'passes through pressure.readings from NOAA data'` to `NOW`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/nwsService.test.ts __tests__/scoringService.test.ts --no-coverage`
Expected: FAIL — `epochMs` missing from type and data.

- [ ] **Step 3: Implement in `services/nwsService.ts`**

In the `NwsData` interface, replace the `hourlyForecast` entry type:

```ts
  hourlyForecast: {
    hour: number
    epochMs: number
    windSpeed: number
    cloudCover: number
    rainChance: number
    windDirection: string
  }[]
```

and in `fetchNwsData`, replace the `hourlyForecast` mapping:

```ts
  const hourlyForecast = periods.map((p: any) => ({
    hour: new Date(p.startTime).getHours(),
    epochMs: new Date(p.startTime).getTime(),
    windSpeed: parseWindSpeed(p.windSpeed),
    cloudCover: p.shortForecast.toLowerCase().includes('cloud') ? 70 : 20,
    rainChance: p.probabilityOfPrecipitation?.value ?? 0,
    windDirection: (p.windDirection || 'N') as string,
  }))
```

- [ ] **Step 4: Implement in `services/scoringService.ts`**

Replace `getHourlyWind` and `getHourlySky` with timestamp-aware versions (note the new third parameter):

```ts
function findPeriodForHour(nws: NwsData, hour: number, now: Date) {
  const target = new Date(now)
  target.setHours(hour, 0, 0, 0)
  return nws.hourlyForecast.find(p => Math.abs(p.epochMs - target.getTime()) < 30 * 60 * 1000)
    ?? nws.hourlyForecast.find(p => p.hour === hour)
    ?? nws.hourlyForecast[0]
}

function getHourlyWind(nws: NwsData | null, hour: number, now: Date): WindData {
  if (!nws) return NEUTRAL_WIND
  const period = findPeriodForHour(nws, hour, now)
  if (!period) return NEUTRAL_WIND
  return { ...nws.wind, speed: period.windSpeed, gusts: period.windSpeed + 5 }
}

function getHourlySky(nws: NwsData | null, hour: number, now: Date): SkyData {
  if (!nws) return NEUTRAL_SKY
  const period = findPeriodForHour(nws, hour, now)
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
```

Update the two call sites in the hourly loop:

```ts
    const hourSky = getHourlySky(nws, h, now)
    const hourWind = getHourlyWind(nws, h, now)
```

And replace the `windHourly` mapping in the return object:

```ts
    windHourly: nws?.hourlyForecast
      .filter(p => new Date(p.epochMs).toDateString() === now.toDateString())
      .map(h => ({
        hour: h.hour,
        speed: h.windSpeed,
        directionLabel: h.windDirection,
      })) ?? [],
```

- [ ] **Step 5: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/nwsService.ts services/scoringService.ts __tests__/nwsService.test.ts __tests__/scoringService.test.ts
git commit -m "fix: match NWS hourly periods by timestamp so scoring uses today's weather"
```

---

### Task 9: ProWaitlistSheet + honest settings

The alerts UI promises notifications that never fire, and "Upgrade to Pro" does nothing. Replace both with honest placeholders.

**Files:**
- Create: `components/ProWaitlistSheet.tsx` (new directory `components/` at repo root)
- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/(tabs)/index.tsx` (forecast upgrade opens the sheet)
- Create: `__tests__/ProWaitlistSheet.test.tsx`

**Interfaces:**
- Consumes: theme constants only.
- Produces: `ProWaitlistSheet({ visible, onClose }: { visible: boolean; onClose: () => void })`. Phase 2's teaser gate opens this same component — keep the path `components/ProWaitlistSheet.tsx` and prop names.

- [ ] **Step 1: Write the failing test**

Create `__tests__/ProWaitlistSheet.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ProWaitlistSheet } from '../components/ProWaitlistSheet'

describe('ProWaitlistSheet', () => {
  it('renders the coming-soon message when visible', () => {
    const { getByText } = render(<ProWaitlistSheet visible onClose={() => {}} />)
    expect(getByText('FishCast Pro is coming soon')).toBeTruthy()
    expect(getByText('• Full 7-day fishing forecast')).toBeTruthy()
  })

  it('calls onClose when the button is pressed', () => {
    const onClose = jest.fn()
    const { getByText } = render(<ProWaitlistSheet visible onClose={onClose} />)
    fireEvent.press(getByText('Got it'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/ProWaitlistSheet.test.tsx --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/ProWaitlistSheet.tsx`**

```tsx
import React from 'react'
import { Modal, View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'

interface Props {
  visible: boolean
  onClose: () => void
}

export function ProWaitlistSheet({ visible, onClose }: Props) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>FishCast Pro is coming soon</Text>
          <Text style={styles.body}>Pro will unlock:</Text>
          <Text style={styles.item}>• Full 7-day fishing forecast</Text>
          <Text style={styles.item}>• All species insights</Text>
          <Text style={styles.item}>• Unlimited saved spots</Text>
          <Text style={styles.item}>• Smart score alerts</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Spacing.cardRadius * 2,
    borderTopRightRadius: Spacing.cardRadius * 2,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  body: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  item: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xs, lineHeight: 20 },
  button: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
```

- [ ] **Step 4: Rewrite the alerts + subscription sections in `app/(tabs)/settings.tsx`**

1. Remove these imports: `Switch`, `Slider` (`@react-native-community/slider`), `* as Notifications` (`expo-notifications`), `useEffect`, `useState` stays (needed for the sheet).
2. Remove from the destructured store: `alertThreshold, setAlertThreshold, alertsEnabled, setAlertsEnabled` (keep `isPro`). The store itself keeps those fields for Phase C — do not touch `store/settingsStore.ts`.
3. Remove the `permissionStatus` state, the `useEffect`, and the `requestPermission` function.
4. Add at the top of the component: `const [showWaitlist, setShowWaitlist] = useState(false)` and import `ProWaitlistSheet` from `'../../components/ProWaitlistSheet'`.
5. Replace the entire Alerts card (the `<Text style={styles.sectionHeader}>Alerts</Text>` block and its `<View style={styles.card}>`) with:

```tsx
      <Text style={styles.sectionHeader}>Alerts</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Smart score alerts</Text>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </View>
      </View>
```

6. Give the Upgrade button a handler:

```tsx
            <TouchableOpacity style={styles.upgradeButton} onPress={() => setShowWaitlist(true)}>
              <Text style={styles.upgradeText}>Upgrade to Pro</Text>
            </TouchableOpacity>
```

7. Render the sheet just before the closing `</ScrollView>`:

```tsx
      <ProWaitlistSheet visible={showWaitlist} onClose={() => setShowWaitlist(false)} />
```

8. Add to styles: `comingSoon: { fontSize: 13, color: Colors.textTertiary }` and remove the now-unused `sliderRow`, `permButton`, `permText`, `permGranted` styles.

- [ ] **Step 5: Wire the forecast upgrade card to the sheet**

In `app/(tabs)/index.tsx`:
1. Add import: `import { ProWaitlistSheet } from '../../components/ProWaitlistSheet'` and `useState` to the React import.
2. Add state in the component: `const [showWaitlist, setShowWaitlist] = useState(false)`.
3. Change the ForecastStrip line:

```tsx
            <ForecastStrip forecast={forecast} isPro={isPro} onUpgrade={() => setShowWaitlist(true)} />
```

4. Render the sheet as the last child inside the outer `<View style={styles.screenContainer}>` (after the loading overlay):

```tsx
      <ProWaitlistSheet visible={showWaitlist} onClose={() => setShowWaitlist(false)} />
```

- [ ] **Step 6: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/ProWaitlistSheet.tsx "app/(tabs)/settings.tsx" "app/(tabs)/index.tsx" __tests__/ProWaitlistSheet.test.tsx
git commit -m "feat: honest Pro waitlist sheet; remove dead alerts UI"
```

---

### Task 10: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** documentation only.

- [ ] **Step 1: Update the stale sections**

Make these exact edits in `CLAUDE.md`:

1. In the **External APIs → NOAA CO-OPS** section, add after the "Products fetched in parallel" line:

```markdown
- Request params (verified against live API): `time_zone=lst_ldt` (NOT `LST/LDT`), predictions require `datum=MLLW`, observational products use `range=N` trailing hours (no `date=today`)
- Observational data arrives OLDEST-FIRST at 6-minute intervals — "current" reading is the LAST element
- Units: air_pressure arrives in millibars (converted ×0.02953 to inHg), wind in knots (converted ×1.15078 to mph)
```

2. In the **Scoring Algorithm** section, replace the line about hourly scores:

```markdown
Hourly scores: all 24 hours (0–23), each entry carries `hourIndex`; best window = highest 3-hour sliding average starting at or after the current hour (`passed: true` when the day is spent).
```

3. In **Data Flow**, add a row note under the `useConditions` table: `Forecast (Phase 2) | ['forecast', spot.id, 'YYYY-MM-DD'] | 6 hr | 24 hr — stub returns [] until Phase 2 lands.`

4. Update the "Current state" line at the top to: `**Current state: Phase B1 + trust fixes complete.** All screens use live API data. No mock data in production paths.`

5. In **Tests**, change "69 tests, 12 suites" to "run `npx jest --no-coverage` for the current count" (counts drift; don't hardcode).

- [ ] **Step 2: Final full-suite check and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for NOAA params, 24h scoring, and phase status"
```
