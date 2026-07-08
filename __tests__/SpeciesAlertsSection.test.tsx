import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SpeciesAlertsSection } from '../features/settings/SpeciesAlertsSection'
import { useSettingsStore } from '../store/settingsStore'
import { getSkyTheme } from '../theme/skyTheme'
import type { Species } from '../types/species'

const theme = getSkyTheme(new Date('2026-07-07T12:00:00'), 37.6, -122.5, 'clear')

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

  it('returns null when species list is empty', () => {
    const { toJSON } = render(<SpeciesAlertsSection species={[]} theme={theme} />)
    expect(toJSON()).toBeNull()
  })

  it('shows section title and summary row', () => {
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    expect(getByText('Per-Species Alerts')).toBeTruthy()
    expect(getByText('Species Alerts')).toBeTruthy()
  })

  it('shows "None" chip when no species alerts are enabled', () => {
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    expect(getByText('None')).toBeTruthy()
  })

  it('shows enabled count chip when alerts are on', () => {
    useSettingsStore.setState({ speciesAlerts: { sp_a: { enabled: true, threshold: 70 } } })
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    expect(getByText('1 on')).toBeTruthy()
  })

  it('shows Pro chip when not Pro', () => {
    useSettingsStore.setState({ isPro: false })
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    expect(getByText('Pro')).toBeTruthy()
  })

  it('renders species names inside modal after opening', () => {
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    fireEvent.press(getByText('Species Alerts'))
    expect(getByText('Striped Bass')).toBeTruthy()
    expect(getByText('Halibut')).toBeTruthy()
  })

  it('toggle persists enabled state to store', () => {
    const { getByText, getByTestId } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    fireEvent.press(getByText('Species Alerts'))
    const toggle = getByTestId('species-alert-toggle-sp_a')
    fireEvent(toggle, 'valueChange', true)
    expect(useSettingsStore.getState().speciesAlerts['sp_a']?.enabled).toBe(true)
  })

  it('toggle is disabled when not Pro', () => {
    useSettingsStore.setState({ isPro: false })
    const { getByText, getByTestId } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    fireEvent.press(getByText('Species Alerts'))
    const toggle = getByTestId('species-alert-toggle-sp_a')
    expect(toggle.props.disabled).toBe(true)
  })

  it('shows pro upsell banner inside modal when not Pro', () => {
    useSettingsStore.setState({ isPro: false })
    const { getByText } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    fireEvent.press(getByText('Species Alerts'))
    expect(getByText(/Upgrade to Pro/i)).toBeTruthy()
  })

  it('does not show pro upsell banner when Pro', () => {
    const { getByText, queryByText } = render(<SpeciesAlertsSection species={mockSpecies} theme={theme} />)
    fireEvent.press(getByText('Species Alerts'))
    expect(queryByText(/Upgrade to Pro/i)).toBeNull()
  })
})
