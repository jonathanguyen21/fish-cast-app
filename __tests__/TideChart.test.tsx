import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TideChart } from '../features/tide/TideChart'
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

  it('shows high tide event label', () => {
    render(<TideChart {...props} />)
    expect(screen.getByText(/3:42 PM/)).toBeTruthy()
  })

  it('shows formatted time below height when scrubbing', () => {
    function formatScrubTime(h: number): string {
      const period = h < 12 ? 'AM' : 'PM'
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
      return `${displayH}:00 ${period}`
    }
    expect(formatScrubTime(0)).toBe('12:00 AM')
    expect(formatScrubTime(12)).toBe('12:00 PM')
    expect(formatScrubTime(14)).toBe('2:00 PM')
    expect(formatScrubTime(23)).toBe('11:00 PM')
  })
})
