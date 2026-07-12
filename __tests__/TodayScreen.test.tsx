import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
}))
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: true }) }))
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 49 }))
jest.mock('../hooks/useSpots', () => ({
  useSpots: () => ({ activeSpot: { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' } }),
}))
const mockConditions = require('./helpers/mockConditionsData').default
// Wind speed is overridden to a fractional value (9.33) here, rather than in the
// shared fixture, so this suite actually exercises the Math.round in the wind chip.
jest.mock('../hooks/useConditions', () => ({
  useConditions: () => ({
    data: { ...mockConditions, wind: { ...mockConditions.wind, speed: 9.33 } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}))
jest.mock('../hooks/useForecast', () => ({ useForecast: () => ({ data: [] }) }))
jest.mock('../services/notificationService', () => ({ maybeScheduleFishingAlert: jest.fn() }))

import TodayScreen from '../app/(tabs)/index'

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TodayScreen />
    </SafeAreaProvider>
  )
}

describe('Today final layout', () => {
  it('has no transitional sections and rounds wind speed', () => {
    const { queryByText, getByText } = renderScreen()
    expect(queryByText(/TODAY'S FORECAST/i)).toBeNull()
    expect(queryByText(/Tap any card for details/i)).toBeNull()
    // wind speed (9.33 in this suite's mock) must round to an integer for display
    expect(getByText('Wind 9 mph')).toBeTruthy()
    expect(queryByText(/9\.33/)).toBeNull()
  })

  it('tide chip deep-links to the Conditions tide section with the viewed date', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('chip-tide'))
    const now = new Date()
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/conditions', params: { section: 'tide', date: todayKey } })
  })

  it('shows the full tide chart below the chips when the spot has tide data', () => {
    const { getByTestId } = renderScreen()
    expect(getByTestId('tide-chart')).toBeTruthy()
  })
})

