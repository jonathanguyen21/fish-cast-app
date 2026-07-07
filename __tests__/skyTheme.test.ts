import { mixHex, getSkyState, getSkyTheme } from '../theme/skyTheme'

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

describe('getSkyTheme', () => {
  const NOON = new Date('2026-07-07T20:15:00Z')
  const NIGHT = new Date('2026-07-07T09:00:00Z')

  it('returns the state and a 3+ stop gradient', () => {
    const t = getSkyTheme(NOON, LAT, LNG, 'clear')
    expect(t.state).toBe('day')
    expect(t.gradientStops.length).toBeGreaterThanOrEqual(3)
    for (const s of t.gradientStops) expect(s).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('mutes the palette toward gray as weather worsens', () => {
    const clear = getSkyTheme(NOON, LAT, LNG, 'clear')
    const overcast = getSkyTheme(NOON, LAT, LNG, 'overcast')
    const rain = getSkyTheme(NOON, LAT, LNG, 'heavy-rain')
    expect(overcast.gradientStops[0]).not.toBe(clear.gradientStops[0])
    // channel spread (max-min of RGB) shrinks as saturation is muted
    const spread = (hex: string) => {
      const v = parseInt(hex.slice(1), 16)
      const c = [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]
      return Math.max(...c) - Math.min(...c)
    }
    expect(spread(overcast.gradientStops[0])).toBeLessThan(spread(clear.gradientStops[0]))
    expect(spread(rain.gradientStops[0])).toBeLessThan(spread(overcast.gradientStops[0]))
  })

  it('isLight only for clear/partly day skies', () => {
    expect(getSkyTheme(NOON, LAT, LNG, 'clear').isLight).toBe(true)
    expect(getSkyTheme(NOON, LAT, LNG, 'overcast').isLight).toBe(false)
    expect(getSkyTheme(NIGHT, LAT, LNG, 'clear').isLight).toBe(false)
  })

  it('derives a near-black tinted dark pair that differs by state', () => {
    const day = getSkyTheme(NOON, LAT, LNG, 'clear')
    const night = getSkyTheme(NIGHT, LAT, LNG, 'clear')
    expect(day.tintedDark.background).not.toBe(night.tintedDark.background)
    // near-black: every channel below 0x40
    const v = parseInt(day.tintedDark.background.slice(1), 16)
    expect((v >> 16) & 0xff).toBeLessThan(0x40)
    expect((v >> 8) & 0xff).toBeLessThan(0x40)
    expect(v & 0xff).toBeLessThan(0x40)
  })
})
