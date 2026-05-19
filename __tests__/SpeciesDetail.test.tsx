import React from 'react'
import { render } from '@testing-library/react-native'
import { SafeAreaInsetsContext } from 'react-native-safe-area-context'
import { SpeciesDetail } from '../features/species/SpeciesDetail'
import { westCoastSpecies } from '../data/species/westCoast'
import type { SpeciesScore } from '../types/species'
import type { SpeciesHourlyScore } from '../features/species/speciesHourlyScoring'

const species = westCoastSpecies.find(s => s.id === 'ca_halibut')!

function makeScore(overrides: Partial<SpeciesScore> = {}): SpeciesScore {
  return {
    species,
    score: 75,
    status: 'Active',
    waterTempMatch: 'Peak range',
    tideMatch: 'Incoming (preferred)',
    timeMatch: 'Dawn (prime time)',
    ...overrides,
  }
}

function makeHourly(peakHour = 9, peakScore = 80): SpeciesHourlyScore[] {
  return Array.from({ length: 16 }, (_, i) => {
    const hour = 5 + i
    return { hour, score: Math.max(0, peakScore - Math.abs(hour - peakHour) * 6) }
  })
}

describe('SpeciesDetail', () => {
  it('shows species common name', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText(species.common_name)).toBeTruthy()
  })

  it('shows scientific name', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText(species.scientific_name)).toBeTruthy()
  })

  it('shows score badge', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore({ score: 75 })} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('75')).toBeTruthy()
  })

  it('shows status label', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('Active')).toBeTruthy()
  })

  it('shows "Activity by Month" section title', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('Activity by Month')).toBeTruthy()
  })

  it('shows all 12 month abbreviations', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('Jan')).toBeTruthy()
    expect(getByText('Jun')).toBeTruthy()
    expect(getByText('Dec')).toBeTruthy()
  })

  it('shows current match labels', () => {
    const { getAllByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getAllByText('Water Temp').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('Tide').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('Time of Day').length).toBeGreaterThanOrEqual(1)
  })

  it('shows waterTempMatch value', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('Peak range')).toBeTruthy()
  })

  it('shows tideMatch value', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('Incoming (preferred)')).toBeTruthy()
  })

  it('shows "Fishing Tips" section', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('Fishing Tips')).toBeTruthy()
  })

  it('shows "Migration Notes" section', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText('Migration Notes')).toBeTruthy()
  })

  it('shows preferred tide in conditions section', () => {
    const { getAllByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    // species.preferred_tide = 'incoming'
    expect(getAllByText(/incoming/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows best window summary when hourly data provided', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} hourly={makeHourly()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText(/Best window:/)).toBeTruthy()
  })

  it('hides best window when hourly is all zeros', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    const { queryByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} hourly={zeros} /></SafeAreaInsetsContext.Provider>)
    expect(queryByText(/Best window:/)).toBeNull()
  })

  it('renders without hourly data', () => {
    const { getByText } = render(<SafeAreaInsetsContext.Provider value={{ top: 0, right: 0, bottom: 0, left: 0 }}><SpeciesDetail speciesScore={makeScore()} /></SafeAreaInsetsContext.Provider>)
    expect(getByText(species.common_name)).toBeTruthy()
  })
})
