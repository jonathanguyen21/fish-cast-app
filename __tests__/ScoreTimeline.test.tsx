import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ScoreTimeline } from '../features/score/ScoreTimeline'
import { useSettingsStore } from '../store/settingsStore'
import type { HourlyScore } from '../types/conditions'
import type { TidePhase } from '../features/tide/tideUtils'

const SCORES: HourlyScore[] = [
  { hour: '5AM', score: 50 }, { hour: '6AM', score: 60 }, { hour: '7AM', score: 75 },
  { hour: '8AM', score: 80 }, { hour: '9AM', score: 72 }, { hour: '10AM', score: 65 },
  { hour: '11AM', score: 60 }, { hour: '12PM', score: 55 }, { hour: '1PM', score: 50 },
  { hour: '2PM', score: 48 }, { hour: '3PM', score: 45 }, { hour: '4PM', score: 44 },
  { hour: '5PM', score: 46 }, { hour: '6PM', score: 50 }, { hour: '7PM', score: 55 },
  { hour: '8PM', score: 52 },
]

const TIDE_PHASES: Record<number, TidePhase> = {
  5: 'incoming', 6: 'incoming', 7: 'incoming', 8: 'slack',
  9: 'outgoing', 10: 'outgoing', 11: 'outgoing', 12: 'outgoing',
  13: 'outgoing', 14: 'slack', 15: 'incoming', 16: 'incoming',
  17: 'incoming', 18: 'incoming', 19: 'incoming', 20: 'incoming',
}

const WIND_HOURLY = Array.from({ length: 16 }, (_, i) => ({
  hour: 5 + i, speed: 10, gusts: 14, direction: 225, directionLabel: 'SW',
}))

beforeEach(() => {
  useSettingsStore.setState({ isPro: false, speedUnit: 'mph' })
})

describe('ScoreTimeline', () => {
  it('renders nothing when hourlyScores is empty', () => {
    const { toJSON } = render(
      <ScoreTimeline hourlyScores={[]} onUpgrade={() => {}} />
    )
    expect(toJSON()).toBeNull()
  })

  it('renders score values in chart mode by default', () => {
    const { getByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    expect(getByText('80')).toBeTruthy()
    expect(getByText('5AM')).toBeTruthy()
    expect(getByText('8PM')).toBeTruthy()
  })

  it('renders all 16 hour labels', () => {
    const { getAllByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    // 5AM through 8PM = 16 entries
    expect(getAllByText(/AM|PM/).length).toBeGreaterThanOrEqual(16)
  })

  it('shows section title', () => {
    const { getByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    expect(getByText("Today's Forecast")).toBeTruthy()
  })

  it('shows Pro upgrade banner when not Pro', () => {
    const { getByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    expect(getByText(/Go Pro/)).toBeTruthy()
    expect(getByText(/Unlock detailed hourly breakdown/)).toBeTruthy()
  })

  it('hides Pro upgrade banner when Pro', () => {
    useSettingsStore.setState({ isPro: true })
    const { queryByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    expect(queryByText(/Go Pro/)).toBeNull()
  })

  it('renders without tide or wind data', () => {
    const { getByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    expect(getByText("Today's Forecast")).toBeTruthy()
  })

  it('renders with tide and wind data without crashing', () => {
    const { getByText } = render(
      <ScoreTimeline
        hourlyScores={SCORES}
        tidePhasesByHour={TIDE_PHASES}
        windHourly={WIND_HOURLY}
        onUpgrade={() => {}}
      />
    )
    expect(getByText("Today's Forecast")).toBeTruthy()
  })

  it('switches to table view when table toggle is pressed', () => {
    const { getByTestId, getByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    fireEvent.press(getByTestId('timeline-table-toggle'))
    // Table header columns
    expect(getByText('Time')).toBeTruthy()
    expect(getByText('Score')).toBeTruthy()
  })

  it('table view shows hour labels', () => {
    const { getByTestId, getAllByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    fireEvent.press(getByTestId('timeline-table-toggle'))
    expect(getAllByText(/AM|PM/).length).toBeGreaterThanOrEqual(16)
  })

  it('table view shows Tide column when tidePhasesByHour provided', () => {
    const { getByTestId, getByText } = render(
      <ScoreTimeline hourlyScores={SCORES} tidePhasesByHour={TIDE_PHASES} onUpgrade={() => {}} />
    )
    fireEvent.press(getByTestId('timeline-table-toggle'))
    expect(getByText('Tide')).toBeTruthy()
  })

  it('table view shows Wind column when windHourly provided', () => {
    const { getByTestId, getByText } = render(
      <ScoreTimeline hourlyScores={SCORES} windHourly={WIND_HOURLY} onUpgrade={() => {}} />
    )
    fireEvent.press(getByTestId('timeline-table-toggle'))
    expect(getByText('Wind')).toBeTruthy()
  })

  it('chart toggle returns to chart view from table view', () => {
    const { getByTestId, queryByText } = render(
      <ScoreTimeline hourlyScores={SCORES} onUpgrade={() => {}} />
    )
    fireEvent.press(getByTestId('timeline-table-toggle'))
    expect(queryByText('Time')).toBeTruthy()
    fireEvent.press(getByTestId('timeline-chart-toggle'))
    expect(queryByText('Time')).toBeNull()
  })
})
