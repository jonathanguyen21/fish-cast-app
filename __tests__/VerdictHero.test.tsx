import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { VerdictHero } from '../features/score/VerdictHero'
import { scoreColor } from '../features/score/scoringEngine'
import { getSkyTheme } from '../theme/skyTheme'
import type { ScoreBreakdown, SkyData } from '../types/conditions'

const SKY = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear') // goldenPM
const GOOD: ScoreBreakdown = { pressure: 22, solunar: 18, tide: 16, wind: 12, waterTemp: 8, sky: 8 }
const OVERCAST: SkyData = { condition: 'Overcast', rainChance: 10, icon: 'overcast' }
const RAINY: SkyData = { condition: 'Light Rain', rainChance: 45, icon: 'light-rain' }

describe('VerdictHero', () => {
  it('renders the verdict phrase and bite/comfort chips', async () => {
    const { getByText, findByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY} sky={OVERCAST}
        summary="Falling pressure and a rising tide" betterDay={null} />
    )
    expect(getByText('Great time to go — golden hour feed')).toBeTruthy()
    // bite = round(64/75*100) = 85, comfort = round(20/25*100) = 80
    expect(getByText('Bite 85')).toBeTruthy()
    expect(getByText('Comfort 80')).toBeTruthy()
    await findByText('84') // count-up settles on the real score
  })

  it('tapping the score toggles the free breakdown panel', async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY} sky={OVERCAST}
        summary="s" betterDay={null} />
    )
    expect(queryByTestId('hero-breakdown')).toBeNull()
    fireEvent.press(getByTestId('hero-score'))
    expect(getByTestId('hero-breakdown')).toBeTruthy()
    expect(getByText('Pressure')).toBeTruthy()
    expect(getByText('22 / 25')).toBeTruthy()
    expect(getByText(/Bite tracks how active the fish should be/)).toBeTruthy()
  })

  it('tapping either bite or comfort chip also toggles the breakdown panel', () => {
    const { getByTestId, queryByTestId } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY} sky={OVERCAST}
        summary="s" betterDay={null} />
    )
    expect(queryByTestId('hero-breakdown')).toBeNull()
    fireEvent.press(getByTestId('hero-chip-bite'))
    expect(getByTestId('hero-breakdown')).toBeTruthy()
    fireEvent.press(getByTestId('hero-chip-comfort'))
    expect(queryByTestId('hero-breakdown')).toBeNull()
  })

  it('labels the score "Bite score" without a "/100" suffix', () => {
    const { getByText, queryByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY} sky={OVERCAST}
        summary="s" betterDay={null} />
    )
    expect(getByText('Bite score')).toBeTruthy()
    expect(queryByText('/100')).toBeNull()
  })

  it('colors the settled score by its value', async () => {
    const { findByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY} sky={OVERCAST}
        summary="s" betterDay={null} />
    )
    const scoreEl = await findByText('84')
    const flatStyle = ([] as any[]).concat(scoreEl.props.style).flat()
    const colorStyle = flatStyle.find(s => s && s.color)
    expect(colorStyle.color).toBe(scoreColor(84))
  })

  it('shows the better-day handoff when today is poor', () => {
    const POOR: ScoreBreakdown = { pressure: 5, solunar: 4, tide: 4, wind: 12, waterTemp: 4, sky: 8 }
    const { getByText } = render(
      <VerdictHero score={30} breakdown={POOR} spotType="saltwater" skyTheme={SKY} sky={OVERCAST}
        summary="s" betterDay={{ label: 'Wed', score: 84 }} />
    )
    expect(getByText('Save it for tomorrow')).toBeTruthy()
    expect(getByText('Wed looks great — 84')).toBeTruthy()
  })

  it('shows a weather glyph with the sky condition when rain chance is low', () => {
    const { getByTestId, getByText } = render(
      <VerdictHero score={84} breakdown={GOOD} spotType="saltwater" skyTheme={SKY} sky={OVERCAST}
        summary="s" betterDay={null} />
    )
    expect(getByTestId('hero-weather-icon')).toBeTruthy()
    expect(getByText('Overcast')).toBeTruthy()
  })

  it('shows rain chance instead of the condition name when rain is likely', () => {
    const { getByText, queryByText } = render(
      <VerdictHero score={60} breakdown={GOOD} spotType="saltwater" skyTheme={SKY} sky={RAINY}
        summary="s" betterDay={null} />
    )
    expect(getByText('45% rain')).toBeTruthy()
    expect(queryByText('Light Rain')).toBeNull()
  })
})
