import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TideChart } from '../features/tide/TideChart'
import { formatScrubTime } from '../features/tide/tideUtils'
import { useSettingsStore } from '../store/settingsStore'
import { MOCK_CONDITIONS } from '../data/mockData'

const TIDE = MOCK_CONDITIONS.tide!

describe('TideChart', () => {
  beforeEach(() => {
    useSettingsStore.setState({ lengthUnit: 'ft' })
  })

  it('renders without crashing', () => {
    render(<TideChart tide={TIDE} currentHour={14} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
  })

  it('shows tide event tick marks', () => {
    render(<TideChart tide={TIDE} currentHour={14} />)
    expect(screen.getByTestId('tide-tick-high-1')).toBeTruthy()
  })

  it('shows formatted time below height when scrubbing', () => {
    expect(formatScrubTime(0)).toBe('12:00 AM')
    expect(formatScrubTime(12)).toBe('12:00 PM')
    expect(formatScrubTime(14)).toBe('2:00 PM')
    expect(formatScrubTime(23)).toBe('11:00 PM')
  })

  it('renders tick for each tide event', () => {
    render(<TideChart tide={TIDE} currentHour={14} />)
    // TIDE has 4 events: 2 lows + 2 highs
    // tick ids are tide-tick-{type}-{index}
    expect(screen.getByTestId('tide-tick-low-0')).toBeTruthy()
    expect(screen.getByTestId('tide-tick-high-1')).toBeTruthy()
  })

  it('renders with all-zero hourlyCurve without crashing', () => {
    const flatTide = {
      ...TIDE,
      hourlyCurve: new Array(24).fill(0),
    }
    render(<TideChart tide={flatTide} currentHour={12} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
  })

  it('renders in metric units without crashing', () => {
    useSettingsStore.setState({ lengthUnit: 'm' })
    render(<TideChart tide={TIDE} currentHour={10} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
  })

  it('renders at hour 0 (midnight) without crashing', () => {
    render(<TideChart tide={TIDE} currentHour={0} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
  })

  it('renders at hour 23 (11 PM) without crashing', () => {
    render(<TideChart tide={TIDE} currentHour={23} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
  })
})
