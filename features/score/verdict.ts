import type { ScoreBreakdown } from '../../types/conditions'
import type { SkyState } from '../../theme/skyTheme'

export function computeAxes(
  b: ScoreBreakdown,
  spotType: 'saltwater' | 'freshwater'
): { bite: number; comfort: number } {
  const fresh = spotType === 'freshwater'
  const biteMax = fresh ? 55 : 75
  const bitePts = b.pressure + b.solunar + (fresh ? 0 : b.tide) + b.waterTemp
  const comfortPts = b.wind + b.sky
  return {
    bite: Math.min(100, Math.round((bitePts / biteMax) * 100)),
    comfort: Math.min(100, Math.round((comfortPts / 25) * 100)),
  }
}

export interface Verdict {
  phrase: string
  sub: string | null
}

const GO_FLAVOR: Partial<Record<SkyState, string>> = {
  goldenAM: 'dawn bite is on',
  goldenPM: 'golden hour feed',
  dusk: 'golden hour feed',
  night: 'night bite is live',
}

export function getVerdict(i: {
  bite: number
  comfort: number
  overall: number
  skyState: SkyState
  betterDay?: { label: string; score: number } | null
}): Verdict {
  if (i.bite >= 70 && i.comfort >= 60 && i.overall >= 55) {
    const flavor = GO_FLAVOR[i.skyState]
    return { phrase: flavor ? `Go — ${flavor}` : 'Go.', sub: null }
  }
  if (i.bite >= 70 && i.overall >= 45) return { phrase: 'Biting — but dress for it', sub: null }
  if (i.bite >= 45 && i.overall >= 45) return { phrase: 'Decent — pick your window', sub: null }
  return {
    phrase: 'Save it for tomorrow',
    sub: i.betterDay ? `${i.betterDay.label} looks great — ${i.betterDay.score}` : null,
  }
}

export function pickBetterDay(
  days: { date: string; dayLabel: string; peakScore: number }[] | undefined,
  todayScore: number,
  todayKey: string,
): { label: string; score: number } | null {
  if (!days || days.length === 0) return null
  let best: { label: string; score: number } | null = null
  for (const d of days) {
    if (d.date <= todayKey) continue
    if (!best || d.peakScore > best.score) best = { label: d.dayLabel, score: d.peakScore }
  }
  return best && best.score >= todayScore + 10 ? best : null
}
