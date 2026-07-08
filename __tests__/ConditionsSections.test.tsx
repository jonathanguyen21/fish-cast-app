import React from 'react'
import { render } from '@testing-library/react-native'
import { WindSection } from '../features/conditions/sections/WindSection'
import { PressureSection } from '../features/conditions/sections/PressureSection'
import { getSkyTheme } from '../theme/skyTheme'
const mockConditions = require('./helpers/mockConditionsData').default

const theme = getSkyTheme(new Date('2026-07-07T12:00:00'), 37.6, -122.5, 'clear')

describe('WindSection', () => {
  it('renders the hourly wind chart', () => {
    const { getByTestId } = render(<WindSection conditions={mockConditions} theme={theme} />)
    expect(getByTestId('wind-section-chart')).toBeTruthy()
  })
})

describe('PressureSection', () => {
  it('renders the pressure trend chart', () => {
    const { getByTestId } = render(<PressureSection conditions={mockConditions} theme={theme} />)
    expect(getByTestId('pressure-section-chart')).toBeTruthy()
  })
})
