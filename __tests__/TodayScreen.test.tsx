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
jest.mock('../hooks/useSpots', () => ({
  useSpots: () => ({ activeSpot: { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' } }),
}))
const mockConditions = require('./helpers/mockConditionsData').default
jest.mock('../hooks/useConditions', () => ({
  useConditions: () => ({ data: mockConditions, isLoading: false, isError: false, refetch: jest.fn() }),
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
    // wind speed must be an integer, whatever the mock value is
    expect(getByText(new RegExp(`Wind ${Math.round(mockConditions.wind.speed)} mph`))).toBeTruthy()
  })

  it('tide chip deep-links to the Conditions tide section', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('chip-tide'))
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/conditions', params: { section: 'tide' } })
  })
})
