import type { SkyIcon } from './skyTheme'
import type { SkyData } from '../types/conditions'

export type WeatherIconName =
  | 'sunny' | 'moon' | 'partly-sunny' | 'cloudy-night' | 'cloudy' | 'rainy' | 'thunderstorm' | 'cloud'

// Single source of truth for icon -> display-label, consolidating what used
// to be three near-identical copies (nwsService.ts, scoringService.ts,
// forecastService.ts) that could silently drift out of sync with each other.
const CONDITION_LABEL: Record<SkyIcon, SkyData['condition']> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly Cloudy',
  overcast: 'Overcast',
  'light-rain': 'Light Rain',
  'heavy-rain': 'Heavy Rain',
}

export function skyConditionLabel(icon: SkyIcon): SkyData['condition'] {
  return CONDITION_LABEL[icon]
}

// Approximates the per-hour sky icon from ConditionsData.airHourly's
// cloudCover/rainChance numbers. Not the same computation nwsService.ts uses
// for the "now" sky.icon (that reads NWS's own forecast text directly,
// which isn't kept per-hour) — this reconstructs a reasonable icon from the
// two numbers that ARE stored per-hour, using the same rough bands
// nwsService.ts's own shortForecastToCloudCover produces, so scrubbing
// through the day's hours lands on the same icon categories "now" would.
export function skyIconForHour(cloudCoverPct: number, rainChancePct: number): SkyIcon {
  if (rainChancePct >= 60) return 'heavy-rain'
  if (rainChancePct >= 40) return 'light-rain'
  if (cloudCoverPct >= 60) return 'overcast'
  if (cloudCoverPct >= 30) return 'partly-cloudy'
  return 'clear'
}

export function skyDataForHour(cloudCoverPct: number, rainChancePct: number): SkyData {
  const icon = skyIconForHour(cloudCoverPct, rainChancePct)
  return { icon, condition: skyConditionLabel(icon), rainChance: rainChancePct }
}

export function weatherIconFor(icon: SkyIcon | undefined, isLight: boolean): WeatherIconName {
  switch (icon) {
    case 'clear':
      return isLight ? 'sunny' : 'moon'
    case 'partly-cloudy':
      return isLight ? 'partly-sunny' : 'cloudy-night'
    case 'overcast':
      return 'cloudy'
    case 'light-rain':
      return 'rainy'
    case 'heavy-rain':
      return 'thunderstorm'
    default:
      return 'cloud'
  }
}
