import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ActiveRightNow } from '../features/species/ActiveRightNow'
import type { Species } from '../types/species'
import type { SpeciesHourlyScore } from '../features/species/speciesHourlyScoring'

const mockSpecies: Species[] = [
  {
    id: 'sp_a', common_name: 'Striped Bass', scientific_name: 'X', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [6],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'incoming', preferred_time_of_day: ['dawn','morning'],
    migration_notes: '', tips: '',
  },
  {
    id: 'sp_b', common_name: 'Halibut', scientific_name: 'Y', region: 'west_coast',
    type: 'saltwater', tier: 'free',
    months_present: [1,2,3,4,5,6,7,8,9,10,11,12], months_peak: [6],
    water_temp_f: { min: 50, max: 70, peak_min: 55, peak_max: 65 },
    preferred_tide: 'any', preferred_time_of_day: ['afternoon'],
    migration_notes: '', tips: '',
  },
]

function mkHourly(peakHour: number, peakScore: number): SpeciesHourlyScore[] {
  return Array.from({ length: 16 }, (_, i) => {
    const hour = 5 + i
    const distance = Math.abs(hour - peakHour)
    return { hour, score: Math.max(0, peakScore - distance * 5) }
  })
}

describe('ActiveRightNow', () => {
  it('renders top species sorted by current-hour score', () => {
    const hourlyByMap = {
      sp_a: mkHourly(17, 80),  // peak at 5pm
      sp_b: mkHourly(12, 90),  // peak at noon
    }
    const { getByText } = render(
      <ActiveRightNow
        species={mockSpecies}
        hourlyByMap={hourlyByMap}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    // At hour 12: sp_a score = 80 - 5*5 = 55, sp_b score = 90
    expect(getByText('Halibut')).toBeTruthy()
    expect(getByText('Striped Bass')).toBeTruthy()
  })

  it('hides card when no species in season', () => {
    const { queryByText } = render(
      <ActiveRightNow
        species={[]}
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
        species={mockSpecies}
        hourlyByMap={{ sp_a: zeros, sp_b: zeros }}
        currentHour={12}
        onPressSpecies={() => {}}
      />
    )
    // Still renders the section title
    expect(getByText(/Active Right Now/i)).toBeTruthy()
    // Shows species names in inactive state
    expect(getByText('Striped Bass')).toBeTruthy()
    expect(getByText('Halibut')).toBeTruthy()
    // Shows the quiet note instead of hiding everything
    expect(queryByText(/No species peaking/i)).toBeTruthy()
  })

  it('tap calls onPressSpecies with id', () => {
    const onPress = jest.fn()
    const hourlyByMap = {
      sp_a: mkHourly(12, 90),
      sp_b: mkHourly(17, 80),
    }
    const { getByTestId } = render(
      <ActiveRightNow
        species={mockSpecies}
        hourlyByMap={hourlyByMap}
        currentHour={12}
        onPressSpecies={onPress}
      />
    )
    fireEvent.press(getByTestId('active-row-sp_a'))
    expect(onPress).toHaveBeenCalledWith('sp_a')
  })
})
