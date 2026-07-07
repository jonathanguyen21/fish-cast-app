# FishCast "Golden Hour" — Repivot & Redesign Spec

**Date:** 2026-07-07
**Status:** Approved direction, pending implementation plan
**Decided with:** visual companion session (mockups in `.superpowers/brainstorm/1008811-1783408579/content/`)

---

## Positioning & Differentiation

**One line:** *"Should I go fishing?" answered beautifully — private, explainable, at your spots.*

Anglers' recurring needs, in order: (1) when should I go, (2) where should I go, (3) what's biting, (4) will it be safe/comfortable, (5) keep my spots private. Existing apps fail these in specific ways: Fishbrain is social-bloated and burns spots; Windy/tide apps are excellent single-variable data with zero fishing interpretation; solunar/forecast apps are black-box scores wearing 2012-era UI.

FishCast's answer:

- **Answers the question instead of displaying data.** Verdict-first, plain language.
- **Explainable score = trust moat.** The free breakdown ("falling pressure +25, major solunar +20") is the counter to black-box competitor scores. Never paywall the explanation.
- **Bite × Comfort split** — no major app separates "fish are active" from "you'll enjoy it." It is also honest, which compounds trust.
- **Fusion at your spot** — NOAA tides + NWS weather + Open-Meteo swell + solunar into one interpreted answer, per saved spot.
- **Private by design** — no feed, no community, nobody sees your spots.
- **Experience as differentiation** — the living-sky design is the AllTrails playbook: win a dated category on experience quality.

Honest limits: solunar is folk-science-adjacent (explainability keeps the score credible); species *behavior* data is editorial rather than crowd-sourced — mitigated by the dynamic local roster (OBIS/GBIF occurrence data decides which species show per spot), with the shelved catch log as the long-term answer ("your spot's learned pattern"); condition data sources are US-only.

**Identity:** Robinhood/Copilot boldness × AllTrails outdoors. Direction chosen from three mockups: **Golden Hour** — dynamic time-of-day + weather-reactive sky, glassy cards, bold numerals.

---

## Product Structure

**Four tabs: Today · Week · Species · Spots.** Settings moves to a gear icon in the Today header.

| Surface | Job | Sky treatment |
|---|---|---|
| Today | "Should I go right now?" | Full dynamic sky |
| Week | "When should I go?" | Full dynamic sky; day cards carry per-day mini-skies |
| Species | "What's biting?" | Calm tinted-dark (sky-hued near-black) |
| Spots | "Where?" — manage/switch spots | Calm tinted-dark |

Removed from navigation (shelved, not deleted — see Shelving): Catch Log tab, the dashboard day-picker calendar (Week replaces it).

---

## The Verdict System (repivot core)

The existing scoring engine's per-factor breakdown is regrouped into two visible axes. **No changes to scoring math** — this is a presentation-layer grouping.

- **Bite** (fish behavior): pressure + solunar + tide + water temp → `round(points / maxPoints × 100)`
- **Comfort** (your experience): wind + sky → `round(points / maxPoints × 100)`
- **Overall score** stays the existing 0–100.

**Hero contents:** verdict phrase + one-line reason + big score + Bite/Comfort chips.

Verdict phrase mapping (pure function of bite, comfort, overall):

| Condition | Verdict flavor |
|---|---|
| bite ≥ 70, comfort ≥ 60 | "Go." / "Drop everything" |
| bite ≥ 70, comfort < 60 | "Biting — but dress for it" |
| bite 45–69 | "Decent — pick your window" |
| bite < 45 | "Save it for tomorrow" |

The one-line reason is derived from the top contributing factor notes already produced by `calculateScoreBreakdown`. When today is poor and a better day exists, the verdict hands off: *"Tough today — Wednesday evening looks great"* (existing better-day logic, re-homed).

Time-of-day flavor is allowed in copy ("golden hour feed," "dawn bite") driven by the sky engine state.

---

## Screens

### Today (hero)

Full-bleed dynamic sky. Top: spot name + date/time, gear icon. Hero: verdict phrase, one-line reason, big score (count-up animation), Bite/Comfort chips. Then: today's bite curve (24h sparkline, best-window band highlighted, NOW dot), then a 3-chip condition row (tide / wind / active species). Tapping the score opens the existing free breakdown sheet (restyled). Tapping condition chips deep-links into the Conditions screen. Tapping the species chip jumps to the Species tab.

### Week

Full dynamic sky (current state). Header: "When should you go?" + best-day callout. Seven vertical day cards, each with: a mini-sky swatch rendered from that day's forecast sky at its best-window start hour, day label + sky word, best window + one condition note, score. Best day gets an amber ring + "BEST" tag and sorts pinned under Today. Tap a day → day detail (restyled version of the existing day modal: hourly scores, tides, sun/solunar). Pro gate unchanged in logic: free users get today + tomorrow; remaining days render as blurred locked cards.

### Species

Calm tinted-dark. Keeps: Active Right Now (top 3), All Species list with score badges, per-species hourly bite chart, species detail screen. Restyle only — no scoring-logic changes. Empty/uncovered-region states keep existing copy. Gains the dynamic local roster (below) as the final implementation phase.

### Spots

Calm tinted-dark. Keeps map + spot list + add-spot flow. Each spot row gains a live score chip. Restyle only.

### Conditions (consolidation: 7 screens → 1)

One scrollable screen with sections: Tide (interactive scrub chart), Wind (hourly), Pressure (trend chart), Swell, Air temp, Sky/rain, Sun & Moon (solunar periods). Deep-linked by section from Today's condition chips. Replaces the seven separate `/detail/*` screens. Existing chart components are reused restyled, not rewritten.

---

## The Sky Engine

One pure module: `theme/skyTheme.ts`.

```
getSkyTheme(date: Date, lat: number, lng: number, skyIcon: SkyIcon): SkyTheme
SkyTheme = { gradientStops: string[], textTint: string, accent: string, isLight: boolean, state: SkyState }
SkyState = night | dawn | goldenAM | day | goldenPM | dusk
```

- **Time-of-day** from `suncalc` sun altitude (already a dependency): night / dawn / golden AM / day / golden PM / dusk thresholds.
- **Weather** from the NWS sky icon: clear / partly / overcast / rain progressively mute the palette toward gray-blues.
- **Tinted-dark derivation** for Species/Spots: current sky's dominant hue mixed at low saturation into a near-black base — one function, same module.
- **Rendering:** `expo-linear-gradient`, crossfaded with `reanimated` on state change. Night adds a lightweight starfield (absolutely-positioned dots, no canvas). V1 is gradients only — no shaders, no Skia, no images.
- Fully unit-testable: (time, location, icon) → expected state and palette.

---

## Dynamic Local Species Roster (final phase — ships after the redesign)

**Principle: dynamic roster, editorial brains.** The curated species profiles (behavior, tide/time preferences, tips) stay — they power scoring and are the moat. What becomes dynamic is *which* species appear at a spot and *in what order*, driven by real biodiversity occurrence records.

- **Service:** `services/speciesOccurrenceService.ts` — `fetchLocalAbundance(spot) → Record<scientificName, AbundanceTier>`. Saltwater spots query **OBIS** (`api.obis.org` checklist within ~40 km of the spot); freshwater spots query **GBIF** occurrence counts. Both are free, no-auth JSON APIs called with plain `fetch`, matching the existing service pattern. Join key: the `scientific_name` field every species record already carries.
- **Tiers:** relative record counts → `common | occasional | rare | not-recorded`.
- **Display:** abundance chip on species cards ("Common here" / "Occasional"); list ranked by tier weight, then live score. `not-recorded` species collapse under an "Also in this region" section rather than disappearing.
- **Honesty:** chips are labeled as *observed near here* (public biodiversity records) — observation data is popularity-biased, so no fake precision.
- **Caching:** TanStack Query keyed by `spot.id`, staleTime 7 days, gcTime 30 days, AsyncStorage-persisted (occurrence data changes slowly).
- **Fallback:** API failure or zero records → current static region list, no chips. The feature can never make the tab worse than today.

---

## Design Tokens & Typography

- **Font:** Manrope via `@expo-google-fonts/manrope` (+ already-installed `expo-font`). Weights 500 / 700 / 800. Big numerals get tight letter-spacing.
- **The 11px-uppercase-gray-label pattern is banned app-wide.** Replaced by 13px sentence-case secondary text. (This is the single biggest "old website" fix.)
- **Surfaces:** on sky screens, glass cards — `rgba` white fills + 1px `rgba` white borders (+ blur where supported); on tinted-dark screens, opaque cards derived from the sky hue.
- **Accent:** warm amber family (`#FFD9A0` anchor) for highlights/best-window; score colors retain semantic green/amber/red ramp.
- **Radii:** 16–22 (cards), up from 12.
- Old `Colors.background/surface/card` navy trio is replaced by the new token set; `theme/colors.ts` becomes the compatibility shim during migration and dies at the end.

---

## Motion (entire budget — four effects)

1. Score count-up on Today load (reanimated).
2. Sky gradient crossfade on state change.
3. Card press scale to 0.97.
4. Bite-curve draw-in, once per visit.

Plus one light haptic (`expo-haptics`) when the verdict lands. Nothing else — restraint is the aesthetic.

---

## Shelving (hidden, not deleted)

- Catch Log tab, AuthModal, Supabase auth UI entry points. Services/stores/tests stay.
- Per-species alerts section in Settings (store fields stay).
- Seven `/detail/*` screens + DayCalendar replaced per above; delete after the Conditions screen ships.

---

## New Dependencies (all Expo Go-safe)

`expo-linear-gradient` · `@expo-google-fonts/manrope` · `expo-haptics`. Nothing else.

---

## Testing

- **Pure units:** sky engine (time/location/icon → state + palette), verdict mapping (bite/comfort/overall → phrase), bite/comfort grouping (breakdown → axes), abundance tiering + roster ranking (counts → tiers → sort order).
- **Service tests:** `speciesOccurrenceService` with mocked `fetch` + OBIS/GBIF fixture JSON, matching the existing service-test pattern.
- **Existing suite:** all current tests stay green where logic is untouched; scoring engine internals do not change.
- **Component tests:** Today hero (verdict renders per state), Week day cards (best-day pin, Pro lock), Conditions screen sections.
- **Device verification:** Expo Go over the established ngrok tunnel; check dawn/day/dusk/night states by mocking the sky engine clock.

## Out of Scope (this effort)

Catch-log revival, regulations data, non-US data sources, social features (never), Skia/shader skies, paywall changes (existing Pro gates keep their logic, restyled).
