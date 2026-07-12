import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TideChart } from '../features/tide/TideChart'
import { formatScrubTime } from '../features/tide/tideUtils'
import { useSettingsStore } from '../store/settingsStore'
import { MOCK_CONDITIONS } from '../data/mockData'
import { getSkyTheme } from '../theme/skyTheme'

const TIDE = MOCK_CONDITIONS.tide!
const SKY = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear')

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

  it('shows the now-marker when currentHour is a number', () => {
    render(<TideChart tide={TIDE} currentHour={14} />)
    expect(screen.getByTestId('tide-now-marker')).toBeTruthy()
  })

  it('renders no now-marker when currentHour is null', () => {
    render(<TideChart tide={TIDE} currentHour={null} />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
    expect(screen.queryByTestId('tide-now-marker')).toBeNull()
  })

  it('renders without crashing when given a theme and bordered card style', () => {
    render(<TideChart tide={TIDE} currentHour={14} theme={SKY} bordered backgroundColor="rgba(0,0,0,0.3)" />)
    expect(screen.getByTestId('tide-chart')).toBeTruthy()
    expect(screen.getByTestId('tide-now-marker')).toBeTruthy()
  })
})
