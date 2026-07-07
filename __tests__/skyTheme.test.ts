import { mixHex, getSkyState } from '../theme/skyTheme'

// Bodega Bay. All dates are absolute instants (UTC ISO), so sun position
// is deterministic regardless of the machine's timezone.
const LAT = 38.33
const LNG = -123.05

describe('mixHex', () => {
  it('returns the first color at t=0 and the second at t=1', () => {
    expect(mixHex('#112233', '#FFFFFF', 0)).toBe('#112233')
    expect(mixHex('#112233', '#FFFFFF', 1)).toBe('#FFFFFF')
  })
  it('mixes midpoints per channel', () => {
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })
})

describe('getSkyState', () => {
  it('detects night well after sunset', () => {
    expect(getSkyState(new Date('2026-07-07T09:00:00Z'), LAT, LNG)).toBe('night') // 2 AM local
  })
  it('detects dawn just before sunrise', () => {
    expect(getSkyState(new Date('2026-07-07T12:30:00Z'), LAT, LNG)).toBe('dawn') // ~25 min pre-sunrise
  })
  it('detects goldenAM shortly after sunrise', () => {
    expect(getSkyState(new Date('2026-07-07T13:30:00Z'), LAT, LNG)).toBe('goldenAM') // ~35 min post-sunrise
  })
  it('detects day at solar noon', () => {
    expect(getSkyState(new Date('2026-07-07T20:15:00Z'), LAT, LNG)).toBe('day')
  })
  it('detects goldenPM shortly before sunset', () => {
    expect(getSkyState(new Date('2026-07-08T03:10:00Z'), LAT, LNG)).toBe('goldenPM') // ~28 min pre-sunset
  })
  it('detects dusk shortly after sunset', () => {
    expect(getSkyState(new Date('2026-07-08T04:10:00Z'), LAT, LNG)).toBe('dusk') // ~32 min post-sunset
  })
})
