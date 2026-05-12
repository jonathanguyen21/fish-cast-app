import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TideChart } from '../features/tide/TideChart'
import { formatScrubTime } from '../features/tide/tideUtils'
import { MOCK_CONDITIONS } from '../data/mockData'

describe('TideChart', () => {
  const props = {
    tide: MOCK_CONDITIONS.tide!,
    currentHour: 14,
  }

  it('renders without crashing', () => {
    render(<TideChart {...props} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
  })

  it('shows tide event tick marks', () => {
    render(<TideChart {...props} />)
    expect(screen.getByTestId('tide-tick-high-1')).toBeTruthy()
  })

  it('shows formatted time below height when scrubbing', () => {
    expect(formatScrubTime(0)).toBe('12:00 AM')
    expect(formatScrubTime(12)).toBe('12:00 PM')
    expect(formatScrubTime(14)).toBe('2:00 PM')
    expect(formatScrubTime(23)).toBe('11:00 PM')
  })
})
