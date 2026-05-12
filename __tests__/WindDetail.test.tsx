import React from 'react'
import { render, screen } from '@testing-library/react-native'
import WindDetailScreen from '../app/detail/wind'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    data: JSON.stringify([
      { hour: 8, speed: 12, gusts: 17, direction: 225, directionLabel: 'SW' },
      { hour: 9, speed: 15, gusts: 20, direction: 270, directionLabel: 'W' },
      { hour: 10, speed: 18, gusts: 23, direction: 315, directionLabel: 'NW' },
    ]),
  }),
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('../store/settingsStore', () => ({
  useSettingsStore: (sel: any) => sel({ speedUnit: 'mph' }),
}))

describe('WindDetailScreen', () => {
  it('renders without crashing', () => {
    render(<WindDetailScreen />)
    expect(screen.getByText('Wind')).toBeTruthy()
  })

  it('shows peak wind info', () => {
    render(<WindDetailScreen />)
    expect(screen.getByText(/Peak/)).toBeTruthy()
  })
})
