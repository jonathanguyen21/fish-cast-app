# Golden Hour Redesign — Plan 1: Foundation (sky engine, tokens, verdict)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the invisible foundation of the Golden Hour redesign — the sky engine, the new design tokens + Manrope typography, the Bite/Comfort verdict logic, and the SkyBackground component — with zero visible change to existing screens.

**Architecture:** Three new pure modules (`theme/skyTheme.ts`, `theme/tokens.ts`, `features/score/verdict.ts`) plus one new component (`features/sky/SkyBackground.tsx`). Nothing existing is restyled in this plan; Plans 2–4 consume these modules. Old `theme/colors.ts` stays untouched as the compatibility shim.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript strict, suncalc (installed), reanimated (installed), Jest + RNTL. New deps: `expo-linear-gradient`, `@expo-google-fonts/manrope`, `expo-haptics`.

**Spec:** `docs/superpowers/specs/2026-07-07-golden-hour-redesign-design.md`

## Global Constraints

- **Prerequisite: PR #10 (`port-trust-fixes`) is merged into master.** Task 1 verifies this. Do not start otherwise — later plans need 24-hour scoring.
- Run `npx jest --no-coverage` AND `npx tsc --noEmit` before every commit. The only pre-existing TS error allowed is `app/(tabs)/spots.tsx` (`"/(tabs)/"` route-typing, documented in CLAUDE.md). Introduce no new errors.
- New dependencies allowed in this plan, exactly: `expo-linear-gradient`, `@expo-google-fonts/manrope`, `expo-haptics`, installed via `npx expo install`. No others.
- No existing screen may change visibly in this plan. Existing tests must stay green.
- Copy (user-facing strings) must match this plan exactly.
- Work on branch `golden-hour` off master.

---

### Task 1: Branch, prerequisites, dependencies

**Files:**
- Modify: `package.json` (via `npx expo install` only)

**Interfaces:**
- Consumes: nothing.
- Produces: branch `golden-hour` with 3 new deps installed; committed `lib/supabase.ts` fix if still uncommitted.

- [ ] **Step 1: Verify PR #10 is merged**

Run: `git checkout master && git pull && npx jest __tests__/scoringService.test.ts -t "24 hourly" --no-coverage`
Expected: PASS (1 test). If it FAILS or the test doesn't exist, STOP and report BLOCKED — PR #10 (`port-trust-fixes`) has not been merged; the human must merge it first.

- [ ] **Step 2: Commit the pending supabase fix if present**

Run: `git status --short lib/supabase.ts`
If it shows ` M lib/supabase.ts`, run:

```bash
git add lib/supabase.ts
git commit -m "fix: stub globalThis.WebSocket so Supabase client survives Node SSR"
```

If clean, skip.

- [ ] **Step 3: Create the branch and install dependencies**

```bash
git checkout -b golden-hour
npx expo install expo-linear-gradient expo-haptics @expo-google-fonts/manrope
```

- [ ] **Step 4: Verify the suite is green on the new branch**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: all tests pass; only the known `spots.tsx` TS error.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add expo-linear-gradient, manrope fonts, expo-haptics for Golden Hour"
```

---

### Task 2: Sky engine part 1 — hex mixing and sky-state detection

**Files:**
- Create: `theme/skyTheme.ts`
- Test: `__tests__/skyTheme.test.ts`

**Interfaces:**
- Consumes: `suncalc` (`SunCalc.getPosition(date, lat, lng).altitude`, radians).
- Produces: `mixHex(a: string, b: string, t: number): string` and `getSkyState(date: Date, lat: number, lng: number): SkyState` where `SkyState = 'night' | 'dawn' | 'goldenAM' | 'day' | 'goldenPM' | 'dusk'`. Task 3 extends this file.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/skyTheme.test.ts`:

```ts
import { mixHex, getSkyState } from '../theme/skyTheme'

// Bodega Bay. All dates are absolute instants (UTC ISO), so sun position
// is deterministic regardless of the machine's timezone.
const LAT = 38.33
const LNG = -123.05

describe('mixHex', () => {
  it('returns the first color at t=0 and the second at t=1', () => {
    expect(mixHex('#112233', '#FFFFFF', 0)).toBe('#112233')
    expect(mixHex('#112233', '#FFFFFF', 1)).toBe('#FFFFFF')
  })
  it('mixes midpoints per channel', () => {
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })
})

describe('getSkyState', () => {
  it('detects night well after sunset', () => {
    expect(getSkyState(new Date('2026-07-07T09:00:00Z'), LAT, LNG)).toBe('night') // 2 AM local
  })
  it('detects dawn just before sunrise', () => {
    expect(getSkyState(new Date('2026-07-07T12:30:00Z'), LAT, LNG)).toBe('dawn') // ~25 min pre-sunrise
  })
  it('detects goldenAM shortly after sunrise', () => {
    expect(getSkyState(new Date('2026-07-07T13:30:00Z'), LAT, LNG)).toBe('goldenAM') // ~35 min post-sunrise
  })
  it('detects day at solar noon', () => {
    expect(getSkyState(new Date('2026-07-07T20:15:00Z'), LAT, LNG)).toBe('day')
  })
  it('detects goldenPM shortly before sunset', () => {
    expect(getSkyState(new Date('2026-07-08T03:10:00Z'), LAT, LNG)).toBe('goldenPM') // ~28 min pre-sunset
  })
  it('detects dusk shortly after sunset', () => {
    expect(getSkyState(new Date('2026-07-08T04:10:00Z'), LAT, LNG)).toBe('dusk') // ~32 min post-sunset
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/skyTheme.test.ts --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `theme/skyTheme.ts`:

```ts
import SunCalc from 'suncalc'

export type SkyState = 'night' | 'dawn' | 'goldenAM' | 'day' | 'goldenPM' | 'dusk'

const DEG = Math.PI / 180

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (pa >> shift) & 0xff
    const vb = (pb >> shift) & 0xff
    return Math.round(va + (vb - va) * t)
  }
  const to2 = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()
  return `#${to2(ch(16))}${to2(ch(8))}${to2(ch(0))}`
}

export function getSkyState(date: Date, lat: number, lng: number): SkyState {
  const alt = SunCalc.getPosition(date, lat, lng).altitude
  const altSoon = SunCalc.getPosition(new Date(date.getTime() + 10 * 60 * 1000), lat, lng).altitude
  const rising = altSoon > alt
  if (alt < -12 * DEG) return 'night'
  if (alt < 0) return rising ? 'dawn' : 'dusk'
  if (alt < 10 * DEG) return rising ? 'goldenAM' : 'goldenPM'
  return 'day'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/skyTheme.test.ts --no-coverage`
Expected: PASS (8 tests). If a state test is off by one threshold, verify the date math first (they were chosen with ≥15 min margin from every boundary) — do NOT widen thresholds to make tests pass; report BLOCKED instead.

- [ ] **Step 5: Commit**

```bash
git add theme/skyTheme.ts __tests__/skyTheme.test.ts
git commit -m "feat: sky engine — hex mixing and sun-altitude sky states"
```

---

### Task 3: Sky engine part 2 — palettes, weather muting, tinted dark

**Files:**
- Modify: `theme/skyTheme.ts`
- Test: `__tests__/skyTheme.test.ts` (append)

**Interfaces:**
- Consumes: Task 2's `mixHex`, `getSkyState`; `SkyData['icon']` from `types/conditions.ts` (`'clear' | 'partly-cloudy' | 'overcast' | 'light-rain' | 'heavy-rain'`).
- Produces (Plans 2–4 rely on these exact names):

```ts
export interface SkyTheme {
  state: SkyState
  gradientStops: string[]        // 3-4 hex colors, top → bottom
  textTint: string               // primary text color on this sky
  accent: string                 // highlight color on this sky
  isLight: boolean               // true only for bright clear day skies
  tintedDark: { background: string; card: string }  // for Species/Spots screens
}
export function getSkyTheme(date: Date, lat: number, lng: number, icon: SkyIcon): SkyTheme
```

- [ ] **Step 1: Write the failing tests (append to `__tests__/skyTheme.test.ts`)**

```ts
import { getSkyTheme } from '../theme/skyTheme'

describe('getSkyTheme', () => {
  const NOON = new Date('2026-07-07T20:15:00Z')
  const NIGHT = new Date('2026-07-07T09:00:00Z')

  it('returns the state and a 3+ stop gradient', () => {
    const t = getSkyTheme(NOON, LAT, LNG, 'clear')
    expect(t.state).toBe('day')
    expect(t.gradientStops.length).toBeGreaterThanOrEqual(3)
    for (const s of t.gradientStops) expect(s).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('mutes the palette toward gray as weather worsens', () => {
    const clear = getSkyTheme(NOON, LAT, LNG, 'clear')
    const overcast = getSkyTheme(NOON, LAT, LNG, 'overcast')
    const rain = getSkyTheme(NOON, LAT, LNG, 'heavy-rain')
    expect(overcast.gradientStops[0]).not.toBe(clear.gradientStops[0])
    // channel spread (max-min of RGB) shrinks as saturation is muted
    const spread = (hex: string) => {
      const v = parseInt(hex.slice(1), 16)
      const c = [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
      return Math.max(...c) - Math.min(...c)
    }
    expect(spread(overcast.gradientStops[0])).toBeLessThan(spread(clear.gradientStops[0]))
    expect(spread(rain.gradientStops[0])).toBeLessThan(spread(overcast.gradientStops[0]))
  })

  it('isLight only for clear/partly day skies', () => {
    expect(getSkyTheme(NOON, LAT, LNG, 'clear').isLight).toBe(true)
    expect(getSkyTheme(NOON, LAT, LNG, 'overcast').isLight).toBe(false)
    expect(getSkyTheme(NIGHT, LAT, LNG, 'clear').isLight).toBe(false)
  })

  it('derives a near-black tinted dark pair that differs by state', () => {
    const day = getSkyTheme(NOON, LAT, LNG, 'clear')
    const night = getSkyTheme(NIGHT, LAT, LNG, 'clear')
    expect(day.tintedDark.background).not.toBe(night.tintedDark.background)
    // near-black: every channel below 0x40
    const v = parseInt(day.tintedDark.background.slice(1), 16)
    expect((v >> 16) & 0xff).toBeLessThan(0x40)
    expect((v >> 8) & 0xff).toBeLessThan(0x40)
    expect(v & 0xff).toBeLessThan(0x40)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/skyTheme.test.ts --no-coverage`
Expected: FAIL — `getSkyTheme` not exported.

- [ ] **Step 3: Implement (append to `theme/skyTheme.ts`)**

```ts
import type { SkyData } from '../types/conditions'

export type SkyIcon = SkyData['icon']

export interface SkyTheme {
  state: SkyState
  gradientStops: string[]
  textTint: string
  accent: string
  isLight: boolean
  tintedDark: { background: string; card: string }
}

const BASE: Record<SkyState, string[]> = {
  night:    ['#060A1A', '#101833', '#1B2447'],
  dawn:     ['#1A2C52', '#4E5D8C', '#C98A6B', '#EFC08A'],
  goldenAM: ['#2E4A7A', '#7FA0C9', '#F2C98A', '#F7DFB0'],
  day:      ['#3D7BC9', '#5E97D8', '#8FB8E8'],
  goldenPM: ['#37477E', '#8A5B72', '#E8935A', '#F3B97E'],
  dusk:     ['#1B2447', '#5C3E63', '#C4684E', '#EDA45E'],
}

const GRAY: Record<SkyState, string> = {
  night: '#0A0D16', dawn: '#3A4356', goldenAM: '#5C6878',
  day: '#6E7C8C', goldenPM: '#55535E', dusk: '#333749',
}

const MUTE: Record<SkyIcon, number> = {
  'clear': 0, 'partly-cloudy': 0.25, 'overcast': 0.6, 'light-rain': 0.7, 'heavy-rain': 0.85,
}

const ACCENT: Record<SkyState, string> = {
  night: '#AFC3FF', dawn: '#FFE9C4', goldenAM: '#FFE9C4',
  day: '#FFF3DC', goldenPM: '#FFD9A0', dusk: '#FFD9A0',
}

export function getSkyTheme(date: Date, lat: number, lng: number, icon: SkyIcon): SkyTheme {
  const state = getSkyState(date, lat, lng)
  const mute = MUTE[icon]
  const gradientStops = BASE[state].map(stop => mixHex(stop, GRAY[state], mute))
  const mid = BASE[state][1]
  return {
    state,
    gradientStops,
    textTint: state === 'day' ? '#F4F9FF' : '#FFF8F0',
    accent: ACCENT[state],
    isLight: state === 'day' && mute < 0.3,
    tintedDark: {
      background: mixHex('#0B0D12', mid, 0.12),
      card: mixHex('#12151C', mid, 0.16),
    },
  }
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add theme/skyTheme.ts __tests__/skyTheme.test.ts
git commit -m "feat: sky engine — weather-muted palettes and tinted-dark derivation"
```

---

### Task 4: Design tokens and Manrope typography

**Files:**
- Create: `theme/tokens.ts`
- Modify: `app/_layout.tsx` (font loading only)

**Interfaces:**
- Consumes: `@expo-google-fonts/manrope` exports `Manrope_500Medium`, `Manrope_700Bold`, `Manrope_800ExtraBold`; the root layout's existing `useFonts` call.
- Produces (Plans 2–4 style everything with these):

```ts
export const Radii: { card: 18; chip: 14; hero: 22; pill: 999 }
export const Glass: { fill: string; fillStrong: string; stroke: string; strokeStrong: string }
export const Accent: { warm: '#FFD9A0'; warmDeep: '#E8A852' }
export const Fonts: { medium: 'Manrope_500Medium'; bold: 'Manrope_700Bold'; extraBold: 'Manrope_800ExtraBold' }
export const Type: StyleSheet // hero, verdict, title, body, secondary, dataLg, chip
```

- [ ] **Step 1: Create `theme/tokens.ts`**

```ts
import { StyleSheet } from 'react-native'

export const Radii = { card: 18, chip: 14, hero: 22, pill: 999 } as const

export const Glass = {
  fill: 'rgba(16,18,34,0.38)',
  fillStrong: 'rgba(16,18,34,0.50)',
  stroke: 'rgba(255,255,255,0.14)',
  strokeStrong: 'rgba(255,217,160,0.70)',
} as const

export const Accent = { warm: '#FFD9A0', warmDeep: '#E8A852' } as const

export const Fonts = {
  medium: 'Manrope_500Medium',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const

// No 11px uppercase gray labels anywhere in this scale — that pattern is
// banned by the Golden Hour spec. Secondary text is 13px sentence case.
export const Type = StyleSheet.create({
  hero: { fontFamily: Fonts.extraBold, fontSize: 64, letterSpacing: -2, lineHeight: 68 },
  verdict: { fontFamily: Fonts.extraBold, fontSize: 22, letterSpacing: -0.5 },
  title: { fontFamily: Fonts.bold, fontSize: 16 },
  body: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  secondary: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  dataLg: { fontFamily: Fonts.extraBold, fontSize: 20, fontVariant: ['tabular-nums'] },
  chip: { fontFamily: Fonts.bold, fontSize: 12 },
})
```

(Colors are intentionally absent from `Type` — text color always comes from the active `SkyTheme`'s `textTint`/`accent` or `tintedDark` context, set at the usage site.)

- [ ] **Step 2: Load Manrope in `app/_layout.tsx`**

Add to the imports:

```ts
import { Manrope_500Medium, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope'
```

Find the existing `useFonts({ ... })` call in the root layout and add these three entries to its object:

```ts
    Manrope_500Medium,
    Manrope_700Bold,
    Manrope_800ExtraBold,
```

If the layout has no `useFonts` call (fonts loaded another way), report DONE_WITH_CONCERNS describing what you found instead of guessing.

- [ ] **Step 3: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS — nothing consumes the tokens yet; the font entries must not break layout tests.

- [ ] **Step 4: Commit**

```bash
git add theme/tokens.ts app/_layout.tsx
git commit -m "feat: Golden Hour design tokens and Manrope font loading"
```

---

### Task 5: Bite/Comfort axes and the verdict function

**Files:**
- Create: `features/score/verdict.ts`
- Test: `__tests__/verdict.test.ts`

**Interfaces:**
- Consumes: `ScoreBreakdown` from `types/conditions.ts` — the flat shape `{ pressure, solunar, tide, wind, waterTemp, sky }` (factor points, maxima: pressure 25, solunar 20, tide 20, wind 15, waterTemp 10, sky 10); `SkyState` from `theme/skyTheme.ts`.
- Produces (Plan 2's Today hero consumes exactly these):

```ts
export function computeAxes(b: ScoreBreakdown, spotType: 'saltwater' | 'freshwater'): { bite: number; comfort: number }
export interface Verdict { phrase: string; sub: string | null }
export function getVerdict(i: { bite: number; comfort: number; skyState: SkyState; betterDay?: { label: string; score: number } | null }): Verdict
```

- [ ] **Step 1: Write the failing tests**

Create `__tests__/verdict.test.ts`:

```ts
import { computeAxes, getVerdict } from '../features/score/verdict'
import type { ScoreBreakdown } from '../types/conditions'

const FULL: ScoreBreakdown = { pressure: 25, solunar: 20, tide: 20, wind: 15, waterTemp: 10, sky: 10 }

describe('computeAxes', () => {
  it('perfect factors give 100/100 for saltwater', () => {
    expect(computeAxes(FULL, 'saltwater')).toEqual({ bite: 100, comfort: 100 })
  })
  it('bite groups pressure+solunar+tide+waterTemp over 75 for saltwater', () => {
    const b = { ...FULL, pressure: 10, solunar: 10, tide: 10, waterTemp: 5 }
    // (10+10+10+5)/75 = 46.67 → 47
    expect(computeAxes(b, 'saltwater').bite).toBe(47)
  })
  it('comfort groups wind+sky over 25', () => {
    const b = { ...FULL, wind: 5, sky: 5 }
    expect(computeAxes(b, 'saltwater').comfort).toBe(40)
  })
  it('freshwater excludes tide from bite and uses a 55-point base', () => {
    const b = { ...FULL, tide: 0 }
    // (25+20+10)/55 = 100
    expect(computeAxes(b, 'freshwater').bite).toBe(100)
  })
})

describe('getVerdict', () => {
  it('high bite + high comfort → Go with golden-hour flavor', () => {
    expect(getVerdict({ bite: 80, comfort: 70, skyState: 'goldenPM' }).phrase).toBe('Go — golden hour feed')
    expect(getVerdict({ bite: 80, comfort: 70, skyState: 'goldenAM' }).phrase).toBe('Go — dawn bite is on')
    expect(getVerdict({ bite: 80, comfort: 70, skyState: 'night' }).phrase).toBe('Go — night bite is live')
    expect(getVerdict({ bite: 80, comfort: 70, skyState: 'day' }).phrase).toBe('Go.')
  })
  it('boundary: comfort 60 goes, 59 dresses for it', () => {
    expect(getVerdict({ bite: 70, comfort: 60, skyState: 'day' }).phrase).toBe('Go.')
    expect(getVerdict({ bite: 70, comfort: 59, skyState: 'day' }).phrase).toBe('Biting — but dress for it')
  })
  it('mid bite → pick your window', () => {
    expect(getVerdict({ bite: 55, comfort: 90, skyState: 'day' }).phrase).toBe('Decent — pick your window')
  })
  it('low bite → save it, with better-day handoff in sub', () => {
    const v = getVerdict({ bite: 30, comfort: 90, skyState: 'day', betterDay: { label: 'Wednesday evening', score: 84 } })
    expect(v.phrase).toBe('Save it for tomorrow')
    expect(v.sub).toBe('Wednesday evening looks great — 84')
  })
  it('low bite without a better day has no sub', () => {
    expect(getVerdict({ bite: 30, comfort: 90, skyState: 'day' }).sub).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/verdict.test.ts --no-coverage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `features/score/verdict.ts`:

```ts
import type { ScoreBreakdown } from '../../types/conditions'
import type { SkyState } from '../../theme/skyTheme'

export function computeAxes(
  b: ScoreBreakdown,
  spotType: 'saltwater' | 'freshwater'
): { bite: number; comfort: number } {
  const fresh = spotType === 'freshwater'
  const biteMax = fresh ? 55 : 75
  const bitePts = b.pressure + b.solunar + (fresh ? 0 : b.tide) + b.waterTemp
  const comfortPts = b.wind + b.sky
  return {
    bite: Math.min(100, Math.round((bitePts / biteMax) * 100)),
    comfort: Math.min(100, Math.round((comfortPts / 25) * 100)),
  }
}

export interface Verdict {
  phrase: string
  sub: string | null
}

const GO_FLAVOR: Partial<Record<SkyState, string>> = {
  goldenAM: 'dawn bite is on',
  goldenPM: 'golden hour feed',
  dusk: 'golden hour feed',
  night: 'night bite is live',
}

export function getVerdict(i: {
  bite: number
  comfort: number
  skyState: SkyState
  betterDay?: { label: string; score: number } | null
}): Verdict {
  if (i.bite >= 70 && i.comfort >= 60) {
    const flavor = GO_FLAVOR[i.skyState]
    return { phrase: flavor ? `Go — ${flavor}` : 'Go.', sub: null }
  }
  if (i.bite >= 70) return { phrase: 'Biting — but dress for it', sub: null }
  if (i.bite >= 45) return { phrase: 'Decent — pick your window', sub: null }
  return {
    phrase: 'Save it for tomorrow',
    sub: i.betterDay ? `${i.betterDay.label} looks great — ${i.betterDay.score}` : null,
  }
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/score/verdict.ts __tests__/verdict.test.ts
git commit -m "feat: bite/comfort axes and verdict mapping"
```

---

### Task 6: SkyBackground component

**Files:**
- Create: `features/sky/SkyBackground.tsx`
- Test: `__tests__/SkyBackground.test.tsx`

**Interfaces:**
- Consumes: `SkyTheme` from `theme/skyTheme.ts`; `expo-linear-gradient`; `react-native-reanimated`.
- Produces (Plan 2 wraps Today/Week in this): `SkyBackground({ theme, children }: { theme: SkyTheme; children: React.ReactNode })` — full-bleed animated gradient with a starfield when `theme.state === 'night'`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/SkyBackground.test.tsx`:

```tsx
import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { SkyBackground } from '../features/sky/SkyBackground'
import { getSkyTheme } from '../theme/skyTheme'

const LAT = 38.33
const LNG = -123.05
const DAY = getSkyTheme(new Date('2026-07-07T20:15:00Z'), LAT, LNG, 'clear')
const NIGHT = getSkyTheme(new Date('2026-07-07T09:00:00Z'), LAT, LNG, 'clear')

describe('SkyBackground', () => {
  it('renders children over the gradient', () => {
    const { getByText, getByTestId } = render(
      <SkyBackground theme={DAY}><Text>hello</Text></SkyBackground>
    )
    expect(getByText('hello')).toBeTruthy()
    expect(getByTestId('sky-gradient')).toBeTruthy()
  })
  it('shows stars only at night', () => {
    const day = render(<SkyBackground theme={DAY}><Text>x</Text></SkyBackground>)
    expect(day.queryAllByTestId('sky-star')).toHaveLength(0)
    const night = render(<SkyBackground theme={NIGHT}><Text>x</Text></SkyBackground>)
    expect(night.queryAllByTestId('sky-star').length).toBeGreaterThan(10)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/SkyBackground.test.tsx --no-coverage`
Expected: FAIL — module not found. (If it instead fails on the `expo-linear-gradient` import inside jest, add to `jest.setup.ts`: `jest.mock('expo-linear-gradient', () => { const { View } = require('react-native'); return { LinearGradient: View } })` and note it in your report.)

- [ ] **Step 3: Implement**

Create `features/sky/SkyBackground.tsx`:

```tsx
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import type { SkyTheme } from '../../theme/skyTheme'

interface Props {
  theme: SkyTheme
  children: React.ReactNode
}

// Deterministic star positions (percent-based), rendered only at night.
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: ((i * 37) % 97) + 1,       // 1..98 %
  top: ((i * 23) % 61) + 2,        // 2..62 % (upper sky)
  size: (i % 3) + 1,               // 1..3 px
  opacity: 0.35 + ((i * 13) % 50) / 100,  // 0.35..0.85
}))

export function SkyBackground({ theme, children }: Props) {
  const fade = useSharedValue(0)
  const key = theme.gradientStops.join(',')

  useEffect(() => {
    fade.value = 0
    fade.value = withTiming(1, { duration: 600 })
  }, [key, fade])

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        <LinearGradient
          testID="sky-gradient"
          colors={theme.gradientStops as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />
        {theme.state === 'night' && STARS.map((s, i) => (
          <View
            key={i}
            testID="sky-star"
            style={{
              position: 'absolute',
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: '#FFFFFF',
              opacity: s.opacity,
            }}
          />
        ))}
      </Animated.View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/sky/SkyBackground.tsx __tests__/SkyBackground.test.tsx jest.setup.ts
git commit -m "feat: SkyBackground — animated gradient with night starfield"
```

(Omit `jest.setup.ts` from the add if Step 2 didn't need the mock.)

---

### Task 7: Document the foundation in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** documentation only.

- [ ] **Step 1: Add the new modules to CLAUDE.md**

1. In the **File Map**, under `theme/`, add:

```
  skyTheme.ts            getSkyTheme(date, lat, lng, icon) — time+weather → gradient palette, tinted dark
  tokens.ts              Golden Hour tokens: Radii, Glass, Accent, Fonts (Manrope), Type scale
```

Under `features/score/`, add:

```
    verdict.ts             computeAxes(breakdown, spotType) → bite/comfort; getVerdict() → phrase
```

Under `features/`, add:

```
  sky/SkyBackground.tsx  Animated sky gradient + night starfield (Golden Hour)
```

2. At the end of the **What's Next** section, add:

```markdown
- **Golden Hour redesign in progress:** spec at `docs/superpowers/specs/2026-07-07-golden-hour-redesign-design.md`. Plan 1 (foundation: sky engine, tokens, verdict) is built; Plans 2–4 (Today/Week screens, Species/Spots/Conditions, dynamic species roster) restyle the app to consume it. Until Plan 2 lands, no screen renders the new system.
```

- [ ] **Step 2: Final check and commit**

Run: `npx jest --no-coverage && npx tsc --noEmit`
Expected: PASS.

```bash
git add CLAUDE.md
git commit -m "docs: document Golden Hour foundation modules"
```
