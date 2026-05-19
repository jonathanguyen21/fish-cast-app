import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

function renderWithProvider(component: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{component}</SafeAreaProvider>)
}

const WIND_HOURLY = [
  { hour: 8, speed: 12, gusts: 17, direction: 225, directionLabel: 'SW' },
  { hour: 9, speed: 15, gusts: 20, direction: 270, directionLabel: 'W' },
  { hour: 10, speed: 18, gusts: 23, direction: 315, directionLabel: 'NW' },
]

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({
    data: JSON.stringify(WIND_HOURLY),
  })),
  useRouter: () => ({ back: jest.fn() }),
}))

jest.mock('../store/settingsStore', () => ({
  useSettingsStore: (sel: (s: { speedUnit: string }) => unknown) => sel({ speedUnit: 'mph' }),
}))

const { useLocalSearchParams } = require('expo-router')

import WindDetailScreen from '../app/detail/wind'

describe('WindDetailScreen', () => {
  beforeEach(() => {
    useLocalSearchParams.mockReturnValue({ data: JSON.stringify(WIND_HOURLY) })
  })

  it('renders without crashing', () => {
    renderWithProvider(<WindDetailScreen />)
    expect(screen.getByText('Wind')).toBeTruthy()
  })

  it('shows peak wind info', () => {
    renderWithProvider(<WindDetailScreen />)
    expect(screen.getByText(/Peak/)).toBeTruthy()
  })

  it('shows legend items', () => {
    renderWithProvider(<WindDetailScreen />)
    expect(screen.getByText('Wind speed')).toBeTruthy()
    expect(screen.getByText('Gust band')).toBeTruthy()
    expect(screen.getByText('25 mph limit')).toBeTruthy()
  })

  it('shows peak speed in the callout', () => {
    renderWithProvider(<WindDetailScreen />)
    // Peak entry is speed 18 at hour 10
    expect(screen.getByText(/18/)).toBeTruthy()
  })

  it('shows "No wind data available" when data is empty array', () => {
    useLocalSearchParams.mockReturnValue({ data: JSON.stringify([]) })
    renderWithProvider(<WindDetailScreen />)
    expect(screen.getByText(/No wind data available/i)).toBeTruthy()
  })

  it('shows current wind fallback when hourly is empty but current is provided', () => {
    const currentWind = { speed: 14, gusts: 18, directionLabel: 'NW' }
    useLocalSearchParams.mockReturnValue({
      data: JSON.stringify([]),
      current: JSON.stringify(currentWind),
    })
    renderWithProvider(<WindDetailScreen />)
    expect(screen.getByText(/14/)).toBeTruthy()
  })

  it('shows range note when data has entries', () => {
    renderWithProvider(<WindDetailScreen />)
    // "Forecast from 8AM · 3 hours"
    expect(screen.getByText(/Forecast from/i)).toBeTruthy()
    expect(screen.getByText(/3 hours/)).toBeTruthy()
  })
})
