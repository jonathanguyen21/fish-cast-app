# FishCast — Production Readiness Audit

Scope: code review of every screen, feature, and service. No mocks or stubs reviewed.
Goal: surface all bugs, rough edges, and missing polish before App Store submission.

---

## CRITICAL BUGS (will crash or display wrong data)

### 1. Moon detail: illumination shows as "7800%"
**File:** `app/detail/moon.tsx:48`
```tsx
// BUG: moon.illumination is already 0–100 (set in solunarService as Math.round(fraction * 100))
{Math.round(moon.illumination * 100)}% illuminated
// FIX:
{moon.illumination}% illuminated
```

### 2. All detail screens have double headers
**File:** `app/_layout.tsx:81–106`
Every detail screen sets `headerShown: true` AND has a custom `✕ Close` button inside the ScrollView content. Users see two overlapping close controls — the native nav header with a back arrow AND the custom button.
- Fix: set `headerShown: false` on all `detail/*` screens in `_layout.tsx` (the custom buttons already handle dismissal).

### 3. Add Spot: isPro hardcoded to `false`
**File:** `app/spot/new.tsx:23`
```tsx
const isPro = false  // BUG: Pro users can't save more than 1 spot
// FIX:
const isPro = useSettingsStore(s => s.isPro)
```

### 4. Settings: "Upgrade to Pro" button is dead
**File:** `app/(tabs)/settings.tsx:125`
```tsx
<TouchableOpacity style={styles.upgradeButton}>  // no onPress — tapping does nothing
```
Add `onPress` that triggers a paywall or at minimum an `Alert.alert` stub.

### 5. Settings: "Manage Subscription" is unclickable text
**File:** `app/(tabs)/settings.tsx:109`
```tsx
<Text style={styles.manageLink}>Manage Subscription</Text>  // not a button, no handler
```
Should open the OS subscription management URL (`Linking.openURL('itms-apps://...')`).

---

## HIGH — Visual / Chart Bugs

### 6. TideChart: hardcoded 340px width
**File:** `features/tide/TideChart.tsx:15`
```tsx
const CHART_WIDTH = 340  // clips on small screens, wastes space on large ones
```
Use `useWindowDimensions().width - Spacing.screenPad * 2 - Spacing.md * 2`.

### 7. Wind arrow: no wrap-around on direction change
**File:** `features/wind/WindDisplay.tsx:37`
```tsx
rotation.value = withTiming(wind.direction, { duration: 800 })
```
When wind changes from 350° to 10° (NNW → NNE), the arrow spins -340° the wrong way instead of +20° the right way. Compute shortest delta:
```ts
const delta = ((wind.direction - rotation.value) % 360 + 540) % 360 - 180
rotation.value = withTiming(rotation.value + delta, { duration: 800 })
```

### 8. ScoreTimeline: no "now" indicator
**File:** `features/score/ScoreTimeline.tsx`
The hourly bar chart (5AM–8PM) has no visual marker for the current hour. Users can't tell which bar is "now". Add a highlighted border or accent color on the current hour's bar.

### 9. Air temp in ConditionsGrid ignores `tempUnit` setting
**File:** `features/conditions/ConditionsGrid.tsx:56–59`
```tsx
<Text style={cardStyles.value}>{air.temp}°</Text>
<Text style={cardStyles.sub}>H:{air.high}° L:{air.low}°</Text>
```
These always display °F. The water temp quick-stat in `index.tsx` correctly converts, but air temp does not. Add the same conversion logic.

### 10. Swell card tappable with visual feedback even when swell is null
**File:** `features/conditions/ConditionsGrid.tsx:37`
```tsx
<TouchableOpacity style={cardStyles.card} onPress={onPressSwell} activeOpacity={0.75}>
```
When `onPressSwell` is `undefined` (freshwater spot), the card still flashes on tap. Replace with a plain `<View>` when `onPressSwell` is undefined.

### 11. TideChart: G key uses `ev.time` string
**File:** `features/tide/TideChart.tsx:117`
```tsx
<G key={ev.time} testID={...}>
```
If two events share the same time string, React warns about duplicate keys.
Fix: `key={`${ev.type}-${idx}`}`

### 12. PanResponder inside ScrollView causes gesture conflicts
**Files:** `features/tide/TideChart.tsx`, `app/detail/wind.tsx`, `app/detail/airtemp.tsx`, others
Horizontal drag on a chart inside a vertical ScrollView can be intercepted by the ScrollView on iOS. None of the PanResponders set `onStartShouldSetPanResponderCapture` or disable ScrollView scrolling during drag. This makes scrubbing unreliable when scrolled to the chart.

### 13. Dashboard header: hardcoded paddingTop: 56
**File:** `app/(tabs)/index.tsx:272`
```tsx
header: { paddingTop: 56 }
```
This is guessed safe-area padding. On dynamic island iPhones (top inset is 59) or older iPhones (20), the header will be clipped or have too much/too little space. Use `useSafeAreaInsets().top`.

### 14. Detail screens: no safe-area bottom padding
All `app/detail/*.tsx` screens use `paddingBottom: Spacing.xl`. On iPhone X+ with a home bar, the last bit of content may be hidden under the gesture indicator. Use `useSafeAreaInsets().bottom + Spacing.xl`.

---

## MEDIUM — Data / Logic Issues

### 15. useForecast returns stale hardcoded mock data
**File:** `hooks/useForecast.ts`, `data/mockData.ts`
`MOCK_FORECAST` has dates hardcoded to `2026-05-04` through `2026-05-10` and labels like `"Today"`, `"Tue"` that are wrong for any other date. When `isPro = true`, the ForecastStrip shows this stale data.
- Phase B2 (real forecast) is the real fix, but the mock should generate dates relative to `new Date()` so Pro users see plausible day labels.

### 16. DayCalendar: future days have no score dots
**File:** `features/calendar/DayCalendar.tsx:72–76`
Only `isToday && todayScore !== null` gets a colored dot. All other future days show a dark placeholder. Until Phase B2 exists, add a legend or tooltip explaining the dot behavior.
The calendar also lets users navigate to arbitrary past months with no cap. Should block navigation before current month.

### 17. NWS todayKey uses UTC instead of local time
**File:** `services/nwsService.ts:147`
```ts
const todayKey = new Date().toISOString().slice(0, 10)  // UTC date
```
For users in UTC-offset timezones, this gives the wrong date (e.g. 8pm PST = UTC next day). NWS period `startTime` values are in the station's local zone, so `groupByDay` splits them correctly, but `todayPeriods` filter uses the wrong key. Use:
```ts
const n = new Date(); const todayKey = `${n.getFullYear()}-${...}-${...}`
```
(same pattern as `localDateKey` already used elsewhere in the project).

### 18. NWS cloudCover parsing is binary
**File:** `services/nwsService.ts:108`
```ts
cloudCover: p.shortForecast.toLowerCase().includes('cloud') ? 70 : 20
```
Every period is mapped to either 20% or 70%. "Overcast" and "Partly Cloudy" both hit 70. The Sky detail chart's cloud line will look like a step function. Improve mapping:
```ts
const f = p.shortForecast.toLowerCase()
const cloudCover = f.includes('overcast') ? 90
  : f.includes('mostly cloudy') ? 75
  : f.includes('partly') ? 40
  : f.includes('mostly clear') ? 20
  : 10
```

### 19. NWS wind gusts falsy check incorrect
**File:** `services/nwsService.ts:99`
```ts
gusts: currentPeriod.windGust ? parseWindSpeed(currentPeriod.windGust) : windSpeed + 5
```
If `windGust` is `"0 mph"` or `""`, this evaluates as falsy and uses `windSpeed + 5` instead. Use `parseWindSpeed(currentPeriod.windGust ?? '') || windSpeed + 5`.

### 20. ScoreDisplay: SVG gradient id is global
**File:** `features/score/ScoreDisplay.tsx:44`
```tsx
<LinearGradient id="scoreGrad" ...>
```
SVG `id`s are global in the document. If multiple SVGs with `id="scoreGrad"` render simultaneously (e.g. spots list loads a score badge with this same component), the gradient will be shared incorrectly. Prefix with a unique per-instance id.

### 21. Swell height-to-bar calculation edge case
**File:** `app/detail/swell.tsx:146–148`
```tsx
height={innerH - (toYHeight(h.height) - PADDING.top)}
```
If `h.height === 0`, `toYHeight(0) = PADDING.top + innerH`, so height = 0 which renders nothing — correct. But if all swell heights equal the max, every bar fills the chart identically with no visual difference between them. Minor but can look odd.

---

## LOW — UX Polish & App Store Requirements

### 22. No "current location" button in AddSpot map
**File:** `app/spot/new.tsx`
GPS auto-centers on load, but if location permission is slow or denied, the user lands on the default Bodega Bay view with no way to re-trigger centering. Add a location button.

### 23. MapView pinColor doesn't work with hex on iOS
**File:** `app/spot/new.tsx:135, 143`
```tsx
pinColor={Colors.accent}  // Colors.accent is likely a hex like '#0077b6'
```
iOS `MapView.Marker.pinColor` only accepts a predefined set of color names (red, green, blue, purple, etc.). Hex values silently fall back to the default red pin. Use `'#0077b6'` via a custom marker image or the `image` prop instead.

### 24. Settings: version number is hardcoded
**File:** `app/(tabs)/settings.tsx:131`
```tsx
<Text>FishCast v1.0.0</Text>
```
Use `expo-application`'s `Application.nativeApplicationVersion` so it auto-updates.

### 25. Settings: no Privacy Policy / Terms of Service
App Store submission requires a privacy policy URL. The Settings screen has no link. Add a row that opens a URL.

### 26. No empty state when all species are inactive
**File:** `app/(tabs)/index.tsx:212–224`
If all species have `score === 0` and `status === 'Inactive'` (e.g. dead of winter), the "What's Biting" section renders a long list of greyed rows. A single "Nothing active this time of year" empty state would be cleaner.

### 27. SpeciesDetail: score badge missing
**File:** `app/species/[id].tsx`, `features/species/SpeciesDetail.tsx`
The species detail modal shows bio data but no fishing score badge at the top. The score is available in `speciesScore.score` but not displayed.

### 28. DayCalendar: no visual legend for dot colors
**File:** `features/calendar/DayCalendar.tsx`
Score dots use the same color scale as everywhere else, but new users have no idea what the dots mean. Add a one-line legend below the grid: `● Today's score · 🔒 Pro only`.

### 29. All detail modals: no swipe-to-close instruction
**File:** all `app/detail/*.tsx`
Modals presented with `presentation: 'modal'` support iOS swipe-down-to-close, but no visual hint exists (no drag handle). Consider adding a `<View style={handleStyle}>` at the top of each modal.

### 30. Spots screen: "Hold to delete" hint is always visible
**File:** `app/(tabs)/spots.tsx:39`
```tsx
<Text style={styles.rowHint}>Hold to delete</Text>
```
This hint renders on every row permanently, which is noisy and wastes vertical space. Consider showing it only on a long-press focus, or as a swipe-to-delete action.

### 31. ScoreTimeline Pro banner overlaps the last bar
**File:** `features/score/ScoreTimeline.tsx:47–52`
The "🔒 Unlock detailed hourly breakdown" banner sits right below the bars. On small screens, the banner can visually crowd the last few score labels. Add `marginTop: Spacing.md` or a divider.

### 32. No loading skeleton / shimmer
When data is loading the first time, a full-screen spinner appears. Consider adding per-card placeholder skeletons so the layout doesn't jump when data arrives.

---

## PHASE B2 SCOPE (not bugs, but required before Pro launch)

- **`forecastService.ts`**: throws `'Phase B2: not yet implemented'` — ForecastStrip in Pro mode shows mock data
- **`useForecast.ts`**: returns MOCK_FORECAST — needs real 7-day NWS gridpoint implementation
- **`DayCalendar` future score dots**: need forecast data to color future days
- **Northeast / Southeast / Freshwater species data**: all stub empty arrays

---

## Quick-win order of attack

1. Fix moon illumination bug (#1) — one line
2. Remove double headers on detail screens (#2) — one config change in `_layout.tsx`
3. Fix isPro in AddSpot (#3) — one line
4. Fix dead Settings buttons (#4, #5) — two onPress handlers
5. Fix NWS todayKey UTC bug (#17) — one line, can cause wrong data for all US timezones
6. Air temp unit conversion (#9) — small utility addition
7. TideChart dynamic width (#6) — add useWindowDimensions
8. Wind wrap-around (#7) — short math fix
9. ScoreTimeline now-indicator (#8) — visual polish, high user value
10. Generate mock forecast dates dynamically (#15) — prevents embarrassing stale dates for Pro users
