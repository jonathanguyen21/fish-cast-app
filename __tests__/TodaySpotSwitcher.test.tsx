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

const mockSetActiveSpot = jest.fn()
const SPOTS = [
  { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' },
  { id: 's2', name: 'Lake House', lat: 38.1, lng: -121.9, type: 'freshwater', stationId: null, region: 'west_coast' },
]
jest.mock('../hooks/useSpots', () => ({
  useSpots: () => ({
    spots: SPOTS,
    activeSpot: SPOTS[0],
    activeSpotId: 's1',
    setActiveSpot: mockSetActiveSpot,
  }),
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

describe('Today spot switcher', () => {
  it('opens a picker listing every saved spot when the spot name is tapped', () => {
    const { getByTestId, queryByTestId } = renderScreen()
    expect(queryByTestId('spot-option-s1')).toBeNull()
    fireEvent.press(getByTestId('spot-name-button'))
    expect(getByTestId('spot-option-s1')).toBeTruthy()
    expect(getByTestId('spot-option-s2')).toBeTruthy()
  })

  it('switches the active spot and closes the picker on selection', () => {
    const { getByTestId, queryByTestId } = renderScreen()
    fireEvent.press(getByTestId('spot-name-button'))
    fireEvent.press(getByTestId('spot-option-s2'))
    expect(mockSetActiveSpot).toHaveBeenCalledWith('s2')
    expect(queryByTestId('spot-option-s2')).toBeNull()
  })

  it('offers an "Add a spot" option that navigates to the new-spot screen', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('spot-name-button'))
    fireEvent.press(getByTestId('spot-option-add'))
    expect(mockPush).toHaveBeenCalledWith('/spot/new')
  })
})
