import { detectPhase, hoursFromLastTurn, formatTideHeight } from '../features/tide/tideUtils'

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
})

describe('hoursFromLastTurn', () => {
  it('returns hours since last high or low', () => {
    const hrs = hoursFromLastTurn(risingCurve, 5)
    expect(hrs).toBeGreaterThanOrEqual(0)
    expect(hrs).toBeLessThanOrEqual(6)
  })
})

describe('formatTideHeight', () => {
  it('formats feet', () => expect(formatTideHeight(3.2, 'ft')).toBe('3.2 ft'))
  it('formats metres', () => expect(formatTideHeight(0.98, 'm')).toBe('1.0 m'))
})
