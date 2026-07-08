import { computeAxes, getVerdict, pickBetterDay } from '../features/score/verdict'
import type { ScoreBreakdown } from '../types/conditions'

const FULL: ScoreBreakdown = { pressure: 25, solunar: 20, tide: 20, wind: 15, waterTemp: 10, sky: 10 }

describe('computeAxes', () => {
  it('perfect factors give 100/100 for saltwater', () => {
    expect(computeAxes(FULL, 'saltwater')).toEqual({ bite: 100, comfort: 100 })
  })
  it('bite groups pressure+solunar+tide+waterTemp over 75 for saltwater', () => {
    const b = { ...FULL, pressure: 10, solunar: 10, tide: 10, waterTemp: 5 }
    // (10+10+10+5)/75 = 46.67 → 47
    expect(computeAxes(b, 'saltwater').bite).toBe(47)
  })
  it('comfort groups wind+sky over 25', () => {
    const b = { ...FULL, wind: 5, sky: 5 }
    expect(computeAxes(b, 'saltwater').comfort).toBe(40)
  })
  it('freshwater excludes tide from bite and uses a 55-point base', () => {
    const b = { ...FULL, tide: 0 }
    // (25+20+10)/55 = 100
    expect(computeAxes(b, 'freshwater').bite).toBe(100)
  })
})

describe('getVerdict', () => {
  it('high bite + high comfort → Go with golden-hour flavor', () => {
    expect(getVerdict({ bite: 80, comfort: 70, overall: 75, skyState: 'goldenPM' }).phrase).toBe('Go — golden hour feed')
    expect(getVerdict({ bite: 80, comfort: 70, overall: 75, skyState: 'goldenAM' }).phrase).toBe('Go — dawn bite is on')
    expect(getVerdict({ bite: 80, comfort: 70, overall: 75, skyState: 'night' }).phrase).toBe('Go — night bite is live')
    expect(getVerdict({ bite: 80, comfort: 70, overall: 75, skyState: 'day' }).phrase).toBe('Go.')
  })
  it('boundary: comfort 60 goes, 59 dresses for it', () => {
    expect(getVerdict({ bite: 70, comfort: 60, overall: 75, skyState: 'day' }).phrase).toBe('Go.')
    expect(getVerdict({ bite: 70, comfort: 59, overall: 65, skyState: 'day' }).phrase).toBe('Biting — but dress for it')
  })
  it('mid bite → pick your window', () => {
    expect(getVerdict({ bite: 55, comfort: 90, overall: 65, skyState: 'day' }).phrase).toBe('Decent — pick your window')
  })
  it('low bite → save it, with better-day handoff in sub', () => {
    const v = getVerdict({ bite: 30, comfort: 90, overall: 30, skyState: 'day', betterDay: { label: 'Wednesday evening', score: 84 } })
    expect(v.phrase).toBe('Save it for tomorrow')
    expect(v.sub).toBe('Wednesday evening looks great — 84')
  })
  it('low bite without a better day has no sub', () => {
    expect(getVerdict({ bite: 30, comfort: 90, overall: 30, skyState: 'day' }).sub).toBeNull()
  })

  describe('overall respects the engine safety caps', () => {
    it('heavy-rain cap (overall 45) downgrades a high bite/comfort combo to dress-for-it', () => {
      expect(getVerdict({ bite: 100, comfort: 60, overall: 45, skyState: 'day' }).phrase)
        .toBe('Biting — but dress for it')
    })
    it('dangerous-wind cap (overall 35) downgrades a high bite/comfort combo to save-it', () => {
      expect(getVerdict({ bite: 100, comfort: 60, overall: 35, skyState: 'day' }).phrase)
        .toBe('Save it for tomorrow')
    })
    it('bite/overall boundary at 45: 45 picks a window, 44 saves it', () => {
      expect(getVerdict({ bite: 45, comfort: 90, overall: 45, skyState: 'day' }).phrase)
        .toBe('Decent — pick your window')
      expect(getVerdict({ bite: 44, comfort: 90, overall: 45, skyState: 'day' }).phrase)
        .toBe('Save it for tomorrow')
    })
  })
})

describe('pickBetterDay', () => {
  const DAYS = [
    { date: '2026-07-07', dayLabel: 'Today', peakScore: 40 },
    { date: '2026-07-08', dayLabel: 'Wed', peakScore: 84 },
    { date: '2026-07-09', dayLabel: 'Thu', peakScore: 60 },
  ]

  it('returns the best future day when it beats today by 10+', () => {
    expect(pickBetterDay(DAYS, 40, '2026-07-07')).toEqual({ label: 'Wed', score: 84 })
  })

  it('returns null when no future day beats today by 10+', () => {
    expect(pickBetterDay(DAYS, 80, '2026-07-07')).toBeNull()
  })

  it('returns null for undefined or empty input', () => {
    expect(pickBetterDay(undefined, 40, '2026-07-07')).toBeNull()
    expect(pickBetterDay([], 40, '2026-07-07')).toBeNull()
  })
})
