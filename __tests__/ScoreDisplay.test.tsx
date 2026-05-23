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

  it('hides breakdown after second tap (collapse)', () => {
    const breakdown = { pressure: 22, solunar: 18, tide: 16, wind: 14, waterTemp: 8, sky: 9 }
    render(<ScoreDisplay {...props} breakdown={breakdown} />)
    const dial = screen.getByTestId('score-display')
    fireEvent.press(dial) // expand
    expect(screen.getByText('Tap to collapse')).toBeTruthy()
    fireEvent.press(dial) // collapse
    expect(screen.getByText('Tap to see score breakdown')).toBeTruthy()
  })

  it('renders without breakdown prop (no crash)', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.getByText('82')).toBeTruthy()
    expect(screen.getByText('Tap to see score breakdown')).toBeTruthy()
  })

  it('shows all 6 factor labels in breakdown', () => {
    const breakdown = { pressure: 22, solunar: 18, tide: 16, wind: 14, waterTemp: 8, sky: 9 }
    render(<ScoreDisplay {...props} breakdown={breakdown} />)
    fireEvent.press(screen.getByTestId('score-display'))
    expect(screen.getByText('Pressure')).toBeTruthy()
    expect(screen.getByText('Solunar')).toBeTruthy()
    expect(screen.getByText('Tide')).toBeTruthy()
    expect(screen.getByText('Wind')).toBeTruthy()
    expect(screen.getByText('Water Temp')).toBeTruthy()
    expect(screen.getByText('Sky')).toBeTruthy()
  })

  it('shows hint text for each factor in breakdown', () => {
    // pressure=22/25 ratio=0.88 → 'Slowly falling — fish feeding'
    const breakdown = { pressure: 22, solunar: 19, tide: 18, wind: 14, waterTemp: 9, sky: 9 }
    render(<ScoreDisplay {...props} breakdown={breakdown} />)
    fireEvent.press(screen.getByTestId('score-display'))
    expect(screen.getByText('Slowly falling — fish feeding')).toBeTruthy()
    // solunar=19/20 ratio=0.95 → 'Major period — peak feeding'
    expect(screen.getByText('Major period — peak feeding')).toBeTruthy()
  })

  it('shows "Also good" for second window when provided', () => {
    const secondWindow = { start: '7:00 AM', end: '10:00 AM', score: 74 }
    render(<ScoreDisplay {...props} secondWindow={secondWindow} />)
    expect(screen.getByText('Also good')).toBeTruthy()
    expect(screen.getByText(/7:00 AM/)).toBeTruthy()
  })

  it('does not show second window row when not provided', () => {
    render(<ScoreDisplay {...props} />)
    expect(screen.queryByText('Also good')).toBeNull()
  })
})
