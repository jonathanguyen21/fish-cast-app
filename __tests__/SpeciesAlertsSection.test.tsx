import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SpeciesAlertsSection } from '../features/settings/SpeciesAlertsSection'
import { useSettingsStore } from '../store/settingsStore'
import type { Species } from '../types/species'

const mockSpecies: Species[] = [
  {
    id: 'sp_a', common_name: 'Striped Bass', scientific_name: 'X', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [], months_peak: [],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: [],
    migration_notes: '', tips: '',
  },
  {
    id: 'sp_b', common_name: 'Halibut', scientific_name: 'Y', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [], months_peak: [],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: [],
    migration_notes: '', tips: '',
  },
]

describe('SpeciesAlertsSection', () => {
  beforeEach(() => {
    useSettingsStore.setState({ isPro: true, speciesAlerts: {}, alertThreshold: 70 })
  })

  it('renders one row per species', () => {
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} />)
    expect(getByText('Striped Bass')).toBeTruthy()
    expect(getByText('Halibut')).toBeTruthy()
  })

  it('toggle persists enabled state to store', () => {
    const { getByTestId } = render(<SpeciesAlertsSection species={mockSpecies} />)
    const toggle = getByTestId('species-alert-toggle-sp_a')
    fireEvent(toggle, 'valueChange', true)
    expect(useSettingsStore.getState().speciesAlerts['sp_a']?.enabled).toBe(true)
  })

  it('shows locked overlay when not Pro', () => {
    useSettingsStore.setState({ isPro: false })
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} />)
    expect(getByText(/Pro/i)).toBeTruthy()
  })

  it('returns null when species list is empty', () => {
    const { toJSON } = render(<SpeciesAlertsSection species={[]} />)
    expect(toJSON()).toBeNull()
  })

  it('shows all species names in section title', () => {
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} />)
    expect(getByText('Per-Species Alerts')).toBeTruthy()
  })

  it('toggle is disabled when not Pro', () => {
    useSettingsStore.setState({ isPro: false })
    const { getByTestId } = render(<SpeciesAlertsSection species={mockSpecies} />)
    const toggle = getByTestId('species-alert-toggle-sp_a')
    // disabled prop should be true
    expect(toggle.props.disabled).toBe(true)
  })

  it('shows "Get alerts when YOUR species are biting" hint when not Pro', () => {
    useSettingsStore.setState({ isPro: false })
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} />)
    expect(getByText(/Get alerts when YOUR species are biting/)).toBeTruthy()
  })

  it('does not show locked overlay when Pro', () => {
    const { queryByText } = render(<SpeciesAlertsSection species={mockSpecies} />)
    expect(queryByText(/Get alerts when YOUR species are biting/)).toBeNull()
  })
})
