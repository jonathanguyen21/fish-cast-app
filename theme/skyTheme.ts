import SunCalc from 'suncalc'
import type { SkyData } from '../types/conditions'

export type SkyState = 'night' | 'dawn' | 'goldenAM' | 'day' | 'goldenPM' | 'dusk'
export type SkyIcon = SkyData['icon']

const DEG = Math.PI / 180

// Requires 6-digit `#RRGGBB` hex inputs (no shorthand, no alpha channel).
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (pa >> shift) & 0xff
    const vb = (pb >> shift) & 0xff
    return Math.round(va + (vb - va) * t)
  }
  const to2 = (n: number) => n.toString(16).padStart(2, '0').toUpperCase()
  return `#${to2(ch(16))}${to2(ch(8))}${to2(ch(0))}`
}

export function getSkyState(date: Date, lat: number, lng: number): SkyState {
  const alt = SunCalc.getPosition(date, lat, lng).altitude
  const altSoon = SunCalc.getPosition(new Date(date.getTime() + 10 * 60 * 1000), lat, lng).altitude
  const rising = altSoon > alt
  if (alt < -12 * DEG) return 'night'
  if (alt < 0) return rising ? 'dawn' : 'dusk'
  if (alt < 10 * DEG) return rising ? 'goldenAM' : 'goldenPM'
  return 'day'
}

export interface SkyTheme {
  state: SkyState
  gradientStops: string[]
  textTint: string
  accent: string
  isLight: boolean
  tintedDark: { background: string; card: string }
}

const BASE: Record<SkyState, string[]> = {
  night:    ['#060A1A', '#101833', '#1B2447'],
  dawn:     ['#1A2C52', '#4E5D8C', '#C98A6B', '#EFC08A'],
  goldenAM: ['#2E4A7A', '#7FA0C9', '#F2C98A', '#F7DFB0'],
  day:      ['#3D7BC9', '#5E97D8', '#8FB8E8'],
  goldenPM: ['#37477E', '#8A5B72', '#E8935A', '#F3B97E'],
  dusk:     ['#1B2447', '#5C3E63', '#C4684E', '#EDA45E'],
}

const GRAY: Record<SkyState, string> = {
  night: '#0A0D16', dawn: '#3A4356', goldenAM: '#5C6878',
  day: '#6E7C8C', goldenPM: '#55535E', dusk: '#333749',
}

const MUTE: Record<SkyIcon, number> = {
  'clear': 0, 'partly-cloudy': 0.25, 'overcast': 0.6, 'light-rain': 0.7, 'heavy-rain': 0.85,
}

const ACCENT: Record<SkyState, string> = {
  night: '#AFC3FF', dawn: '#FFE9C4', goldenAM: '#FFE9C4',
  day: '#FFF3DC', goldenPM: '#FFD9A0', dusk: '#FFD9A0',
}

export function getSkyTheme(date: Date, lat: number, lng: number, icon: SkyIcon | undefined): SkyTheme {
  const state = getSkyState(date, lat, lng)
  const mute = MUTE[icon as SkyIcon] ?? 0
  const gradientStops = BASE[state].map(stop => mixHex(stop, GRAY[state], mute))
  const mid = BASE[state][1]
  return {
    state,
    gradientStops,
    textTint: state === 'day' ? '#F4F9FF' : '#FFF8F0',
    accent: ACCENT[state],
    isLight: state === 'day' && mute < 0.3,
    tintedDark: {
      background: mixHex('#0B0D12', mid, 0.12),
      card: mixHex('#12151C', mid, 0.16),
    },
  }
}
