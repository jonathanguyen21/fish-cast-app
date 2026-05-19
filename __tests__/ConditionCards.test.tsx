import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PressureCard } from '../features/conditions/PressureCard'
import { MoonCard } from '../features/conditions/MoonCard'
import type { PressureData, MoonData } from '../types/conditions'

const PRESSURE: PressureData = {
  value: 30.05,
  trend: 'falling',
  rate: 'slow',
  unit: 'inHg',
  readings: [30.18, 30.12, 30.05],
}

const MOON: MoonData = {
  phase: 'Waxing Gibbous',
  illumination: 72,
  majorPeriods: [{ start: '4:00 PM', end: '5:00 PM' }],
  minorPeriods: [{ start: '10:15 AM', end: '11:15 AM' }],
}

describe('PressureCard', () => {
  it('shows pressure value formatted to 2 decimals', () => {
    const { getByText } = render(<PressureCard pressure={PRESSURE} />)
    expect(getByText('30.05')).toBeTruthy()
  })

  it('shows pressure unit', () => {
    const { getByText } = render(<PressureCard pressure={PRESSURE} />)
    expect(getByText('inHg')).toBeTruthy()
  })

  it('shows trend label', () => {
    const { getByText } = render(<PressureCard pressure={PRESSURE} />)
    expect(getByText('falling')).toBeTruthy()
  })

  it('shows rising trend', () => {
    const rising: PressureData = { ...PRESSURE, trend: 'rising', readings: [29.90, 29.95, 30.05] }
    const { getByText } = render(<PressureCard pressure={rising} />)
    expect(getByText('rising')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(<PressureCard pressure={PRESSURE} onPress={onPress} />)
    fireEvent.press(getByText('30.05'))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders without onPress', () => {
    const { getByText } = render(<PressureCard pressure={PRESSURE} />)
    expect(getByText('30.05')).toBeTruthy()
  })
})

describe('MoonCard', () => {
  it('shows illumination percentage', () => {
    const { getByText } = render(<MoonCard moon={MOON} onPress={() => {}} />)
    expect(getByText('72%')).toBeTruthy()
  })

  it('shows moon phase label', () => {
    const { getByText } = render(<MoonCard moon={MOON} onPress={() => {}} />)
    expect(getByText('Waxing Gibbous')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(<MoonCard moon={MOON} onPress={onPress} />)
    fireEvent.press(getByText('Waxing Gibbous'))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders without major periods', () => {
    const noMoon: MoonData = { ...MOON, majorPeriods: [], minorPeriods: [] }
    const { getByText } = render(<MoonCard moon={noMoon} onPress={() => {}} />)
    expect(getByText('Waxing Gibbous')).toBeTruthy()
  })
})
