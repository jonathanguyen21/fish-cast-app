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
