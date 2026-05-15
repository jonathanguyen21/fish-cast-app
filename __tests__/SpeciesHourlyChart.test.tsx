import React from 'react'
import { render } from '@testing-library/react-native'
import { SpeciesHourlyChart } from '../features/species/SpeciesHourlyChart'
import { useSettingsStore } from '../store/settingsStore'

function fakeHourly() {
  return Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 40 + i * 3 }))
}

describe('SpeciesHourlyChart', () => {
  beforeEach(() => {
    useSettingsStore.setState({ isPro: false })
  })

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
})
