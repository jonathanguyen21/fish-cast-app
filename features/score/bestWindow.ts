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
