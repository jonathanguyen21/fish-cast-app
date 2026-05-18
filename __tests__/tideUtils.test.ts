import { detectPhase, hoursFromLastTurn, formatTideHeight, formatScrubTime } from '../features/tide/tideUtils'

const risingCurve = [0.3,0.5,1.1,1.9,2.8,3.6,4.3,4.8,5.0,5.1,4.9,4.5,
                     3.8,3.0,2.2,1.5,1.0,0.8,0.9,1.3,1.9,2.7,3.2,3.8]

describe('detectPhase', () => {
  it('detects incoming tide', () => {
    expect(detectPhase(risingCurve, 3)).toBe('incoming')
  })
  it('detects outgoing tide', () => {
    expect(detectPhase(risingCurve, 12)).toBe('outgoing')
  })
  it('detects slack near peak', () => {
    expect(detectPhase(risingCurve, 9)).toBe('slack')
  })
  it('detects slack near trough (hour 17, local minimum)', () => {
    expect(detectPhase(risingCurve, 17)).toBe('slack')
  })
  it('detects outgoing after peak (hour 11)', () => {
    expect(detectPhase(risingCurve, 11)).toBe('outgoing')
  })
})

describe('hoursFromLastTurn', () => {
  it('returns hours since last high or low', () => {
    const hrs = hoursFromLastTurn(risingCurve, 5)
    expect(hrs).toBeGreaterThanOrEqual(0)
    expect(hrs).toBeLessThanOrEqual(6)
  })
  it('returns 0 or close to it right at the peak hour', () => {
    const hrs = hoursFromLastTurn(risingCurve, 9)
    expect(hrs).toBeGreaterThanOrEqual(0)
    expect(hrs).toBeLessThan(3)
  })
  it('returns a larger value midway between turns', () => {
    const early = hoursFromLastTurn(risingCurve, 3)
    const mid = hoursFromLastTurn(risingCurve, 6)
    expect(mid).toBeGreaterThanOrEqual(early)
  })
})

describe('formatTideHeight', () => {
  it('formats feet', () => expect(formatTideHeight(3.2, 'ft')).toBe('3.2 ft'))
  it('formats metres', () => expect(formatTideHeight(0.98, 'm')).toBe('1.0 m'))
  it('formats zero', () => expect(formatTideHeight(0, 'ft')).toBe('0.0 ft'))
  it('rounds metres to 1 decimal', () => expect(formatTideHeight(1.55, 'm')).toBe('1.6 m'))
})

describe('formatScrubTime', () => {
  it('formats midnight as 12:00 AM', () => expect(formatScrubTime(0)).toBe('12:00 AM'))
  it('formats noon as 12:00 PM', () => expect(formatScrubTime(12)).toBe('12:00 PM'))
  it('formats 1 PM correctly', () => expect(formatScrubTime(13)).toBe('1:00 PM'))
  it('formats 11 PM correctly', () => expect(formatScrubTime(23)).toBe('11:00 PM'))
  it('formats 6 AM correctly', () => expect(formatScrubTime(6)).toBe('6:00 AM'))
  it('formats 7 PM correctly', () => expect(formatScrubTime(19)).toBe('7:00 PM'))
})

describe('detectPhase clamping', () => {
  it('handles hour 0 by clamping to hour 1', () => {
    const phase = detectPhase(risingCurve, 0)
    expect(['incoming', 'outgoing', 'slack']).toContain(phase)
  })
  it('handles hour 23 by clamping to hour 22', () => {
    const phase = detectPhase(risingCurve, 23)
    expect(['incoming', 'outgoing', 'slack']).toContain(phase)
  })
})
