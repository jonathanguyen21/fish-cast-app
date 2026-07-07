import SunCalc from 'suncalc'

export type SkyState = 'night' | 'dawn' | 'goldenAM' | 'day' | 'goldenPM' | 'dusk'

const DEG = Math.PI / 180

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
