import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { DayPlanStrip } from '../features/score/DayPlanStrip'
import type { HourlyScore } from '../types/conditions'

const MOCK_SCORES: HourlyScore[] = [
  { hour: '5AM', score: 55 },
  { hour: '6AM', score: 60 },
  { hour: '7AM', score: 70 },
  { hour: '8AM', score: 65 },
  { hour: '9AM', score: 72 },
  { hour: '10AM', score: 80 },
  { hour: '11AM', score: 78 },
  { hour: '12PM', score: 75 },
  { hour: '1PM', score: 60 },
  { hour: '2PM', score: 55 },
  { hour: '3PM', score: 50 },
  { hour: '4PM', score: 48 },
  { hour: '5PM', score: 45 },
  { hour: '6PM', score: 70 },
  { hour: '7PM', score: 72 },
  { hour: '8PM', score: 68 },
]

describe('DayPlanStrip', () => {
  it('renders the day at a glance header', () => {
    render(<DayPlanStrip hourlyScores={MOCK_SCORES} />)
    expect(screen.getByText('Day at a glance')).toBeTruthy()
  })

  it('renders all four time blocks', () => {
    render(<DayPlanStrip hourlyScores={MOCK_SCORES} />)
    expect(screen.getByText('Dawn')).toBeTruthy()
    expect(screen.getByText('Morning')).toBeTruthy()
    expect(screen.getByText('Afternoon')).toBeTruthy()
    expect(screen.getByText('Dusk')).toBeTruthy()
  })

  it('renders BEST tag on the highest scoring block', () => {
    render(<DayPlanStrip hourlyScores={MOCK_SCORES} />)
    expect(screen.getByText('BEST')).toBeTruthy()
  })

  it('returns null for empty scores', () => {
    const { toJSON } = render(<DayPlanStrip hourlyScores={[]} />)
    expect(toJSON()).toBeNull()
  })

  it('does not show BEST when all scores are below 50', () => {
    const lowScores = MOCK_SCORES.map(h => ({ ...h, score: 30 }))
    render(<DayPlanStrip hourlyScores={lowScores} />)
    expect(screen.queryByText('BEST')).toBeNull()
  })
})
