import React from 'react'
import { render, fireEvent, within } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSettingsStore } from '../store/settingsStore'

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDays(dateKey: string, n: number): string {
  const d = new Date(dateKey + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return localDateKey(d)
}

const TODAY_KEY = localDateKey(new Date())
const DAY_KEYS = Array.from({ length: 7 }, (_, i) => addDays(TODAY_KEY, i))
const mockForecast = DAY_KEYS.map((date, i) => ({
  date,
  dayLabel: i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
  peakScore: 70,
  scoreLabel: 'Great day to fish',
  peakWindow: { start: '6:00 PM', end: '8:00 PM' },
}))

const mockPush = jest.fn()
const mockSetParams = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
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
jest.mock('../hooks/useConditions', () => ({
  useConditions: () => ({ data: mockConditions, isLoading: false, isError: false, refetch: jest.fn() }),
}))
jest.mock('../hooks/useForecast', () => ({ useForecast: () => ({ data: mockForecast }) }))
jest.mock('../services/notificationService', () => ({ maybeScheduleFishingAlert: jest.fn() }))

import TodayScreen from '../app/(tabs)/index'

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TodayScreen />
    </SafeAreaProvider>
  )
}

describe('Today day-of-week selector', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockSetParams.mockClear()
    useSettingsStore.setState({ isPro: false })
  })

  it('renders a pill for each forecast day, with "Today" for the current day', () => {
    const { getByTestId } = renderScreen()
    for (const key of DAY_KEYS) {
      expect(getByTestId(`day-pill-${key}`)).toBeTruthy()
    }
    expect(within(getByTestId(`day-pill-${DAY_KEYS[0]}`)).getByText('Today')).toBeTruthy()
  })

  it('switches to an unlocked day (tomorrow) by setting the date param', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId(`day-pill-${DAY_KEYS[1]}`))
    expect(mockSetParams).toHaveBeenCalledWith({ date: DAY_KEYS[1] })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('clears the date param when tapping back to today', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId(`day-pill-${DAY_KEYS[0]}`))
    expect(mockSetParams).toHaveBeenCalledWith({ date: undefined })
  })

  it('pushes to Pro settings instead of switching when a locked day (day 3+) is tapped', () => {
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId(`day-pill-${DAY_KEYS[3]}`))
    expect(mockPush).toHaveBeenCalledWith('/settings')
    expect(mockSetParams).not.toHaveBeenCalled()
  })

  it('lets Pro users switch to any day, including day 3+', () => {
    useSettingsStore.setState({ isPro: true })
    const { getByTestId } = renderScreen()
    fireEvent.press(getByTestId(`day-pill-${DAY_KEYS[3]}`))
    expect(mockSetParams).toHaveBeenCalledWith({ date: DAY_KEYS[3] })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
