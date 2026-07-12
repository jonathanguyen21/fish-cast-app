import React from 'react'
import { render } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
}))
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: true }) }))
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 49 }))
jest.mock('../hooks/useSpots', () => ({
  useSpots: () => ({ activeSpot: { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' } }),
}))
const mockConditions = require('./helpers/mockConditionsData').default
// Fixture's own sky is Overcast (see __tests__/helpers/mockConditionsData.ts)
// — deliberately conflicting with the mocked forecast entry below, so this
// suite proves Today prefers the forecast's (Week's) answer over its own.
jest.mock('../hooks/useConditions', () => ({
  useConditions: () => ({ data: mockConditions, isLoading: false, isError: false, refetch: jest.fn() }),
}))
jest.mock('../hooks/useForecast', () => ({
  useForecast: () => {
    const n = new Date()
    const todayKey = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
    return {
      data: [
        {
          date: todayKey,
          dayLabel: 'Today',
          peakScore: 70,
          scoreLabel: 'Decent — pick your window',
          peakWindow: { start: '8:00 AM', end: '11:00 AM' },
          skyIcon: 'clear',
          rainChance: 5,
        },
      ],
    }
  },
}))
jest.mock('../services/notificationService', () => ({ maybeScheduleFishingAlert: jest.fn() }))

import TodayScreen from '../app/(tabs)/index'

describe('Today reconciles its weather badge with Week\'s forecast data', () => {
  it('shows the forecast\'s sky condition, not conditions.sky, when they disagree', () => {
    const { getByText, queryByText } = render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <TodayScreen />
      </SafeAreaProvider>
    )
    // Forecast (Week's source) says clear/5% rain — badge should show "Clear".
    expect(getByText('Clear')).toBeTruthy()
    // conditions.sky (the fixture's own, hourly-derived value) says
    // Overcast — must NOT be what's displayed, since that's the exact
    // mismatch this fix closes.
    expect(queryByText('Overcast')).toBeNull()
  })
})
