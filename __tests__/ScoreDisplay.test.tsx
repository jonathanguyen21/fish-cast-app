import React from 'react'
import { render, screen } from '@testing-library/react-native'
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
})
