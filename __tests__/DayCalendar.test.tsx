import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { DayCalendar } from '../features/calendar/DayCalendar'

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const currentMonthLabel = `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`

describe('DayCalendar', () => {
  it('shows current month name and year', () => {
    const { getByText } = render(
      <DayCalendar selectedDate={todayStr} onSelect={() => {}} todayScore={75} isPro={false} />
    )
    expect(getByText(currentMonthLabel)).toBeTruthy()
  })

  it('shows weekday headers', () => {
    const { getAllByText } = render(
      <DayCalendar selectedDate={todayStr} onSelect={() => {}} todayScore={null} isPro={false} />
    )
    expect(getAllByText('S').length).toBeGreaterThanOrEqual(2)
    expect(getAllByText('M').length).toBeGreaterThanOrEqual(1)
  })

  it('renders today cell as a number in the grid', () => {
    const { getAllByText } = render(
      <DayCalendar selectedDate={todayStr} onSelect={() => {}} todayScore={null} isPro={false} />
    )
    const dayNumber = String(today.getDate())
    expect(getAllByText(dayNumber).length).toBeGreaterThanOrEqual(1)
  })

  it('calls onSelect with the correct date string', () => {
    const onSelect = jest.fn()
    const { getAllByText } = render(
      <DayCalendar selectedDate={todayStr} onSelect={onSelect} todayScore={null} isPro={true} />
    )
    // Today's date cell
    const todayNum = String(today.getDate())
    fireEvent.press(getAllByText(todayNum)[0])
    expect(onSelect).toHaveBeenCalledWith(todayStr)
  })

  it('shows legend with Score, Major moon, and Pro labels', () => {
    const { getByText } = render(
      <DayCalendar selectedDate={todayStr} onSelect={() => {}} todayScore={75} isPro={false} />
    )
    expect(getByText('Score')).toBeTruthy()
    expect(getByText('Major moon')).toBeTruthy()
    expect(getByText('Pro')).toBeTruthy()
  })

  it('renders without crashing when todayScore is null', () => {
    const { getByText } = render(
      <DayCalendar selectedDate={todayStr} onSelect={() => {}} todayScore={null} isPro={false} />
    )
    expect(getByText(currentMonthLabel)).toBeTruthy()
  })

  it('renders without crashing when majorMoonDays is provided', () => {
    const majorMoonDays: Record<string, boolean> = { [todayStr]: true }
    const { getByText } = render(
      <DayCalendar
        selectedDate={todayStr}
        onSelect={() => {}}
        todayScore={80}
        isPro={true}
        majorMoonDays={majorMoonDays}
      />
    )
    expect(getByText(currentMonthLabel)).toBeTruthy()
  })
})
