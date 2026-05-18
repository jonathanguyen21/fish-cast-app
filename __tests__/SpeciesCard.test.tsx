import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SpeciesCard } from '../features/species/SpeciesCard'
import { westCoastSpecies } from '../data/species/westCoast'
import type { SpeciesScore } from '../types/species'

const freeSpecies = westCoastSpecies.find(s => s.tier === 'free')!
const proSpecies = westCoastSpecies.find(s => s.tier === 'pro')!

function makeScore(species: typeof freeSpecies, score = 75): SpeciesScore {
  return { species, score, status: 'Active', waterTempMatch: 'Peak range', tideMatch: 'Incoming (preferred)', timeMatch: 'Dawn (prime time)' }
}

describe('SpeciesCard', () => {
  it('renders species name', () => {
    const { getByText } = render(
      <SpeciesCard speciesScore={makeScore(freeSpecies)} isPro={false} onPress={() => {}} />
    )
    expect(getByText(freeSpecies.common_name)).toBeTruthy()
  })

  it('renders status label', () => {
    const { getByText } = render(
      <SpeciesCard speciesScore={makeScore(freeSpecies)} isPro={false} onPress={() => {}} />
    )
    expect(getByText('Active')).toBeTruthy()
  })

  it('renders score for free species regardless of Pro status', () => {
    const { getByText } = render(
      <SpeciesCard speciesScore={makeScore(freeSpecies, 75)} isPro={false} onPress={() => {}} />
    )
    expect(getByText('75')).toBeTruthy()
  })

  it('shows "?" for locked pro species when not Pro', () => {
    const { getByText } = render(
      <SpeciesCard speciesScore={makeScore(proSpecies, 80)} isPro={false} onPress={() => {}} />
    )
    expect(getByText('?')).toBeTruthy()
  })

  it('shows real score for pro species when user is Pro', () => {
    const { getByText } = render(
      <SpeciesCard speciesScore={makeScore(proSpecies, 80)} isPro={true} onPress={() => {}} />
    )
    expect(getByText('80')).toBeTruthy()
  })

  it('shows upgrade hint for locked pro species', () => {
    const { getByText } = render(
      <SpeciesCard speciesScore={makeScore(proSpecies)} isPro={false} onPress={() => {}} />
    )
    expect(getByText(/Upgrade to Pro/)).toBeTruthy()
  })

  it('hides upgrade hint when user is Pro', () => {
    const { queryByText } = render(
      <SpeciesCard speciesScore={makeScore(proSpecies)} isPro={true} onPress={() => {}} />
    )
    expect(queryByText(/Upgrade to Pro/)).toBeNull()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <SpeciesCard speciesScore={makeScore(freeSpecies)} isPro={false} onPress={onPress} />
    )
    fireEvent.press(getByTestId(`species-card-${freeSpecies.id}`))
    expect(onPress).toHaveBeenCalled()
  })
})
