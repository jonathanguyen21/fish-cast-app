import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { SkyBackground } from '../features/sky/SkyBackground'
import { getSkyTheme } from '../theme/skyTheme'

const LAT = 38.33
const LNG = -123.05
const DAY = getSkyTheme(new Date('2026-07-07T20:15:00Z'), LAT, LNG, 'clear')
const NIGHT = getSkyTheme(new Date('2026-07-07T09:00:00Z'), LAT, LNG, 'clear')

describe('SkyBackground', () => {
  it('renders children over the gradient', () => {
    const { getByText, getByTestId } = render(
      <SkyBackground theme={DAY}><Text>hello</Text></SkyBackground>
    )
    expect(getByText('hello')).toBeTruthy()
    expect(getByTestId('sky-gradient')).toBeTruthy()
  })
  it('shows stars only at night', () => {
    const day = render(<SkyBackground theme={DAY}><Text>x</Text></SkyBackground>)
    expect(day.queryAllByTestId('sky-star')).toHaveLength(0)
    const night = render(<SkyBackground theme={NIGHT}><Text>x</Text></SkyBackground>)
    expect(night.queryAllByTestId('sky-star').length).toBeGreaterThan(10)
  })
  it('crossfades: both layers present after a theme change so nothing goes transparent', () => {
    const { rerender, getByTestId } = render(
      <SkyBackground theme={DAY}><Text>x</Text></SkyBackground>
    )
    rerender(<SkyBackground theme={NIGHT}><Text>x</Text></SkyBackground>)
    expect(getByTestId('sky-gradient')).toBeTruthy()
    expect(getByTestId('sky-gradient-prev')).toBeTruthy()
  })
})
