import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { BiteCurve } from '../features/score/BiteCurve'
import { getSkyTheme } from '../theme/skyTheme'
import type { HourlyScore } from '../types/conditions'

const SKY = getSkyTheme(new Date('2026-07-08T03:10:00Z'), 38.33, -123.05, 'clear')
const HOURS: HourlyScore[] = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'AM' : 'PM'}`,
  hourIndex: h,
  score: 40 + (h % 6) * 8,
}))
const WINDOW = { start: '6:00 PM', end: '8:00 PM', score: 80 }

describe('BiteCurve', () => {
  it('renders the curve, best-window band, and label', () => {
    const { getByTestId, getByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={WINDOW} currentHour={14} skyTheme={SKY} />
    )
    expect(getByTestId('bite-curve-path')).toBeTruthy()
    expect(getByTestId('bite-curve-band')).toBeTruthy()
    expect(getByText("Today's bite")).toBeTruthy()
    expect(getByText('Best 6:00 PM–8:00 PM')).toBeTruthy()
    expect(getByTestId('bite-curve-now')).toBeTruthy()
  })

  it('hides the band when the window has passed and the NOW dot when currentHour is null', () => {
    const { queryByTestId, getByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={{ ...WINDOW, passed: true }} currentHour={null} skyTheme={SKY} />
    )
    expect(queryByTestId('bite-curve-band')).toBeNull()
    expect(queryByTestId('bite-curve-now')).toBeNull()
    expect(getByText('Peak was 6:00 PM–8:00 PM')).toBeTruthy()
  })

  it('renders nothing with fewer than 2 points', () => {
    const { toJSON } = render(
      <BiteCurve hourlyScores={[]} bestWindow={WINDOW} currentHour={null} skyTheme={SKY} />
    )
    expect(toJSON()).toBeNull()
  })

  it('renders a custom title when provided', () => {
    const { getByText, queryByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={WINDOW} currentHour={14} skyTheme={SKY} title="Forecast bite" />
    )
    expect(getByText('Forecast bite')).toBeTruthy()
    expect(queryByText("Today's bite")).toBeNull()
  })

  it('scales the curve to the data range, not 0-100', () => {
    // All scores in a narrow band; with data-range scaling the path must span
    // most of the drawable height instead of hugging the top.
    const flat = Array.from({ length: 24 }, (_, i) => ({ hourIndex: i, score: 60 + (i % 2) * 20, time: '12:00 AM' }))
    const { getByTestId } = render(
      <BiteCurve hourlyScores={flat as any} bestWindow={{ start: '9:00 AM', end: '11:00 AM', passed: true } as any} currentHour={null} skyTheme={SKY} />
    )
    const d: string = getByTestId('bite-curve-path').props.d
    const ys = [...d.matchAll(/[\d.]+ ([\d.]+)/g)].map(m => parseFloat(m[1]))
    const span = Math.max(...ys) - Math.min(...ys)
    expect(span).toBeGreaterThan(40) // H=84, PAD=6 → drawable 72; 20-pt score swing must use most of it
  })

  it('shows a scrub cursor and updates the header readout when dragged', () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <BiteCurve hourlyScores={HOURS} bestWindow={WINDOW} currentHour={14} skyTheme={SKY} />
    )
    expect(queryByTestId('bite-curve-cursor')).toBeNull()
    expect(getByText('Best 6:00 PM–8:00 PM')).toBeTruthy()

    const chart = getByTestId('bite-curve-touch-area')
    // React Native's real PanResponder (unlike the other charts' mocked-out
    // dependencies) reads `event.touchHistory` internally to compute a touch
    // centroid *before* invoking our onPanResponderGrant callback — a bare
    // `{ nativeEvent: { locationX } }` throws inside TouchHistoryMath because
    // touchHistory is undefined. Supply a minimal valid one alongside
    // nativeEvent so PanResponder's own bookkeeping doesn't crash; it's
    // unused by our handler, which only reads nativeEvent.locationX.
    const touchHistory = {
      touchBank: [{ touchActive: true, currentTimeStamp: 1, currentPageX: 160, currentPageY: 40 }],
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
    }
    fireEvent(chart, 'responderGrant', { nativeEvent: { locationX: 160 }, touchHistory })

    expect(getByTestId('bite-curve-cursor')).toBeTruthy()
    expect(getByTestId('bite-curve-cursor-line')).toBeTruthy()
    // 160 is the horizontal midpoint of the 320-wide viewBox (default layout
    // width fallback is also 320, so the scale factor is 1) → hour index 12,
    // whose fixture score is 40 + (12 % 6) * 8 = 40 (see HOURS in this file).
    expect(getByText('12PM · 40')).toBeTruthy()
  })
})
