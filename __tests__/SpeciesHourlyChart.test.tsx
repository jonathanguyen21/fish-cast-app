import React from 'react'
import { render } from '@testing-library/react-native'
import { SpeciesHourlyChart } from '../features/species/SpeciesHourlyChart'
import { useSettingsStore } from '../store/settingsStore'

function fakeHourly(offset = 0) {
  return Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 40 + i * 3 + offset }))
}

beforeEach(() => {
  useSettingsStore.setState({ isPro: false })
})

describe('SpeciesHourlyChart', () => {
  it('renders 16 bars', () => {
    const { getAllByTestId } = render(<SpeciesHourlyChart hourly={fakeHourly()} />)
    expect(getAllByTestId(/species-hourly-bar-/)).toHaveLength(16)
  })

  it('shows Pro banner when user is not Pro', () => {
    const { getByText } = render(<SpeciesHourlyChart hourly={fakeHourly()} />)
    expect(getByText(/Pro/i)).toBeTruthy()
  })

  it('hides Pro banner when user is Pro', () => {
    useSettingsStore.setState({ isPro: true })
    const { queryByText } = render(<SpeciesHourlyChart hourly={fakeHourly()} />)
    expect(queryByText(/Unlock/i)).toBeNull()
  })

  it('renders nothing for all-zero hourly', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    const { queryAllByTestId } = render(<SpeciesHourlyChart hourly={zeros} />)
    expect(queryAllByTestId(/species-hourly-bar-/)).toHaveLength(0)
  })

  it('renders nothing for empty array', () => {
    const { toJSON } = render(<SpeciesHourlyChart hourly={[]} />)
    expect(toJSON()).toBeNull()
  })

  it('shows score values in bar labels', () => {
    const { getByText } = render(<SpeciesHourlyChart hourly={fakeHourly()} />)
    // Last bar: hour 20, score = 40 + 15*3 = 85
    expect(getByText('85')).toBeTruthy()
  })

  it('calls onUpgrade when Pro banner is pressed', () => {
    const onUpgrade = jest.fn()
    const { getByText } = render(<SpeciesHourlyChart hourly={fakeHourly()} onUpgrade={onUpgrade} />)
    const btn = getByText('Go Pro')
    const { fireEvent } = require('@testing-library/react-native')
    fireEvent.press(btn)
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('renders correct bar count for fewer than 16 hours', () => {
    const partial = Array.from({ length: 5 }, (_, i) => ({ hour: 10 + i, score: 50 + i * 5 }))
    const { getAllByTestId } = render(<SpeciesHourlyChart hourly={partial} />)
    expect(getAllByTestId(/species-hourly-bar-/)).toHaveLength(5)
  })
})
