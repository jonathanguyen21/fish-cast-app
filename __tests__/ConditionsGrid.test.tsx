import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ConditionsGrid } from '../features/conditions/ConditionsGrid'
import type { PressureData, MoonData, SwellData, SkyData, SunData, AirData } from '../types/conditions'

const PRESSURE: PressureData = {
  value: 30.05, trend: 'stable', rate: 'slow', unit: 'inHg',
  readings: [30.05, 30.04, 30.05],
}
const MOON: MoonData = {
  phase: 'Full Moon', illumination: 100,
  majorPeriods: [], minorPeriods: [],
}
const SWELL: SwellData = { height: 3.2, period: 8, direction: 270, directionLabel: 'W', unit: 'ft' }
const SKY: SkyData = { condition: 'Clear', rainChance: 5, icon: 'clear' }
const SUN: SunData = { sunrise: '6:15 AM', sunset: '8:30 PM' }
const AIR: AirData = { temp: 62, high: 68, low: 55, humidity: 75, unit: 'F' }

const PROPS = {
  conditions: { pressure: PRESSURE, moon: MOON, swell: SWELL, sky: SKY, sun: SUN, air: AIR },
  spotType: 'saltwater' as const,
}

describe('ConditionsGrid', () => {
  it('renders the "Conditions" section title', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('Conditions')).toBeTruthy()
  })

  it('shows "Tap any card for details" subtitle', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('Tap any card for details')).toBeTruthy()
  })

  it('renders swell height and period', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('3.2 ft')).toBeTruthy()
    expect(getByText('8s W')).toBeTruthy()
  })

  it('shows sky rain chance', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('5%')).toBeTruthy()
  })

  it('shows sky condition label', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('Clear')).toBeTruthy()
  })

  it('shows air temp value', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('62°')).toBeTruthy()
  })

  it('shows sunrise time', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('6:15 AM')).toBeTruthy()
  })

  it('shows sunset time', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('8:30 PM')).toBeTruthy()
  })

  it('calls onPressSky when sky card is tapped', () => {
    const onPressSky = jest.fn()
    const { getByText } = render(<ConditionsGrid {...PROPS} onPressSky={onPressSky} />)
    fireEvent.press(getByText('5%'))
    expect(onPressSky).toHaveBeenCalled()
  })

  it('calls onPressSun when sun card is tapped', () => {
    const onPressSun = jest.fn()
    const { getByText } = render(<ConditionsGrid {...PROPS} onPressSun={onPressSun} />)
    fireEvent.press(getByText('6:15 AM'))
    expect(onPressSun).toHaveBeenCalled()
  })

  it('calls onPressAir when air card is tapped', () => {
    const onPressAir = jest.fn()
    const { getByText } = render(<ConditionsGrid {...PROPS} onPressAir={onPressAir} />)
    fireEvent.press(getByText('62°'))
    expect(onPressAir).toHaveBeenCalled()
  })

  it('calls onPressSwell when swell card is tapped', () => {
    const onPressSwell = jest.fn()
    const { getByText } = render(<ConditionsGrid {...PROPS} onPressSwell={onPressSwell} />)
    fireEvent.press(getByText('3.2 ft'))
    expect(onPressSwell).toHaveBeenCalled()
  })

  it('shows freshwater fallback when spotType is freshwater and swell is null', () => {
    const { getByText } = render(
      <ConditionsGrid
        conditions={{ ...PROPS.conditions, swell: null }}
        spotType="freshwater"
      />
    )
    expect(getByText('Freshwater')).toBeTruthy()
  })

  it('shows "No data" when swell is null and spot is saltwater', () => {
    const { getByText } = render(
      <ConditionsGrid
        conditions={{ ...PROPS.conditions, swell: null }}
        spotType="saltwater"
      />
    )
    expect(getByText('No data')).toBeTruthy()
  })

  it('renders moon phase from MoonCard', () => {
    const { getByText } = render(<ConditionsGrid {...PROPS} />)
    expect(getByText('Full Moon')).toBeTruthy()
  })
})
