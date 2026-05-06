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
})
