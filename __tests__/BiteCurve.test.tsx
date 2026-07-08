import React from 'react'
import { render } from '@testing-library/react-native'
import { BiteCurve } from '../features/score/BiteCurve'
import { getSkyTheme } from '../theme/skyTheme'
import type { HourlyScore } from '../types/conditions'

const SKY = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear')
const HOURS: HourlyScore[] = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'AM' : 'PM'}`,
  hourIndex: h,
  score: 40 + (h % 6) * 8,
}))
const WINDOW = { start: '6:00 PM', end: '8:00 PM', score: 80 }

describe('BiteCurve', () => {
  it('renders the curve, best-window band, and label', () => {
    const { getByTestId, getByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={WINDOW} currentHour={14} skyTheme={SKY} />
    )
    expect(getByTestId('bite-curve-path')).toBeTruthy()
    expect(getByTestId('bite-curve-band')).toBeTruthy()
    expect(getByText("Today's bite")).toBeTruthy()
    expect(getByText('Best 6:00 PM–8:00 PM')).toBeTruthy()
    expect(getByTestId('bite-curve-now')).toBeTruthy()
  })

  it('hides the band when the window has passed and the NOW dot when currentHour is null', () => {
    const { queryByTestId, getByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={{ ...WINDOW, passed: true }} currentHour={null} skyTheme={SKY} />
    )
    expect(queryByTestId('bite-curve-band')).toBeNull()
    expect(queryByTestId('bite-curve-now')).toBeNull()
    expect(getByText('Peak was 6:00 PM–8:00 PM')).toBeTruthy()
  })

  it('renders nothing with fewer than 2 points', () => {
    const { toJSON } = render(
      <BiteCurve hourlyScores={[]} bestWindow={WINDOW} currentHour={null} skyTheme={SKY} />
    )
    expect(toJSON()).toBeNull()
  })
})
