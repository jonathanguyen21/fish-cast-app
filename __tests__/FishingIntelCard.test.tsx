import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { FishingIntelCard } from '../features/conditions/FishingIntelCard'
import { MOCK_CONDITIONS } from '../data/mockData'

describe('FishingIntelCard', () => {
  it('renders the Fishing Intel header', () => {
    render(<FishingIntelCard conditions={MOCK_CONDITIONS} />)
    expect(screen.getByText('Fishing Intel')).toBeTruthy()
  })

  it('shows pressure insight for slowly falling pressure', () => {
    const conditions = {
      ...MOCK_CONDITIONS,
      pressure: { ...MOCK_CONDITIONS.pressure, trend: 'falling' as const, rate: 'slow' as const },
    }
    render(<FishingIntelCard conditions={conditions} />)
    expect(screen.getByText(/falling slowly/i)).toBeTruthy()
  })

  it('shows wind speed in pill text', () => {
    const conditions = {
      ...MOCK_CONDITIONS,
      wind: { ...MOCK_CONDITIONS.wind, speed: 18 },
    }
    render(<FishingIntelCard conditions={conditions} />)
    expect(screen.getByText(/18 mph/i)).toBeTruthy()
  })

  it('shows ideal water temp message when in range', () => {
    const conditions = {
      ...MOCK_CONDITIONS,
      water: { temp: 62, unit: '°F' },
    }
    render(<FishingIntelCard conditions={conditions} />)
    expect(screen.getByText(/fish active/i)).toBeTruthy()
  })

  it('shows cold water note when temp below 50', () => {
    const conditions = {
      ...MOCK_CONDITIONS,
      water: { temp: 45, unit: '°F' },
    }
    render(<FishingIntelCard conditions={conditions} />)
    expect(screen.getByText(/cold/i)).toBeTruthy()
  })

  it('shows tide incoming message when tide is incoming', () => {
    const conditions = {
      ...MOCK_CONDITIONS,
      tide: { ...MOCK_CONDITIONS.tide!, phase: 'incoming' as const },
    }
    render(<FishingIntelCard conditions={conditions} />)
    expect(screen.getByText(/incoming/i)).toBeTruthy()
  })
})
