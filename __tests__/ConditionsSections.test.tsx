import React from 'react'
import { render } from '@testing-library/react-native'
import { WindSection } from '../features/conditions/sections/WindSection'
import { PressureSection } from '../features/conditions/sections/PressureSection'
import { SwellSection } from '../features/conditions/sections/SwellSection'
import { AirTempSection } from '../features/conditions/sections/AirTempSection'
import { SkySection } from '../features/conditions/sections/SkySection'
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

describe('SwellSection', () => {
  it('renders the swell chart', () => {
    const { getByTestId } = render(<SwellSection conditions={mockConditions} theme={theme} />)
    expect(getByTestId('swell-section-chart')).toBeTruthy()
  })

  it('returns null when swell data is missing (freshwater)', () => {
    const { toJSON } = render(<SwellSection conditions={{ ...mockConditions, swellHourly: null }} theme={theme} />)
    expect(toJSON()).toBeNull()
  })
})

describe('AirTempSection', () => {
  it('renders the air temperature chart', () => {
    const { getByTestId } = render(<AirTempSection conditions={mockConditions} theme={theme} />)
    expect(getByTestId('airtemp-section-chart')).toBeTruthy()
  })
})

describe('SkySection', () => {
  it('renders the sky & rain chart', () => {
    const { getByTestId } = render(<SkySection conditions={mockConditions} theme={theme} />)
    expect(getByTestId('sky-section-chart')).toBeTruthy()
  })
})
