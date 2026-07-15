import { weatherIconFor, skyConditionLabel, skyIconForHour, skyDataForHour } from '../theme/weatherIcon'

describe('skyConditionLabel', () => {
  it('maps every icon to its Title Case display label', () => {
    expect(skyConditionLabel('clear')).toBe('Clear')
    expect(skyConditionLabel('partly-cloudy')).toBe('Partly Cloudy')
    expect(skyConditionLabel('overcast')).toBe('Overcast')
    expect(skyConditionLabel('light-rain')).toBe('Light Rain')
    expect(skyConditionLabel('heavy-rain')).toBe('Heavy Rain')
  })
})

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

describe('skyIconForHour', () => {
  it('returns heavy-rain once rain chance is high', () => {
    expect(skyIconForHour(90, 65)).toBe('heavy-rain')
  })
  it('returns light-rain for a meaningful but lower rain chance', () => {
    expect(skyIconForHour(50, 45)).toBe('light-rain')
  })
  it('rain chance overrides cloud cover even on an otherwise clear-reading hour', () => {
    expect(skyIconForHour(10, 70)).toBe('heavy-rain')
  })
  it('returns overcast for high cloud cover with low rain chance', () => {
    expect(skyIconForHour(75, 5)).toBe('overcast')
  })
  it('returns partly-cloudy for moderate cloud cover', () => {
    expect(skyIconForHour(40, 5)).toBe('partly-cloudy')
  })
  it('returns clear for low cloud cover and low rain chance', () => {
    expect(skyIconForHour(10, 0)).toBe('clear')
  })
})

describe('skyDataForHour', () => {
  it('bundles the derived icon with its label and the original rain chance', () => {
    expect(skyDataForHour(75, 5)).toEqual({ icon: 'overcast', condition: 'Overcast', rainChance: 5 })
    expect(skyDataForHour(10, 65)).toEqual({ icon: 'heavy-rain', condition: 'Heavy Rain', rainChance: 65 })
  })
})
