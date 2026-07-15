import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
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
  useSpots: () => ({
    spots: [{ id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' }],
    activeSpot: { id: 's1', name: 'Pier', lat: 37.6, lng: -122.5, type: 'saltwater', stationId: '9414290', region: 'west_coast' },
    activeSpotId: 's1',
    setActiveSpot: jest.fn(),
  }),
}))
const mockConditions = require('./helpers/mockConditionsData').default
// The shared fixture's hourlyScores is [] — BiteCurve requires >= 2 points to
// render at all — so this file overrides it with a full 24-hour series, kept
// in a file of its own (rather than a second describe block in
// TodayScreen.test.tsx) so the mock is static/hoisted like every other
// hook-mocked screen test in this codebase, instead of needing
// jest.resetModules() mid-test (which breaks React Context sharing between
// the statically-imported SafeAreaProvider and a re-required screen module).
const mockHourlyScores = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'AM' : 'PM'}`,
  hourIndex: h,
  score: 50 + (h % 6) * 5,
}))
jest.mock('../hooks/useConditions', () => ({
  useConditions: () => ({
    data: { ...mockConditions, hourlyScores: mockHourlyScores },
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

describe('Today bite-curve scrub updates the other chips', () => {
  it('previews the wind and tide chips at the scrubbed hour while dragging, then reverts on release', () => {
    const { getByTestId, getByText, queryByText } = renderScreen()

    // Before scrubbing: fixture's constant current values.
    expect(getByText('Wind 8 mph')).toBeTruthy()
    expect(getByText('SW')).toBeTruthy()

    const chart = getByTestId('bite-curve-touch-area')
    const touchHistory = {
      touchBank: [{ touchActive: true, currentTimeStamp: 1, currentPageX: 160, currentPageY: 40 }],
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
    }
    // locationX 160 on the default 320-wide viewBox with 24 hourly points
    // resolves to hour index 12 (see BiteCurve.test.tsx for the same math).
    fireEvent(chart, 'responderGrant', { nativeEvent: { locationX: 160 }, touchHistory })

    // Fixture's windHourly[hour=12] = { speed: 11, directionLabel: 'SW' };
    // tide.hourlyCurve[12] = 4.3 ft, rising (delta from hour 11's 4.0 is +0.3).
    expect(getByText('Wind 11 mph')).toBeTruthy()
    expect(getByText('SW · 12:00 PM')).toBeTruthy()
    expect(getByText('Tide rising')).toBeTruthy()
    expect(getByText('4.3 ft · 12:00 PM')).toBeTruthy()

    fireEvent(chart, 'responderRelease', { nativeEvent: { locationX: 160 }, touchHistory })

    // Reverts to the live/current values once the finger lifts.
    expect(getByText('Wind 8 mph')).toBeTruthy()
    expect(getByText('SW')).toBeTruthy()
    expect(queryByText('SW · 12:00 PM')).toBeNull()
  })

  it('leaves the water-temp chip unaffected by scrubbing (no hourly water data exists)', () => {
    const { getByTestId, getByText } = renderScreen()
    // Fixture's water.temp = 58, unit '°F', estimated false → "58° water".
    expect(getByText('58° water')).toBeTruthy()

    const chart = getByTestId('bite-curve-touch-area')
    const touchHistory = {
      touchBank: [{ touchActive: true, currentTimeStamp: 1, currentPageX: 160, currentPageY: 40 }],
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
    }
    fireEvent(chart, 'responderGrant', { nativeEvent: { locationX: 160 }, touchHistory })
    expect(getByText('58° water')).toBeTruthy()
  })

  it('previews the weather badge at the scrubbed hour too, then reverts on release', () => {
    const { getByTestId, getByText, queryByText } = renderScreen()

    // Fixture's top-level sky is Overcast (rainChance 10, under the 20%
    // callout threshold, so the condition name shows directly).
    expect(getByText('Overcast')).toBeTruthy()

    const chart = getByTestId('bite-curve-touch-area')
    const touchHistory = {
      touchBank: [{ touchActive: true, currentTimeStamp: 1, currentPageX: 160, currentPageY: 40 }],
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
    }
    // Same hour-12 math as the sibling tests. Fixture's airHourly[hour=12]
    // = { cloudCover: 40, rainChance: 15 } -> skyDataForHour derives
    // partly-cloudy (rainChance under 40%, cloudCover in the 30-59% band).
    fireEvent(chart, 'responderGrant', { nativeEvent: { locationX: 160 }, touchHistory })
    expect(getByText('Partly Cloudy')).toBeTruthy()
    expect(queryByText('Overcast')).toBeNull()

    fireEvent(chart, 'responderRelease', { nativeEvent: { locationX: 160 }, touchHistory })
    expect(getByText('Overcast')).toBeTruthy()
    expect(queryByText('Partly Cloudy')).toBeNull()
  })
})
