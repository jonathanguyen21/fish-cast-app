import React from 'react'
import { render } from '@testing-library/react-native'
import { MiniActivityChart } from '../features/species/MiniActivityChart'
import type { SpeciesHourlyScore } from '../features/species/speciesHourlyScoring'

function makeHourly(scores: Record<number, number>): SpeciesHourlyScore[] {
  return Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: scores[5 + i] ?? 0 }))
}

describe('MiniActivityChart', () => {
  it('renders without error for empty hourly data', () => {
    const { toJSON } = render(<MiniActivityChart hourly={[]} currentHour={10} />)
    expect(toJSON()).toBeNull()
  })

  it('renders SVG for non-empty hourly data', () => {
    const hourly = makeHourly({ 8: 60, 9: 75, 10: 80 })
    const { toJSON } = render(<MiniActivityChart hourly={hourly} currentHour={9} />)
    expect(toJSON()).not.toBeNull()
  })

  it('accepts custom width and height', () => {
    const hourly = makeHourly({ 10: 50 })
    const { toJSON } = render(<MiniActivityChart hourly={hourly} currentHour={10} width={80} height={16} />)
    expect(toJSON()).not.toBeNull()
  })

  it('handles all-zero scores', () => {
    const hourly = makeHourly({})
    const { toJSON } = render(<MiniActivityChart hourly={hourly} currentHour={12} />)
    expect(toJSON()).not.toBeNull()
  })
})
