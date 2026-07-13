import React from 'react'
import { render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
}))
jest.mock('../hooks/useSpots', () => ({
  useSpots: () => ({ activeSpot: { id: 's1', name: 'Berkeley Marina', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' } }),
}))
jest.mock('../hooks/useForecast', () => ({ useForecast: () => ({ data: [], isLoading: false, isError: false, isRefetching: false, refetch: jest.fn() }) }))

import WeekScreen from '../app/(tabs)/week'

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <WeekScreen />
    </SafeAreaProvider>
  )
}

describe('Week screen header', () => {
  it('shows the active spot name, matching Today\'s header pattern', () => {
    const { getByText } = renderScreen()
    expect(getByText('Berkeley Marina')).toBeTruthy()
  })
})
