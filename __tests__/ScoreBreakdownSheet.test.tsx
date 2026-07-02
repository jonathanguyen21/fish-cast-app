import React from 'react'
import { render } from '@testing-library/react-native'
import { ScoreBreakdownSheet } from '../features/score/ScoreBreakdownSheet'
import type { ScoreBreakdown } from '../types/conditions'

const BREAKDOWN: ScoreBreakdown = {
  total: 72,
  scaled: false,
  capNote: null,
  factors: [
    { key: 'pressure', label: 'Pressure', points: 25, max: 25, note: 'Falling slowly — prime feeding trigger' },
    { key: 'solunar', label: 'Solunar', points: 5, max: 20, note: 'No solunar period near this hour' },
    { key: 'tide', label: 'Tide', points: 20, max: 20, note: 'Late incoming — strong water movement' },
    { key: 'wind', label: 'Wind', points: 15, max: 15, note: 'Light chop — ideal' },
    { key: 'waterTemp', label: 'Water Temp', points: 10, max: 10, note: 'In the productive temperature range' },
    { key: 'sky', label: 'Sky', points: 5, max: 10, note: 'Bright sun — fish hold deeper' },
  ],
}

describe('ScoreBreakdownSheet', () => {
  it('renders a row per factor with points and note', () => {
    const { getAllByTestId, getByText } = render(
      <ScoreBreakdownSheet visible onClose={() => {}} title="Right now — Score 72" breakdown={BREAKDOWN} />
    )
    expect(getAllByTestId('factor-row')).toHaveLength(6)
    expect(getByText('Right now — Score 72')).toBeTruthy()
    expect(getByText('Falling slowly — prime feeding trigger')).toBeTruthy()
    expect(getByText('25/25')).toBeTruthy()
  })

  it('shows the cap note when present', () => {
    const capped = { ...BREAKDOWN, total: 35, capNote: 'Dangerous wind caps the score at 35' }
    const { getByText } = render(
      <ScoreBreakdownSheet visible onClose={() => {}} title="3PM — Score 35" breakdown={capped} />
    )
    expect(getByText('Dangerous wind caps the score at 35')).toBeTruthy()
  })

  it('renders nothing when breakdown is null', () => {
    const { queryAllByTestId } = render(
      <ScoreBreakdownSheet visible onClose={() => {}} title="" breakdown={null} />
    )
    expect(queryAllByTestId('factor-row')).toHaveLength(0)
  })
})
