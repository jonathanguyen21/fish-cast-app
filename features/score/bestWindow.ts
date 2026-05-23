export interface BestThreeHourWindow {
  startHour: number  // hour-of-day (24h)
  endHour: number    // hour-of-day (24h), startHour + 2
  avgScore: number   // rounded
}

/** Finds the best non-overlapping 3-hour window after excluding the primary window. */
export function findSecondBestWindow(
  scores: number[],
  startHour: number,
  primary: BestThreeHourWindow
): BestThreeHourWindow | null {
  if (scores.length < 3) return null
  const primaryIdxStart = primary.startHour - startHour
  let bestStart = -1
  let bestAvg = -1
  for (let i = 0; i <= scores.length - 3; i++) {
    // Require at least 2-hour gap from primary window
    if (i >= primaryIdxStart - 2 && i <= primaryIdxStart + 2) continue
    const avg = Math.round((scores[i] + scores[i + 1] + scores[i + 2]) / 3)
    if (avg > bestAvg && avg >= 45) {
      bestAvg = avg
      bestStart = i
    }
  }
  if (bestStart < 0) return null
  return {
    startHour: startHour + bestStart,
    endHour: startHour + bestStart + 2,
    avgScore: bestAvg,
  }
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
