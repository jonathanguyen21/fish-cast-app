import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import PressureDetailScreen from '../app/detail/pressure'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    data: JSON.stringify({
      value: 29.95,
      trend: 'falling',
      rate: 'slow',
      unit: 'inHg',
      readings: [30.10, 30.08, 30.05, 30.02, 29.95],
    }),
  }),
  useRouter: () => ({ back: jest.fn() }),
}))

describe('PressureDetailScreen', () => {
  it('renders without crashing', () => {
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 375, height: 812 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}
      >
        <PressureDetailScreen />
      </SafeAreaProvider>
    )
    expect(screen.getByText('Pressure Detail')).toBeTruthy()
  })

  it('shows trend sentence', () => {
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 375, height: 812 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}
      >
        <PressureDetailScreen />
      </SafeAreaProvider>
    )
    expect(screen.getByText(/Falling slowly/i)).toBeTruthy()
  })
})
