import type { SkyIcon } from './skyTheme'

export type WeatherIconName =
  | 'sunny' | 'moon' | 'partly-sunny' | 'cloudy-night' | 'cloudy' | 'rainy' | 'thunderstorm' | 'cloud'

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
