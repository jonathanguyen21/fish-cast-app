import { weatherIconFor } from '../theme/weatherIcon'

describe('weatherIconFor', () => {
  it('shows sunny for clear daytime', () => {
    expect(weatherIconFor('clear', true)).toBe('sunny')
  })
  it('shows moon for clear nighttime', () => {
    expect(weatherIconFor('clear', false)).toBe('moon')
  })
  it('shows partly-sunny for partly-cloudy daytime', () => {
    expect(weatherIconFor('partly-cloudy', true)).toBe('partly-sunny')
  })
  it('shows cloudy-night for partly-cloudy nighttime', () => {
    expect(weatherIconFor('partly-cloudy', false)).toBe('cloudy-night')
  })
  it('shows cloudy for overcast regardless of time of day', () => {
    expect(weatherIconFor('overcast', true)).toBe('cloudy')
    expect(weatherIconFor('overcast', false)).toBe('cloudy')
  })
  it('shows rainy for light rain', () => {
    expect(weatherIconFor('light-rain', true)).toBe('rainy')
    expect(weatherIconFor('light-rain', false)).toBe('rainy')
  })
  it('shows thunderstorm for heavy rain', () => {
    expect(weatherIconFor('heavy-rain', true)).toBe('thunderstorm')
  })
  it('falls back to a plain cloud icon when the sky icon is unknown or missing', () => {
    expect(weatherIconFor(undefined, true)).toBe('cloud')
  })
})
