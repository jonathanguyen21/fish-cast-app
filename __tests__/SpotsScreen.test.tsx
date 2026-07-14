import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 49 }))

const SPOTS = [
  { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' },
  { id: 's2', name: 'Lake House', lat: 38.1, lng: -121.9, type: 'freshwater', stationId: null, region: 'west_coast' },
]
const mockSetActiveSpot = jest.fn()
const mockRemoveSpot = jest.fn()
const mockUpdateSpot = jest.fn()
let mockSpots = SPOTS
jest.mock('../hooks/useSpots', () => ({
  useSpots: () => ({
    spots: mockSpots,
    activeSpot: mockSpots[0] ?? null,
    activeSpotId: mockSpots[0]?.id ?? null,
    setActiveSpot: mockSetActiveSpot,
    removeSpot: mockRemoveSpot,
    updateSpot: mockUpdateSpot,
  }),
}))
jest.mock('../hooks/useConditions', () => ({
  useConditions: () => ({ data: null, isLoading: false, isError: false, refetch: jest.fn() }),
}))

import SpotsScreen from '../app/(tabs)/spots'

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SpotsScreen />
    </SafeAreaProvider>
  )
}

describe('Spots screen map button', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockSpots = SPOTS
  })

  it('shows a map-view button when there are saved spots', () => {
    const { getByTestId } = renderScreen()
    expect(getByTestId('spots-map-fab')).toBeTruthy()
  })

  it('navigates to the spots map on tap', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId('spots-map-fab'))
    expect(mockPush).toHaveBeenCalledWith('/spot/map')
  })

  it('hides the map-view button when there are no spots yet', () => {
    mockSpots = []
    const { queryByTestId } = renderScreen()
    expect(queryByTestId('spots-map-fab')).toBeNull()
  })
})
