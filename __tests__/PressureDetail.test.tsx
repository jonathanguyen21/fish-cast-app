import React from 'react'
import { render, screen } from '@testing-library/react-native'
import PressureDetailScreen from '../app/detail/pressure'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    data: JSON.stringify({
      value: 29.95,
      trend: 'falling',
      rate: 'slow',
      unit: 'inHg',
      readings: [30.10, 30.08, 30.05, 30.02, 29.95],
    }),
  }),
  useRouter: () => ({ back: jest.fn() }),
}))

describe('PressureDetailScreen', () => {
  it('renders without crashing', () => {
    render(<PressureDetailScreen />)
    expect(screen.getByText('Pressure Detail')).toBeTruthy()
  })

  it('shows trend sentence', () => {
    render(<PressureDetailScreen />)
    expect(screen.getByText(/Falling slowly/i)).toBeTruthy()
  })
})
