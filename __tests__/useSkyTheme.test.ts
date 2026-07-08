import { renderHook } from '@testing-library/react-native'
import { resolveSkyDate, useSkyTheme } from '../hooks/useSkyTheme'

describe('resolveSkyDate', () => {
  const NOW = new Date('2026-07-07T20:15:00Z')

  it('returns now when viewing today (local date of now)', () => {
    const todayStr = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}-${String(NOW.getDate()).padStart(2, '0')}`
    expect(resolveSkyDate(todayStr, '6:00 PM', NOW).getTime()).toBe(NOW.getTime())
  })

  it('uses the representative time for other dates', () => {
    const d = resolveSkyDate('2026-07-10', '6:00 PM', NOW)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(10)
    expect(d.getHours()).toBe(18)
  })

  it('handles 12 AM and 12 PM correctly', () => {
    expect(resolveSkyDate('2026-07-10', '12:00 AM', NOW).getHours()).toBe(0)
    expect(resolveSkyDate('2026-07-10', '12:00 PM', NOW).getHours()).toBe(12)
  })

  it('defaults to noon when no representative time is given', () => {
    expect(resolveSkyDate('2026-07-10', undefined, NOW).getHours()).toBe(12)
  })
})

describe('useSkyTheme', () => {
  it('returns a valid theme without a spot', () => {
    const { result } = renderHook(() => useSkyTheme(null, 'clear', '2026-07-10', '6:00 PM'))
    expect(result.current.gradientStops.length).toBeGreaterThanOrEqual(3)
    expect(result.current.tintedDark.background).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('returns a theme for a spot and icon', () => {
    const { result } = renderHook(() => useSkyTheme({ lat: 38.33, lng: -123.05 }, 'overcast', '2026-07-10', '6:00 PM'))
    expect(result.current.state).toBeTruthy()
  })
})
