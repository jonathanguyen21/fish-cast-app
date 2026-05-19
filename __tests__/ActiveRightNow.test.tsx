import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ActiveRightNow } from '../features/species/ActiveRightNow'
import type { Species, SpeciesScore } from '../types/species'
import type { SpeciesHourlyScore } from '../features/species/speciesHourlyScoring'

const baseSpecies = (id: string, name: string): Species => ({
  id, common_name: name, scientific_name: 'X', region: 'west_coast',
  type: 'saltwater', tier: 'free',
  months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [6],
  water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
  preferred_tide: 'incoming', preferred_time_of_day: ['dawn', 'morning'],
  migration_notes: '', tips: '',
})

function makeScore(id: string, name: string, score = 70): SpeciesScore {
  return {
    species: baseSpecies(id, name),
    score,
    status: 'Active',
    waterTempMatch: 'Peak range',
    tideMatch: 'Incoming (preferred)',
    timeMatch: 'Dawn (prime time)',
  }
}

const mockScoredSpecies: SpeciesScore[] = [
  makeScore('sp_a', 'Striped Bass', 70),
  makeScore('sp_b', 'Halibut', 65),
  makeScore('sp_c', 'Rockfish', 60),
]

function mkHourly(peakHour: number, peakScore: number): SpeciesHourlyScore[] {
  return Array.from({ length: 16 }, (_, i) => {
    const hour = 5 + i
    const distance = Math.abs(hour - peakHour)
    return { hour, score: Math.max(0, peakScore - distance * 5) }
  })
}

const allActive = {
  sp_a: mkHourly(12, 90),
  sp_b: mkHourly(12, 80),
  sp_c: mkHourly(12, 70),
}

describe('ActiveRightNow', () => {
  it('renders top species sorted by current-hour score', () => {
    const hourlyByMap = {
      sp_a: mkHourly(17, 80),
      sp_b: mkHourly(12, 90),
    }
    const { getByText } = render(
      <ActiveRightNow
        scoredSpecies={mockScoredSpecies.slice(0, 2)}
        hourlyByMap={hourlyByMap}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    expect(getByText('Halibut')).toBeTruthy()
    expect(getByText('Striped Bass')).toBeTruthy()
  })

  it('hides card when no species in season', () => {
    const { queryByText } = render(
      <ActiveRightNow
        scoredSpecies={[]}
        hourlyByMap={{}}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    expect(queryByText(/Active Right Now/i)).toBeNull()
  })

  it('shows inactive rows with quiet note when all species have score 0', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    const { queryByText, getByText } = render(
      <ActiveRightNow
        scoredSpecies={mockScoredSpecies.slice(0, 2)}
        hourlyByMap={{ sp_a: zeros, sp_b: zeros }}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    expect(getByText(/Active Right Now/i)).toBeTruthy()
    expect(getByText('Striped Bass')).toBeTruthy()
    expect(getByText('Halibut')).toBeTruthy()
    expect(queryByText(/No species peaking/i)).toBeTruthy()
  })

  it('tap calls onPressSpecies with id', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <ActiveRightNow
        scoredSpecies={mockScoredSpecies.slice(0, 2)}
        hourlyByMap={{ sp_a: mkHourly(12, 90), sp_b: mkHourly(17, 80) }}
        currentHour={12}
        onPressSpecies={onPress}
      />
    )
    fireEvent.press(getByTestId('active-row-sp_a'))
    expect(onPress).toHaveBeenCalledWith('sp_a')
  })

  it('respects maxRows prop and shows only that many rows', () => {
    const { queryByText } = render(
      <ActiveRightNow
        scoredSpecies={mockScoredSpecies}
        hourlyByMap={allActive}
        currentHour={12}
        onPressSpecies={() => {}}
        maxRows={2}
      />
    )
    // Only top 2 by score — sp_a (90) and sp_b (80); sp_c (70) excluded
    expect(queryByText('Striped Bass')).toBeTruthy()
    expect(queryByText('Halibut')).toBeTruthy()
    expect(queryByText('Rockfish')).toBeNull()
  })

  it('shows "See all species" button when onSeeAll is provided', () => {
    const { getByText } = render(
      <ActiveRightNow
        scoredSpecies={mockScoredSpecies.slice(0, 2)}
        hourlyByMap={allActive}
        currentHour={12}
        onPressSpecies={() => {}}
        onSeeAll={() => {}}
      />
    )
    expect(getByText('See all species')).toBeTruthy()
  })

  it('hides "See all species" button when onSeeAll is not provided', () => {
    const { queryByText } = render(
      <ActiveRightNow
        scoredSpecies={mockScoredSpecies.slice(0, 2)}
        hourlyByMap={allActive}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    expect(queryByText('See all species')).toBeNull()
  })

  it('calls onSeeAll when "See all species" is pressed', () => {
    const onSeeAll = jest.fn()
    const { getByText } = render(
      <ActiveRightNow
        scoredSpecies={mockScoredSpecies.slice(0, 2)}
        hourlyByMap={allActive}
        currentHour={12}
        onPressSpecies={() => {}}
        onSeeAll={onSeeAll}
      />
    )
    fireEvent.press(getByText('See all species'))
    expect(onSeeAll).toHaveBeenCalled()
  })

  it('shows overall score badge for inactive species (no hourly activity)', () => {
    const zeros = Array.from({ length: 16 }, (_, i) => ({ hour: 5 + i, score: 0 }))
    const scored = makeScore('sp_a', 'Striped Bass', 72)
    const { getByText } = render(
      <ActiveRightNow
        scoredSpecies={[scored]}
        hourlyByMap={{ sp_a: zeros }}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    expect(getByText('72')).toBeTruthy()
  })
})
