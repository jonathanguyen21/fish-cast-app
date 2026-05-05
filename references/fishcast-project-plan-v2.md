# FishCast — Complete Project Plan v2
### "Open app. See your spot. Know if you should go."

---

## Table of Contents
1. Product Vision
2. Development Philosophy: Frontend-First
3. Design Direction
4. Feature Breakdown
5. Fishing Score Algorithm
6. "What's Biting" Species Database
7. Static Data / Mock Data Guide
8. Screen-by-Screen Build Plan
9. Phase 2: Backend Integration (APIs)
10. API Reference Guide
11. Tech Stack & Costs
12. Monetization
13. Go-To-Market
14. Claude Prompts for Each Build Phase

---

## 1. Product Vision

A mobile app that replaces the 3-4 apps/websites anglers check before every fishing trip with ONE clean screen per spot. Combines real-time weather, wind visualization, tides, water conditions, a fishing score, and species migration data.

**Target User:** Recreational saltwater and freshwater anglers in the US (60M+ people).

**Core Problem:** Before every trip, anglers manually check wind (Windy), tides (NOAA), weather (Weather app), water temp (buoy data), swell (Surfline) — then mentally combine it all. Nobody combines these into one fishing-optimized view with a single score.

**One-liner pitch:** "I used to check 4 apps before every fishing trip. So I built one that does it all and tells me if I should go."

---

## 2. Development Philosophy: Frontend-First

We build the entire UI with hardcoded/static data first. This lets us:
- See and feel the app immediately
- Iterate on design without API complexity
- Test on a real phone via Expo Go from day one
- Swap static data for real API data later with minimal UI changes

### The Two Phases:

**Phase A: Frontend + Static Data (Weeks 1-6)**
Build every screen, every component, every animation using mock JSON data.
The app looks and feels 100% real — it just shows the same data every time.

**Phase B: Backend Integration (Weeks 7-10)**
Replace static data with real API calls, one data source at a time.
Add AsyncStorage for saving spots. Add RevenueCat for subscriptions.
Each swap is isolated — the UI doesn't change, only where data comes from.

---

## 3. Design Direction

### Aesthetic: "Maritime Instrument" meets "Modern Weather App"
Think: the precision of a nautical chart + the clarity of Apple Weather + the personality of a well-worn tackle box.

### Color Palette
```
Background (dark):    #0B1622  (deep navy, like predawn water)
Surface:              #142233  (slightly lighter navy)
Card:                 #1A2D42  (card surfaces)
Primary accent:       #00C9A7  (sea foam green — scores, CTAs)
Secondary accent:     #3B82F6  (ocean blue — tide charts, water data)
Warning:              #F59E0B  (amber — caution scores)
Danger:               #EF4444  (red — bad conditions)
Success:              #10B981  (green — great conditions)
Text primary:         #F1F5F9  (near white)
Text secondary:       #94A3B8  (muted slate)
Text tertiary:        #64748B  (subtle labels)
```

### Typography
- **Score number:** Large, bold, monospace-style (e.g., "87")
- **Headers:** Clean sans-serif, medium weight
- **Body/data:** System font for readability at small sizes
- Use tabular numbers for data (so digits don't shift width)

### Design Principles
1. **Data density done right** — lots of info, never cluttered
2. **Glanceable** — the score and key conditions visible without scrolling
3. **Dark theme default** — easier on eyes at dawn/dusk (when anglers use it)
4. **Color = meaning** — green/yellow/red consistently signal good/okay/bad
5. **Subtle motion** — wind arrows drift, tide line animates, score pulses on change

---

## 4. Feature Breakdown

### MVP Features (v1.0)

| Feature | Priority | Description |
|---------|----------|-------------|
| Spot Dashboard | P0 | One-screen view of all conditions for a saved spot |
| Fishing Score | P0 | 0-100 composite score with color and label |
| Tide Chart | P0 | Visual curve showing today's tides, current level highlighted |
| Wind Display | P0 | Speed, direction, gusts with directional arrow |
| Water Temperature | P0 | Current reading from nearest NOAA station |
| Air Temperature | P0 | Current + today's high/low |
| Barometric Pressure | P0 | Current reading + trend arrow (rising/falling/stable) |
| Swell / Waves | P1 | Height, period, direction |
| Cloud Cover / Rain | P1 | Current + forecast |
| Moon Phase | P1 | Current phase icon + solunar major/minor periods |
| Sunrise / Sunset | P1 | Display times with icons |
| Saved Spots | P0 | Add, name, and switch between spots |
| Score Timeline | P1 | Hour-by-hour score chart showing best window today |

### v1.5 Features
| Feature | Description |
|---------|-------------|
| What's Biting | Species cards showing what's active at your spot right now |
| Smart Alerts | Push notification when score exceeds your threshold |
| Multi-Day Forecast | 7-day fishing score outlook |
| Wind Map | Animated wind vectors overlaid on map |

### v2.0 Features
| Feature | Description |
|---------|-------------|
| Species Migration Map | Visual overlay showing migration corridors by month |
| Apple Watch | Glanceable score widget |
| iOS Widget | Home screen score for favorite spot |
| Spot Sharing | Share a spot via link |
| Historical Comparison | "Last year today, conditions were..." |

---

## 5. Fishing Score Algorithm

### Inputs & Weights (total: 100 points)

#### Barometric Pressure Trend (25 pts)
| Condition | Points | Why |
|-----------|--------|-----|
| Falling slowly | 25 | Fish feed aggressively before storms |
| Stable high (>30.10 inHg) | 20 | Consistent feeding patterns |
| Stable normal (29.90-30.10) | 15 | Average conditions |
| Rising slowly | 10 | Fish becoming less active |
| Falling rapidly | 8 | Storm imminent, short window |
| Rising rapidly | 5 | Post-front, fish have lockjaw |

#### Solunar Period (20 pts)
| Condition | Points | Why |
|-----------|--------|-----|
| During major period (±45 min) | 20 | Moon overhead/underfoot, peak gravity |
| During minor period (±30 min) | 14 | Moonrise/moonset |
| Within 1hr of any period | 10 | Transitional activity |
| New or Full moon day | +3 bonus | Strongest gravitational pull |
| Outside all periods | 5 | Baseline activity |

#### Tide Movement (20 pts) — saltwater only
| Condition | Points | Why |
|-----------|--------|-----|
| Last 2hrs of incoming | 20 | Bait pushed to shore/structure |
| First 2hrs of outgoing | 18 | Bait flushing from estuaries |
| Mid incoming | 15 | Good water movement |
| Mid outgoing | 12 | Decent movement |
| First hr of incoming | 10 | Water just starting to move |
| Slack tide | 5 | No movement, fish less active |
| *Freshwater spots* | *Redistributed* | *20 pts spread to other factors* |

#### Wind (15 pts)
| Condition | Points | Why |
|-----------|--------|-----|
| Light breeze 5-12 mph | 15 | Surface chop, moves bait, fish feel safe |
| Moderate 13-18 mph | 10 | Fishable, position matters |
| Calm < 5 mph | 8 | Too still, fish are spooky in shallows |
| Strong 19-25 mph | 5 | Tough conditions |
| Gale > 25 mph | 0 | Unsafe / unfishable |

#### Water Temperature (10 pts)
| Condition | Points | Why |
|-----------|--------|-----|
| Within species peak range | 10 | Optimal metabolism and feeding |
| Within 5°F of range | 7 | Active but not peak |
| Within 10°F of range | 4 | Sluggish |
| Outside range | 2 | Fish largely inactive |

#### Cloud Cover & Precipitation (10 pts)
| Condition | Points | Why |
|-----------|--------|-----|
| Overcast | 10 | Fish feed confidently, less line-shy |
| Partly cloudy | 8 | Good balance |
| Light rain | 7 | Great fishing, uncomfortable for angler |
| Clear/sunny | 5 | Fish hold deeper, feed at edges of day |
| Heavy rain/storms | 0 | Unsafe |

### Score Display
| Score | Color | Label |
|-------|-------|-------|
| 85-100 | Green | "Drop everything and go" |
| 70-84 | Green | "Great day to fish" |
| 55-69 | Yellow/Amber | "Decent — pick your window" |
| 40-54 | Yellow/Amber | "Tough but possible" |
| 0-39 | Red | "Stay home" |

---

## 6. "What's Biting" — Species Database

### Data Structure Per Species
```json
{
  "id": "striped_bass_northeast",
  "common_name": "Striped Bass",
  "scientific_name": "Morone saxatilis",
  "image": "striped_bass.png",
  "region": "northeast_us",
  "type": "saltwater",
  "months_present": [4, 5, 6, 7, 8, 9, 10, 11],
  "months_peak": [5, 6, 9, 10],
  "water_temp_f": {
    "min": 50,
    "max": 72,
    "peak_min": 55,
    "peak_max": 65
  },
  "preferred_tide": "incoming",
  "preferred_time_of_day": ["dawn", "dusk", "night"],
  "preferred_structure": ["rocky points", "jetties", "inlets", "river mouths"],
  "migration_notes": "Migrate north along coast in spring following bait (bunker, herring). Move south in fall. Feed aggressively on outgoing tide near inlets.",
  "tips": "Try topwater at dawn during fall run. Live bunker near inlets on outgoing tide."
}
```

### Species Score (per species, 0-100)
| Factor | Points | Source |
|--------|--------|--------|
| Month match (is this fish here now?) | 40 | Calendar vs months_present/peak |
| Water temp match | 30 | NOAA water temp vs species range |
| Tide match | 15 | Current tide phase vs preferred_tide |
| Time of day match | 15 | Current time vs preferred_time_of_day |

### MVP Approach
- Start with YOUR local region only: 15-20 most popular species
- Curate manually from state fish & wildlife sites + personal knowledge
- Store as a local JSON file in the app (no backend needed for v1)
- Expand regions over time based on user requests

---

## 7. Static Data / Mock Data Guide

All screens built first with this hardcoded data. Stored in a `/data/mockData.ts` file.

### Mock Spot
```typescript
export const MOCK_SPOT = {
  id: "spot_1",
  name: "Montauk Point",
  lat: 41.0712,
  lng: -71.8573,
  nearestStation: "8510560",
  type: "saltwater"
};
```

### Mock Conditions
```typescript
export const MOCK_CONDITIONS = {
  fishingScore: 82,
  scoreLabel: "Great day to fish",
  bestWindow: { start: "2:00 PM", end: "5:00 PM", score: 91 },

  wind: {
    speed: 8,
    gusts: 14,
    direction: 225,
    directionLabel: "SW",
    unit: "mph"
  },

  tide: {
    current: { height: 3.2, rising: true, unit: "ft" },
    next: { type: "high", time: "3:42 PM", height: 5.1 },
    events: [
      { type: "low",  time: "9:18 AM",  height: 0.3 },
      { type: "high", time: "3:42 PM",  height: 5.1 },
      { type: "low",  time: "9:55 PM",  height: 0.8 },
      { type: "high", time: "4:12 AM",  height: 4.6 }
    ],
    // Hourly heights for drawing the tide curve (24 data points)
    hourlyCurve: [0.8, 0.5, 0.3, 0.5, 1.1, 1.9, 2.8, 3.6, 4.3, 4.8, 5.0, 5.1,
                  4.9, 4.5, 3.8, 3.0, 2.2, 1.5, 1.0, 0.8, 0.9, 1.3, 1.9, 2.7]
  },

  water: {
    temp: 62,
    unit: "°F"
  },

  air: {
    temp: 68,
    high: 72,
    low: 58,
    humidity: 74,
    unit: "°F"
  },

  pressure: {
    value: 30.02,
    trend: "falling",
    unit: "inHg"
  },

  swell: {
    height: 3.2,
    period: 8,
    direction: 180,
    directionLabel: "S",
    unit: "ft"
  },

  sky: {
    condition: "Partly Cloudy",
    rain_chance: 20,
    icon: "partly-cloudy"
  },

  sun: {
    sunrise: "5:42 AM",
    sunset: "8:12 PM"
  },

  moon: {
    phase: "Waxing Gibbous",
    illumination: 78,
    icon: "waxing-gibbous",
    majorPeriods: [
      { start: "2:15 PM", end: "4:15 PM" },
      { start: "2:45 AM", end: "4:45 AM" }
    ],
    minorPeriods: [
      { start: "8:30 AM", end: "9:30 AM" },
      { start: "9:00 PM", end: "10:00 PM" }
    ]
  },

  // Hour-by-hour fishing scores for the timeline chart
  hourlyScores: [
    { hour: "5AM", score: 65 }, { hour: "6AM", score: 72 },
    { hour: "7AM", score: 68 }, { hour: "8AM", score: 55 },
    { hour: "9AM", score: 48 }, { hour: "10AM", score: 42 },
    { hour: "11AM", score: 38 }, { hour: "12PM", score: 45 },
    { hour: "1PM", score: 58 }, { hour: "2PM", score: 78 },
    { hour: "3PM", score: 91 }, { hour: "4PM", score: 88 },
    { hour: "5PM", score: 82 }, { hour: "6PM", score: 75 },
    { hour: "7PM", score: 70 }, { hour: "8PM", score: 62 }
  ]
};
```

### Mock Species (What's Biting)
```typescript
export const MOCK_SPECIES = [
  {
    name: "Striped Bass",
    score: 88,
    status: "Peak Season",
    waterTempMatch: "In range (62°F — ideal 55-65°F)",
    tideMatch: "Incoming — preferred",
    timeMatch: "Approaching dusk — prime time",
    tip: "Try topwater near rocky points on the incoming tide"
  },
  {
    name: "Bluefish",
    score: 74,
    status: "Active",
    waterTempMatch: "In range (62°F — ideal 60-72°F)",
    tideMatch: "Incoming — good",
    timeMatch: "Midday — secondary",
    tip: "Look for surface blitzes near bait schools"
  },
  {
    name: "Fluke",
    score: 51,
    status: "Present",
    waterTempMatch: "Slightly cool (62°F — ideal 66-74°F)",
    tideMatch: "Incoming — neutral for fluke",
    timeMatch: "Afternoon — okay",
    tip: "Drift bucktails along sandy bottom near channel edges"
  }
];
```

---

## 8. Screen-by-Screen Build Plan

### Screen 1: Spot Dashboard (Main Screen)
**This is the heart of the app — build this first.**

Layout (top to bottom):
```
┌─────────────────────────────────┐
│ 📍 Montauk Point          ⚙️   │  ← Spot name + settings
├─────────────────────────────────┤
│         82                      │
│   Great day to fish             │  ← BIG score + label
│   Best: 2-5pm (Score 91)       │  ← Best window callout
├─────────────────────────────────┤
│ ╭─ Score Timeline ────────────╮ │
│ │  ▁▃▅▇█▇▆▅▃▁  (bar chart)   │ │  ← Hourly scores
│ ╰─────────────────────────────╯ │
├─────────────────────────────────┤
│ 💨 Wind     🌊 Tide     🌡 Water│
│ 8 mph SW    Rising 3.2ft  62°F │  ← Quick stats row
├─────────────────────────────────┤
│ ╭─ Tide Chart ────────────────╮ │
│ │  ╱╲    ╱╲                   │ │  ← SVG tide curve
│ │ ╱  ╲  ╱  ╲   H 3:42pm 5.1' │ │
│ │╱    ╲╱    ╲  L 9:55pm 0.8' │ │
│ ╰─────────────────────────────╯ │
├─────────────────────────────────┤
│ ╭─ Conditions Grid ───────────╮ │
│ │ Pressure   Swell    Air     │ │
│ │ 30.02↘     3.2ft    68°F   │ │  ← Detailed conditions
│ │ falling    8s S     H:72 L:58│ │
│ │                              │ │
│ │ Sky        Moon     Sun     │ │
│ │ ⛅ Partly  🌔 78%   ☀ 5:42a │ │
│ │ Rain: 20%  Major 2p 🌅 8:12p │ │
│ ╰─────────────────────────────╯ │
├─────────────────────────────────┤
│ ╭─ What's Biting ─────────────╮ │
│ │ 🐟 Striped Bass    88  Peak │ │
│ │ 🐟 Bluefish        74  Good │ │  ← Species cards
│ │ 🐟 Fluke           51  Fair │ │
│ ╰─────────────────────────────╯ │
└─────────────────────────────────┘
```

### Screen 2: Spots List
- List of saved spots with current score for each
- "Add Spot" button → map picker or search
- Swipe to delete

### Screen 3: Add Spot
- Map view (react-native-maps)
- Drop a pin or search by location name
- Name your spot
- Set type: Saltwater / Freshwater

### Screen 4: Species Detail (tap a species card)
- Full species info
- Seasonal activity chart (12-month heatmap bar)
- Preferred conditions breakdown
- Fishing tips
- "You are here" marker on the seasonal chart

### Screen 5: Settings
- Notification preferences (score threshold slider)
- Units (°F/°C, mph/kts, ft/m)
- Manage subscription (RevenueCat)

---

## 9. Phase 2: Backend Integration (APIs)

After the frontend is complete with static data, swap in real data one source at a time:

### Integration Order (do one at a time, test each before moving on)

| Order | Data Source | Replaces Mock Data For | Difficulty |
|-------|------------|----------------------|------------|
| 1 | NOAA CO-OPS | Tides, water level, wind, water temp, pressure | Medium |
| 2 | NWS Weather API | Air temp, forecast, cloud cover, rain | Easy |
| 3 | Open-Meteo Marine | Swell height, period, direction | Easy |
| 4 | Solunar Calc (local) | Moon phase, major/minor periods | Easy (math) |
| 5 | Scoring Algorithm | Fishing score (combines all above) | Medium |
| 6 | AsyncStorage | Saved spots persistence | Easy |
| 7 | RevenueCat | Subscriptions / paywall | Medium |

### Architecture Pattern
```
/services/
  noaaService.ts      ← fetches from NOAA CO-OPS API
  nwsService.ts       ← fetches from NWS Weather API
  marineService.ts    ← fetches from Open-Meteo Marine API
  solunarService.ts   ← local moon/sun calculations
  scoringService.ts   ← combines all data into fishing score

/hooks/
  useConditions.ts    ← single hook that returns all conditions for a spot
                         (starts with mock data, swap to real services later)
```

The key: `useConditions(spot)` returns the same data shape whether it's using mock data or real APIs. The UI components never know the difference.

---

## 10. API Reference Guide

### NOAA CO-OPS API (FREE — no key needed)

**Base URL:** `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`

**Always use these params:**
- `datum=MLLW` (Mean Lower Low Water — standard tide reference for fishing)
- `units=english` (feet, °F, mph)
- `time_zone=lst_ldt` (local time with daylight savings)
- `format=json`
- `application=FishCast` (identify your app — NOAA asks for this)

**Get today's tide predictions:**
```
?date=today&station=8510560&product=predictions&datum=MLLW
&interval=hilo&units=english&time_zone=lst_ldt&format=json&application=FishCast
```

**Get hourly tide predictions (for drawing the curve):**
```
?date=today&station=8510560&product=predictions&datum=MLLW
&interval=h&units=english&time_zone=lst_ldt&format=json&application=FishCast
```

**Get current water level (actual, not predicted):**
```
?date=latest&station=8510560&product=water_level&datum=MLLW
&units=english&time_zone=lst_ldt&format=json&application=FishCast
```

**Get wind data:**
```
?date=latest&station=8510560&product=wind
&units=english&time_zone=lst_ldt&format=json&application=FishCast
```

**Get water temperature:**
```
?date=latest&station=8510560&product=water_temperature
&units=english&time_zone=lst_ldt&format=json&application=FishCast
```

**Get barometric pressure:**
```
?date=latest&station=8510560&product=air_pressure
&units=english&time_zone=lst_ldt&format=json&application=FishCast
```

**Get air temperature:**
```
?date=latest&station=8510560&product=air_temperature
&units=english&time_zone=lst_ldt&format=json&application=FishCast
```

**Finding the nearest station to a spot:**
```
https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json
?type=waterlevels&units=english
```
Returns all stations with lat/lng. Calculate distance from the user's spot and pick the closest.

**Important notes:**
- Not every station has every product (some have tides but not water temp)
- Check station metadata to see available products
- Cache aggressively — tides don't change minute to minute
- MLLW datum means 0 = average lowest tide. Heights above 0 = water above that mark. Negative = unusually low tide.

### NWS Weather API (FREE — no key needed)

**Step 1: Get the forecast grid for a lat/lng:**
```
GET https://api.weather.gov/points/{lat},{lng}
Headers: { "User-Agent": "FishCast (your@email.com)" }
```
Returns a `forecast` URL.

**Step 2: Get the forecast:**
```
GET {forecast_url_from_step_1}
```
Returns periods with temperature, wind, cloud cover, rain chance, and descriptions.

**Step 3: Get hourly forecast (for detailed data):**
```
GET {forecastHourly_url_from_step_1}
```

### Open-Meteo Marine API (FREE for reasonable use)

**Get swell/wave data:**
```
GET https://marine-api.open-meteo.com/v1/marine
?latitude={lat}&longitude={lng}
&hourly=wave_height,wave_period,wave_direction,
swell_wave_height,swell_wave_period,swell_wave_direction
&timezone=auto
```

No API key needed. Returns hourly data for 7 days.

### Solunar Calculations (LOCAL — no API)

Use the `suncalc` npm package:
```bash
npx expo install suncalc
```

```typescript
import SunCalc from 'suncalc';

const times = SunCalc.getTimes(new Date(), lat, lng);
// times.sunrise, times.sunset, times.dawn, times.dusk

const moonTimes = SunCalc.getMoonTimes(new Date(), lat, lng);
// moonTimes.rise, moonTimes.set

const moonIllumination = SunCalc.getMoonIllumination(new Date());
// moonIllumination.fraction (0-1), moonIllumination.phase (0-1)

const moonPosition = SunCalc.getMoonPosition(new Date(), lat, lng);
// moonPosition.altitude — when altitude ≈ max → major period (moon overhead)
// moonPosition.altitude ≈ min → major period (moon underfoot)
// Moon rise/set times → minor periods
```

**Major solunar periods:** ±45 minutes of moon transit (overhead) and anti-transit (underfoot)
**Minor solunar periods:** ±30 minutes of moonrise and moonset

---

## 11. Tech Stack & Costs

### Stack
| Layer | Tool | Why |
|-------|------|-----|
| Framework | Expo + React Native (SDK 52+) | Cross-platform, Expo Go for testing |
| Language | TypeScript | Type safety for data-heavy app |
| Maps | react-native-maps | Built-in MapKit support |
| Charts | react-native-svg | Tide curves, score timelines |
| Animations | react-native-reanimated | Smooth score dial, wind arrows |
| Local storage | AsyncStorage | Saved spots, preferences |
| Moon/Sun calc | suncalc | Solunar periods, no API needed |
| Subscriptions | RevenueCat (react-native-purchases) | Handles App Store billing |
| Backend (later) | Supabase (optional) | User accounts, cloud sync |
| Build | EAS Build (cloud) | No powerful Mac needed |
| Test | Expo Go on iPhone | Fast iteration, no simulator |

### Costs Summary
| Item | Cost | When |
|------|------|------|
| Apple Developer Account | $99/year | Before App Store submission |
| All APIs (NOAA, NWS, Open-Meteo) | $0 | Always free |
| Solunar calculations | $0 | Local math, no API |
| RevenueCat | $0 | Free until $2,500/mo revenue |
| Supabase | $0 | Free tier (add later if needed) |
| EAS Build (free tier) | $0 | 30 builds/month free |
| Domain name | ~$12/year | For landing page |
| **Total to launch** | **~$111** | |
| **Monthly operating cost** | **~$9** | |

---

## 12. Monetization

### Pricing
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1 spot, current conditions, basic score, ads |
| Pro | $2.99/mo or $24.99/yr | Unlimited spots, ad-free, 7-day forecast, species cards, push alerts, wind map |

### Revenue Targets
| Milestone | Subscribers | Monthly Revenue (after Apple 15%*) |
|-----------|-------------|--------------------------------------|
| Ramen money | 100 | ~$177 |
| Target | 350 | ~$510 |
| Full side income | 1,000 | ~$1,770 |
| Serious money | 5,000 | ~$8,854 |

*Apple Small Business Program = 15% cut (not 30%) for developers under $1M/year. Apply from day one.

### Downloads Needed
At 3-5% free-to-paid conversion:
- 350 subscribers ÷ 4% conversion = ~8,750 total downloads
- The App Store fishing category gets consistent organic search traffic

---

## 13. Go-To-Market

### Pre-Launch (while building)
- Create @fishcast Instagram — post fishing content + dev progress
- Build landing page with email signup (Carrd, $9/yr)
- Join local fishing Facebook groups — participate genuinely

### Launch
- Post on r/fishing (3M+ members): "I was tired of checking 4 apps, so I built this"
- Post on r/SideProject, r/ReactNative, Indie Hackers
- DM 20 fishing YouTubers/TikTokers — free Pro for a review
- Submit to Product Hunt

### Ongoing (30 min/day)
- 1 TikTok or Reel per week showing the app in real fishing scenarios
- Answer questions in fishing forums — mention app when relevant
- ASO: test keywords monthly
- Ask happy users for App Store reviews

---

## 14. Claude Prompts for Each Build Phase

Use these prompts when you're ready to build each piece. Copy-paste them into Claude with your project context.

### Prompt 1: Project Setup
```
I'm building a React Native fishing app called FishCast using Expo (SDK 52+)
with TypeScript. Set up the project structure with:

- Expo Router for navigation (tab-based: Dashboard, Spots, Settings)
- A /data folder with mock data (I'll provide the mock data shapes)
- A /components folder organized by feature (score, tide, wind, conditions, species)
- A /hooks folder with a useConditions hook that returns mock data
- A /services folder (empty for now — we'll add API calls later)
- A /theme folder with the color palette and typography constants
- Dark theme as default

Use these colors:
Background: #0B1622
Surface: #142233
Card: #1A2D42
Primary accent: #00C9A7 (sea foam green)
Secondary accent: #3B82F6 (ocean blue)
Text primary: #F1F5F9
Text secondary: #94A3B8

Don't install any backend dependencies yet. Frontend only with static data.
```

### Prompt 2: Score Component
```
Build a FishingScore React Native component for my fishing app.
It displays a large score (0-100) as the centerpiece of the dashboard.

Props: { score: number, label: string, bestWindow: { start: string, end: string, score: number } }

Design:
- Score should be BIG (60-72px), centered, bold
- Color changes based on score: 85+ green (#10B981), 70-84 lighter green,
  55-69 amber (#F59E0B), 40-54 amber, below 40 red (#EF4444)
- Label text below the number ("Great day to fish")
- Below that: "Best window: 2-5pm (91)" in smaller text
- Subtle circular arc or ring behind the number indicating the score visually
- Dark background (#0B1622)
- Use react-native-reanimated for a smooth count-up animation when the score loads
```

### Prompt 3: Tide Chart
```
Build a TideChart React Native component using react-native-svg.

Props: {
  hourlyCurve: number[] (24 values, one per hour),
  events: { type: 'high'|'low', time: string, height: number }[],
  currentHour: number,
  currentHeight: number
}

Design:
- Smooth SVG path (bezier curve) through the 24 data points
- Fill below the curve with a gradient (ocean blue #3B82F6 fading to transparent)
- Mark high/low points with labels showing time and height
- Vertical "now" line at the current hour with a dot on the curve
- X-axis: hours (6AM, 12PM, 6PM, 12AM)
- Y-axis: height in feet
- Dark background (#142233 card)
- Height: about 180px
```

### Prompt 4: Wind Display
```
Build a WindDisplay React Native component for my fishing app.

Props: {
  speed: number, gusts: number, direction: number (degrees),
  directionLabel: string (e.g., "SW"), unit: string
}

Design:
- Directional arrow that rotates based on direction degrees
- Large speed number with unit
- Gusts shown smaller: "Gusts: 14 mph"
- Direction label: "SW"
- Arrow color: green for 5-12mph, amber for 13-18, red for 19+
- Compact card layout that fits in a row with other stats
- Dark theme (#1A2D42 card background)
```

### Prompt 5: Conditions Grid
```
Build a ConditionsGrid React Native component — a 2x3 or 3x2 grid of condition cards.

Props: { pressure, swell, air, sky, moon, sun } (see mock data structure)

Each card shows:
- Icon (emoji or simple icon)
- Label (e.g., "Pressure")
- Primary value (e.g., "30.02")
- Secondary detail (e.g., "↘ falling" or "8s S")
- Dark card background (#1A2D42) with rounded corners
- Consistent sizing across all cards
```

### Prompt 6: Score Timeline
```
Build a ScoreTimeline React Native component — a horizontal bar chart
showing fishing scores hour by hour.

Props: { hourlyScores: { hour: string, score: number }[] }

Design:
- Vertical bars for each hour
- Bar height proportional to score
- Bar color changes: green (70+), amber (40-69), red (below 40)
- Highlight the peak hour(s) with a brighter color or glow
- Hour labels below each bar
- Scrollable horizontally if needed
- Dark background
- Height: about 120px
```

### Prompt 7: Species Card
```
Build a SpeciesCard React Native component for the "What's Biting" section.

Props: {
  name: string, score: number, status: string,
  waterTempMatch: string, tideMatch: string,
  timeMatch: string, tip: string
}

Design:
- Compact card with fish emoji/icon, species name, score badge, and status tag
- Expandable: tap to reveal detailed match info and fishing tip
- Score badge: colored circle (green/amber/red) with number
- Status tag: "Peak Season" (green), "Active" (blue), "Present" (gray)
- Dark card background, list layout
```

### Prompt 8: Full Dashboard Assembly
```
Assemble the full Spot Dashboard screen using all the components built so far:
FishingScore, ScoreTimeline, TideChart, WindDisplay, ConditionsGrid, SpeciesCard.

Use the mock data from /data/mockData.ts.
Layout should be a ScrollView with the components stacked vertically.
Add a header with spot name and a spot-switcher dropdown.
Use Expo Router for tab navigation.

This is the main tab — it should feel polished and information-dense
but not cluttered. Generous padding between sections.
```

### Prompt 9: API Integration (Phase B)
```
I have a working FishCast React Native app with all UI built using mock data.
Now I need to swap in real data from NOAA.

Create a noaaService.ts that:
1. Takes a station ID
2. Fetches tide predictions (high/low + hourly), wind, water temp, air temp,
   and barometric pressure from the NOAA CO-OPS API
3. Always uses datum=MLLW, units=english, format=json, time_zone=lst_ldt
4. Returns data in the same shape as my mock data so the UI doesn't change
5. Caches results for 30 minutes to avoid unnecessary API calls
6. Handles errors gracefully (show "unavailable" in the UI, not a crash)

Here are the NOAA API endpoints:
[paste the API reference from Section 10]
```

---

## Quick Reference: Week-by-Week Schedule

| Week | What to Build | Hours |
|------|--------------|-------|
| 1 | Project setup + Score component + Tide chart | 8-10 |
| 2 | Wind display + Conditions grid + Score timeline | 8-10 |
| 3 | Full dashboard assembly + Species cards | 8-10 |
| 4 | Spots list + Add spot (map) + Settings screens | 8-10 |
| 5 | Polish: animations, transitions, empty states | 8-10 |
| 6 | NOAA API integration + NWS + Open-Meteo | 8-10 |
| 7 | Scoring algorithm (real) + AsyncStorage for spots | 8-10 |
| 8 | RevenueCat + paywall + App Store prep + submit | 8-10 |
| 9-10 | Species database for your region + push notifications | 8-10 |
| 11-12 | Wind map overlay + multi-day forecast + iterate | 8-10 |
