import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { ScoreDisplay } from '../features/score/ScoreDisplay'

describe('ScoreDisplay', () => {
  const props = {
    score: 82,
    label: 'Great day to fish',
    bestWindow: { start: '2:00 PM', end: '5:00 PM', score: 91 },
  }

  it('renders the score number', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText('82')).toBeTruthy()
  })

  it('renders the label', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText('Great day to fish')).toBeTruthy()
  })

  it('renders best window', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText(/2:00 PM/)).toBeTruthy()
  })

  it('shows tap hint before expansion', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText('Tap to see score breakdown')).toBeTruthy()
  })

  it('shows breakdown when tapped with breakdown data', () => {
    const breakdown = { pressure: 22, solunar: 18, tide: 16, wind: 14, waterTemp: 8, sky: 9 }
    render(<ScoreDisplay {...props} breakdown={breakdown} />)
    fireEvent.press(screen.getByTestId('score-display'))
    expect(screen.getByText('Pressure')).toBeTruthy()
    expect(screen.getByText('Solunar')).toBeTruthy()
    expect(screen.getByText('22 / 25')).toBeTruthy()
  })

  it('toggles collapse hint after tap', () => {
    const breakdown = { pressure: 20, solunar: 15, tide: 15, wind: 12, waterTemp: 8, sky: 8 }
    render(<ScoreDisplay {...props} breakdown={breakdown} />)
    fireEvent.press(screen.getByTestId('score-display'))
    expect(screen.getByText('Tap to collapse')).toBeTruthy()
  })
})
