import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { WeekDayCard } from '../features/forecast/WeekDayCard'
import { getSkyTheme } from '../theme/skyTheme'

const MINI = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear')

const BASE = {
  dayLabel: 'Wed',
  skyWord: 'clear',
  windowLabel: 'Best 5:00 PM–7:00 PM',
  note: 'High 72° · 10% rain',
  score: 84,
  miniSky: MINI,
  isBest: false,
  locked: false,
  textTint: '#FFF8F0',
}

describe('WeekDayCard', () => {
  it('renders day, sky word, window, note, score, and the mini-sky swatch', () => {
    const { getByText, getByTestId } = render(<WeekDayCard {...BASE} onPress={() => {}} />)
    expect(getByText(/Wed/)).toBeTruthy()
    expect(getByText(/clear/)).toBeTruthy()
    expect(getByText(/Best 5:00 PM–7:00 PM/)).toBeTruthy()
    expect(getByText(/High 72° · 10% rain/)).toBeTruthy()
    expect(getByText('84')).toBeTruthy()
    expect(getByTestId('week-day-minisky')).toBeTruthy()
  })

  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<WeekDayCard {...BASE} onPress={onPress} />)
    fireEvent.press(getByTestId('week-day-card'))
    expect(onPress).toHaveBeenCalled()
  })

  it('shows the BEST tag only when isBest', () => {
    const { queryByText, rerender, getByText } = render(<WeekDayCard {...BASE} onPress={() => {}} />)
    expect(queryByText('BEST')).toBeNull()
    rerender(<WeekDayCard {...BASE} isBest onPress={() => {}} />)
    expect(getByText('BEST')).toBeTruthy()
  })

  it('locked card hides details, shows the Pro lock, and still fires onPress (upgrade)', () => {
    const onPress = jest.fn()
    const { getByText, queryByText, getByTestId } = render(
      <WeekDayCard {...BASE} locked onPress={onPress} />
    )
    expect(getByText(/Wed/)).toBeTruthy()
    expect(getByText('Unlock with Pro')).toBeTruthy()
    expect(queryByText('84')).toBeNull()
    expect(queryByText(/Best 5:00 PM/)).toBeNull()
    fireEvent.press(getByTestId('week-day-card'))
    expect(onPress).toHaveBeenCalled()
  })
})
