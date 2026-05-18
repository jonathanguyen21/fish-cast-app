import React from 'react'
import { render } from '@testing-library/react-native'
import { ForecastStrip } from '../features/forecast/ForecastStrip'
import type { DayForecast } from '../types/conditions'

const FORECAST: DayForecast[] = [
  { date: '2026-05-06', dayLabel: 'Today', peakScore: 82, scoreLabel: 'Great day to fish', peakWindow: { start: '8:00 AM', end: '11:00 AM' }, skyIcon: 'overcast', highTemp: 67, rainChance: 10 },
  { date: '2026-05-07', dayLabel: 'Thu', peakScore: 55, scoreLabel: 'Decent — pick your window', peakWindow: { start: '6:00 AM', end: '9:00 AM' }, skyIcon: 'partly-cloudy', highTemp: 65, rainChance: 20 },
  { date: '2026-05-08', dayLabel: 'Fri', peakScore: 72, scoreLabel: 'Great day to fish', peakWindow: { start: '4:00 PM', end: '7:00 PM' }, skyIcon: 'clear', highTemp: 70, rainChance: 0 },
  { date: '2026-05-09', dayLabel: 'Sat', peakScore: 40, scoreLabel: 'Tough but possible', peakWindow: { start: '8:00 AM', end: '11:00 AM' }, skyIcon: 'heavy-rain', highTemp: 58, rainChance: 85 },
  { date: '2026-05-10', dayLabel: 'Sun', peakScore: 60, scoreLabel: 'Decent — pick your window', peakWindow: { start: '10:00 AM', end: '1:00 PM' }, skyIcon: 'light-rain', highTemp: 62, rainChance: 50 },
  { date: '2026-05-11', dayLabel: 'Mon', peakScore: 68, scoreLabel: 'Decent — pick your window', peakWindow: { start: '7:00 AM', end: '10:00 AM' }, skyIcon: 'overcast', highTemp: 64, rainChance: 15 },
  { date: '2026-05-12', dayLabel: 'Tue', peakScore: 78, scoreLabel: 'Great day to fish', peakWindow: { start: '3:00 PM', end: '6:00 PM' }, skyIcon: 'clear', highTemp: 68, rainChance: 5 },
]

const noop = () => {}

describe('ForecastStrip', () => {
  it('shows upgrade prompt when not Pro', () => {
    const { getByText } = render(
      <ForecastStrip forecast={FORECAST} isPro={false} onUpgrade={noop} />
    )
    expect(getByText(/Unlock 7-Day/i)).toBeTruthy()
  })

  it('shows skeleton loader while loading', () => {
    const { queryByText } = render(
      <ForecastStrip forecast={undefined} isPro={true} isLoading={true} onUpgrade={noop} />
    )
    expect(queryByText(/Today/)).toBeNull()
  })

  it('shows error state', () => {
    const { getByText } = render(
      <ForecastStrip forecast={undefined} isPro={true} isError={true} onUpgrade={noop} />
    )
    expect(getByText(/unavailable/i)).toBeTruthy()
  })

  it('shows empty state when no forecast data', () => {
    const { getByText } = render(
      <ForecastStrip forecast={[]} isPro={true} onUpgrade={noop} />
    )
    expect(getByText(/No forecast/i)).toBeTruthy()
  })

  it('renders day labels for each forecast entry', () => {
    const { getByText } = render(
      <ForecastStrip forecast={FORECAST} isPro={true} onUpgrade={noop} />
    )
    expect(getByText('Today')).toBeTruthy()
    expect(getByText('Thu')).toBeTruthy()
    expect(getByText('Sat')).toBeTruthy()
  })

  it('renders peak scores as numbers', () => {
    const { getByText } = render(
      <ForecastStrip forecast={FORECAST} isPro={true} onUpgrade={noop} />
    )
    expect(getByText('82')).toBeTruthy()
    expect(getByText('55')).toBeTruthy()
  })

  it('shows BEST chip on the highest-score day (at or above 60)', () => {
    const { getAllByText } = render(
      <ForecastStrip forecast={FORECAST} isPro={true} onUpgrade={noop} />
    )
    const bestChips = getAllByText('BEST')
    expect(bestChips).toHaveLength(1)
  })

  it('does not show BEST chip when all scores are below 60', () => {
    const lowForecast: DayForecast[] = FORECAST.map(d => ({ ...d, peakScore: 45 }))
    const { queryByText } = render(
      <ForecastStrip forecast={lowForecast} isPro={true} onUpgrade={noop} />
    )
    expect(queryByText('BEST')).toBeNull()
  })

  it('shows rain chance when above 10%', () => {
    const { getByText } = render(
      <ForecastStrip forecast={FORECAST} isPro={true} onUpgrade={noop} />
    )
    expect(getByText('85%')).toBeTruthy()
    expect(getByText('50%')).toBeTruthy()
  })

  it('hides rain chance when at or below 10%', () => {
    const { queryByText } = render(
      <ForecastStrip forecast={[FORECAST[0]]} isPro={true} onUpgrade={noop} />
    )
    // FORECAST[0] has rainChance: 10 — should not render
    expect(queryByText('10%')).toBeNull()
  })
})
