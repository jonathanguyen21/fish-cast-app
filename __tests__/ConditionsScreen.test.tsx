import React from 'react'
import { render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const mockConditions = require('./helpers/mockConditionsData').default

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ section: 'tide' }),
}))
jest.mock('../hooks/useSpots', () => ({
  useSpots: () => ({ activeSpot: { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' } }),
}))
jest.mock('../hooks/useConditions', () => ({
  useConditions: () => ({ data: mockConditions, isLoading: false, isError: false, refetch: jest.fn() }),
}))

import ConditionsScreen from '../app/conditions'

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ConditionsScreen />
    </SafeAreaProvider>
  )
}

describe('ConditionsScreen', () => {
  it('renders section anchors for tide and sun & moon', () => {
    const { getByTestId, getByText } = renderScreen()
    expect(getByTestId('section-tide')).toBeTruthy()
    expect(getByTestId('section-sun')).toBeTruthy()
    expect(getByText('Tide')).toBeTruthy()
    expect(getByText('Sun & moon')).toBeTruthy()
  })

  it('renders solunar periods from conditions data', () => {
    const { getByText } = renderScreen()
    expect(getByText(/Major/)).toBeTruthy()
  })
})
