import React from 'react'
import { render } from '@testing-library/react-native'
import { ScoreTimeline } from '../features/score/ScoreTimeline'
import type { HourlyScore } from '../types/conditions'

const HOURS: HourlyScore[] = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'AM' : 'PM'}`,
  hourIndex: h,
  score: 40 + (h % 5) * 10,
}))

describe('ScoreTimeline', () => {
  it('renders all 24 hour bars', () => {
    const { getAllByTestId } = render(<ScoreTimeline hourlyScores={HOURS} currentHour={14} />)
    expect(getAllByTestId('timeline-bar')).toHaveLength(24)
  })

  it('shows a Now label at the current hour', () => {
    const { getByText } = render(<ScoreTimeline hourlyScores={HOURS} currentHour={14} />)
    expect(getByText('Now')).toBeTruthy()
  })

  it('shows no Now label when currentHour is null', () => {
    const { queryByText } = render(<ScoreTimeline hourlyScores={HOURS} currentHour={null} />)
    expect(queryByText('Now')).toBeNull()
  })
})
