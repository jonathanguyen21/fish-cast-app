import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
}

const MOCK_DATA = JSON.stringify({
  value: 29.95,
  trend: 'falling',
  rate: 'slow',
  unit: 'inHg',
  readings: [30.10, 30.08, 30.05, 30.02, 29.95],
})

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ back: jest.fn() }),
}))

const { useLocalSearchParams } = require('expo-router') as {
  useLocalSearchParams: jest.Mock
}

import PressureDetailScreen from '../app/detail/pressure'

function renderWithProvider() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <PressureDetailScreen />
    </SafeAreaProvider>
  )
}

function setData(overrides: object = {}) {
  useLocalSearchParams.mockReturnValue({
    data: JSON.stringify({
      value: 29.95,
      trend: 'falling',
      rate: 'slow',
      unit: 'inHg',
      readings: [30.10, 30.08, 30.05, 30.02, 29.95],
      ...overrides,
    }),
  })
}

beforeEach(() => {
  setData()
})

describe('PressureDetailScreen', () => {
  it('renders without crashing', () => {
    renderWithProvider()
    expect(screen.getByText('Pressure Detail')).toBeTruthy()
  })

  it('shows "Falling slowly" trend sentence for slow falling', () => {
    renderWithProvider()
    expect(screen.getByText(/Falling slowly/i)).toBeTruthy()
  })

  it('shows pressure value in the trend card', () => {
    renderWithProvider()
    expect(screen.getByText('29.95 inHg')).toBeTruthy()
  })

  it('shows "Falling fast" sentence for fast falling', () => {
    setData({ trend: 'falling', rate: 'fast' })
    renderWithProvider()
    expect(screen.getByText(/Falling fast/i)).toBeTruthy()
  })

  it('shows "Rising fast" sentence for fast rising', () => {
    setData({ trend: 'rising', rate: 'fast' })
    renderWithProvider()
    expect(screen.getByText(/Rising fast/i)).toBeTruthy()
  })

  it('shows "Stable" sentence for stable pressure', () => {
    setData({ trend: 'stable', rate: 'normal' })
    renderWithProvider()
    expect(screen.getByText(/Stable/)).toBeTruthy()
  })

  it('shows "Not enough pressure readings" when fewer than 2 readings', () => {
    setData({ readings: [29.95] })
    renderWithProvider()
    expect(screen.getByText(/Not enough pressure readings/i)).toBeTruthy()
  })

  it('shows "fish often go deep" hint for rising pressure', () => {
    setData({ trend: 'rising', rate: 'normal' })
    renderWithProvider()
    expect(screen.getByText(/deep/i)).toBeTruthy()
  })
})
