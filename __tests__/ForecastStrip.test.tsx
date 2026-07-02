import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ForecastStrip } from '../features/forecast/ForecastStrip'
import type { DayForecast } from '../types/conditions'

const DAYS: DayForecast[] = Array.from({ length: 7 }, (_, d) => ({
  date: `2026-07-0${d + 1}`,
  dayLabel: d === 0 ? 'Today' : `D${d}`,
  peakScore: 60 + d,
  scoreLabel: 'Decent — pick your window',
  peakWindow: { start: '6:00 AM', end: '8:00 AM' },
  hourlyScores: [],
  tideEvents: [],
  sun: { sunrise: '5:50 AM', sunset: '8:30 PM' },
}))

const noop = () => {}

describe('ForecastStrip', () => {
  it('locks days 3–7 for free users', () => {
    const { getAllByTestId, queryAllByTestId } = render(
      <ForecastStrip forecast={DAYS} isLoading={false} isError={false} isPro={false}
        onRetry={noop} onUpgrade={noop} onDayPress={noop} />
    )
    expect(getAllByTestId('day-locked')).toHaveLength(5)
    expect(queryAllByTestId('day-unlocked')).toHaveLength(2)
  })

  it('unlocks all 7 days for Pro', () => {
    const { queryAllByTestId } = render(
      <ForecastStrip forecast={DAYS} isLoading={false} isError={false} isPro={true}
        onRetry={noop} onUpgrade={noop} onDayPress={noop} />
    )
    expect(queryAllByTestId('day-locked')).toHaveLength(0)
    expect(queryAllByTestId('day-unlocked')).toHaveLength(7)
  })

  it('locked day tap calls onUpgrade; unlocked tap calls onDayPress', () => {
    const onUpgrade = jest.fn()
    const onDayPress = jest.fn()
    const { getAllByTestId } = render(
      <ForecastStrip forecast={DAYS} isLoading={false} isError={false} isPro={false}
        onRetry={noop} onUpgrade={onUpgrade} onDayPress={onDayPress} />
    )
    fireEvent.press(getAllByTestId('day-locked')[0])
    expect(onUpgrade).toHaveBeenCalled()
    fireEvent.press(getAllByTestId('day-unlocked')[0])
    expect(onDayPress).toHaveBeenCalledWith(DAYS[0])
  })

  it('shows a retry row on error', () => {
    const onRetry = jest.fn()
    const { getByText } = render(
      <ForecastStrip forecast={[]} isLoading={false} isError={true} isPro={false}
        onRetry={onRetry} onUpgrade={noop} onDayPress={noop} />
    )
    fireEvent.press(getByText('Could not load forecast — tap to retry'))
    expect(onRetry).toHaveBeenCalled()
  })

  it('labels only the Today card as a forecast estimate', () => {
    const { getAllByText } = render(
      <ForecastStrip forecast={DAYS} isLoading={false} isError={false} isPro={true}
        onRetry={noop} onUpgrade={noop} onDayPress={noop} />
    )
    expect(getAllByText('(forecast estimate)')).toHaveLength(1)
  })
})
