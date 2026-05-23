import React from 'react'
import { render } from '@testing-library/react-native'
import { DayPlanStrip } from '../features/score/DayPlanStrip'
import type { HourlyScore } from '../types/conditions'

function makeHourly(scores: Record<number, number>): HourlyScore[] {
  return Array.from({ length: 16 }, (_, i) => {
    const h = 5 + i
    const period = h < 12 ? 'AM' : 'PM'
    const displayH = h > 12 ? h - 12 : h
    return { hour: `${displayH}${period}`, score: scores[h] ?? 0 }
  })
}

describe('DayPlanStrip', () => {
  it('renders three time blocks', () => {
    const hourly = makeHourly({ 5: 50, 10: 70, 15: 40 })
    const { getByText } = render(<DayPlanStrip hourlyScores={hourly} />)
    expect(getByText('Dawn')).toBeTruthy()
    expect(getByText('Midday')).toBeTruthy()
    expect(getByText('Evening')).toBeTruthy()
  })

  it('shows BEST badge on the highest-scoring block', () => {
    // Dawn avg=60, Midday avg=80, Evening avg=40
    const hourly = makeHourly({ 5: 60, 6: 60, 7: 60, 8: 60, 9: 60, 10: 80, 11: 80, 12: 80, 13: 80, 14: 80, 15: 40, 16: 40, 17: 40, 18: 40, 19: 40, 20: 40 })
    const { getAllByText } = render(<DayPlanStrip hourlyScores={hourly} />)
    expect(getAllByText('Best').length).toBeGreaterThanOrEqual(1)
  })

  it('returns null for empty hourlyScores', () => {
    const { toJSON } = render(<DayPlanStrip hourlyScores={[]} />)
    expect(toJSON()).toBeNull()
  })

  it('shows Prime label for high-scoring blocks', () => {
    const hourly = makeHourly({ 5: 75, 6: 75, 7: 75, 8: 75, 9: 75 })
    const { getByText } = render(<DayPlanStrip hourlyScores={hourly} />)
    expect(getByText('Prime')).toBeTruthy()
  })

  it('shows Slow label for zero scores', () => {
    const hourly = makeHourly({})
    const { getAllByText } = render(<DayPlanStrip hourlyScores={hourly} />)
    expect(getAllByText('Slow').length).toBeGreaterThan(0)
  })
})
