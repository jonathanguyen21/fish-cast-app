export interface BestThreeHourWindow {
  startHour: number  // hour-of-day (24h)
  endHour: number    // hour-of-day (24h), startHour + 2
  avgScore: number   // rounded
}

/**
 * Finds the 3-hour window with the highest average score.
 * `startHour` is the hour-of-day corresponding to scores[0].
 * Ties are broken by earliest start.
 */
export function findBestThreeHourWindow(
  scores: number[],
  startHour: number
): BestThreeHourWindow | null {
  if (scores.length < 3) return null

  let bestStart = 0
  let bestAvg = -1

  for (let i = 0; i <= scores.length - 3; i++) {
    const avg = Math.round((scores[i] + scores[i + 1] + scores[i + 2]) / 3)
    if (avg > bestAvg) {
      bestAvg = avg
      bestStart = i
    }
  }

  return {
    startHour: startHour + bestStart,
    endHour: startHour + bestStart + 2,
    avgScore: bestAvg,
  }
}

/**
 * Ranks all possible 3-hour windows by average score, greedily keeps the
 * top `count` that don't overlap each other (so "second best" isn't just
 * the top window shifted by an hour), and returns them best-first — this
 * is a ranked list (1st, 2nd, 3rd best), not a chronological agenda.
 */
export function findTopThreeHourWindows(
  scores: number[],
  startHour: number,
  count: number
): BestThreeHourWindow[] {
  if (scores.length < 3) return []

  const candidates: BestThreeHourWindow[] = []
  for (let i = 0; i <= scores.length - 3; i++) {
    const avg = Math.round((scores[i] + scores[i + 1] + scores[i + 2]) / 3)
    candidates.push({ startHour: startHour + i, endHour: startHour + i + 2, avgScore: avg })
  }
  candidates.sort((a, b) => b.avgScore - a.avgScore)

  const picked: BestThreeHourWindow[] = []
  for (const c of candidates) {
    if (picked.length >= count) break
    const overlaps = picked.some(p => c.startHour <= p.endHour && c.endHour >= p.startHour)
    if (!overlaps) picked.push(c)
  }

  return picked
}
