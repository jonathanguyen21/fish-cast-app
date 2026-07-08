import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { VerdictHero } from '../features/score/VerdictHero'
import { getSkyTheme } from '../theme/skyTheme'
import type { ScoreBreakdown } from '../types/conditions'

const SKY = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear') // goldenPM
const GOOD: ScoreBreakdown = { pressure: 22, solunar: 18, tide: 16, wind: 12, waterTemp: 8, sky: 8 }

describe('VerdictHero', () => {
  it('renders the verdict phrase and bite/comfort chips', async () => {
    const { getByText, findByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY}
        summary="Falling pressure and a rising tide" betterDay={null} />
    )
    expect(getByText('Go — golden hour feed')).toBeTruthy()
    // bite = round(64/75*100) = 85, comfort = round(20/25*100) = 80
    expect(getByText('Bite 85')).toBeTruthy()
    expect(getByText('Comfort 80')).toBeTruthy()
    await findByText('84') // count-up settles on the real score
  })

  it('tapping the score toggles the free breakdown panel', async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY}
        summary="s" betterDay={null} />
    )
    expect(queryByTestId('hero-breakdown')).toBeNull()
    fireEvent.press(getByTestId('hero-score'))
    expect(getByTestId('hero-breakdown')).toBeTruthy()
    expect(getByText('Pressure')).toBeTruthy()
    expect(getByText('22 / 25')).toBeTruthy()
  })

  it('shows the better-day handoff when today is poor', () => {
    const POOR: ScoreBreakdown = { pressure: 5, solunar: 4, tide: 4, wind: 12, waterTemp: 4, sky: 8 }
    const { getByText } = render(
      <VerdictHero score={30} breakdown={POOR} spotType="saltwater" skyTheme={SKY}
        summary="s" betterDay={{ label: 'Wed', score: 84 }} />
    )
    expect(getByText('Save it for tomorrow')).toBeTruthy()
    expect(getByText('Wed looks great — 84')).toBeTruthy()
  })
})
