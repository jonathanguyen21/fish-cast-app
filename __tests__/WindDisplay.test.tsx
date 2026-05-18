import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { WindDisplay } from '../features/wind/WindDisplay'
import { useSettingsStore } from '../store/settingsStore'
import type { WindData } from '../types/conditions'

const WIND: WindData = {
  speed: 10, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph',
}

beforeEach(() => {
  useSettingsStore.setState({ speedUnit: 'mph' })
})

describe('WindDisplay', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<WindDisplay wind={WIND} />)
    expect(getByTestId('wind-display')).toBeTruthy()
  })

  it('shows wind speed', () => {
    const { getByText } = render(<WindDisplay wind={WIND} />)
    expect(getByText('10')).toBeTruthy()
  })

  it('shows unit label', () => {
    const { getByText } = render(<WindDisplay wind={WIND} />)
    expect(getByText('mph')).toBeTruthy()
  })

  it('shows direction label and gusts in sub text', () => {
    const { getByText } = render(<WindDisplay wind={WIND} />)
    expect(getByText(/SW/)).toBeTruthy()
    expect(getByText(/G 14/)).toBeTruthy()
  })

  it('shows "Moderate" quality label for speed 10', () => {
    const { getByText } = render(<WindDisplay wind={WIND} />)
    expect(getByText('Moderate')).toBeTruthy()
  })

  it('shows "Light" for speed 5', () => {
    const wind: WindData = { ...WIND, speed: 5 }
    const { getByText } = render(<WindDisplay wind={wind} />)
    expect(getByText('Light')).toBeTruthy()
  })

  it('shows "Strong" for speed 20', () => {
    const wind: WindData = { ...WIND, speed: 20 }
    const { getByText } = render(<WindDisplay wind={wind} />)
    expect(getByText('Strong')).toBeTruthy()
  })

  it('shows "Dangerous" for speed 26', () => {
    const wind: WindData = { ...WIND, speed: 26 }
    const { getByText } = render(<WindDisplay wind={wind} />)
    expect(getByText('Dangerous')).toBeTruthy()
  })

  it('shows "Calm" for speed 0', () => {
    const wind: WindData = { ...WIND, speed: 0 }
    const { getByText } = render(<WindDisplay wind={wind} />)
    expect(getByText('Calm')).toBeTruthy()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<WindDisplay wind={WIND} onPress={onPress} />)
    fireEvent.press(getByTestId('wind-display'))
    expect(onPress).toHaveBeenCalled()
  })

  it('shows peak speed when provided', () => {
    const { getByText } = render(<WindDisplay wind={WIND} peakSpeed={22} />)
    expect(getByText(/max 22/)).toBeTruthy()
  })

  it('hides peak speed label when not provided', () => {
    const { queryByText } = render(<WindDisplay wind={WIND} />)
    expect(queryByText(/max/)).toBeNull()
  })

  it('converts speed to knots when speedUnit is kts', () => {
    useSettingsStore.setState({ speedUnit: 'kts' })
    const { getByText } = render(<WindDisplay wind={WIND} />)
    // 10 mph × 0.868 = 8.68 → rounds to 9
    expect(getByText('9')).toBeTruthy()
    expect(getByText('kts')).toBeTruthy()
  })
})
