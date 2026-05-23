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
 * Finds the second-best non-overlapping 3-hour window. The second window must
 * not overlap with the best window (gap of at least 1 hour required).
 */
export function findSecondBestThreeHourWindow(
  scores: number[],
  startHour: number,
  bestWindowStart: number
): BestThreeHourWindow | null {
  if (scores.length < 3) return null

  const bestIdx = bestWindowStart - startHour
  let secondStart = -1
  let secondAvg = -1

  for (let i = 0; i <= scores.length - 3; i++) {
    // Skip windows that overlap with the best window (within 2 hours)
    if (Math.abs(i - bestIdx) <= 2) continue
    const avg = Math.round((scores[i] + scores[i + 1] + scores[i + 2]) / 3)
    if (avg > secondAvg) {
      secondAvg = avg
      secondStart = i
    }
  }

  if (secondStart < 0 || secondAvg < 40) return null

  return {
    startHour: startHour + secondStart,
    endHour: startHour + secondStart + 2,
    avgScore: secondAvg,
  }
}
