import { findBestThreeHourWindow, findTopThreeHourWindows } from '../features/score/bestWindow'

describe('findBestThreeHourWindow', () => {
  it('finds the highest-average 3-hour window with explicit start hour', () => {
    // hours 5..9 with scores [50, 60, 80, 70, 40]
    // windows: 5-7 avg=63, 6-8 avg=70, 7-9 avg=63
    // best is 6-8 with avg 70
    const result = findBestThreeHourWindow([50, 60, 80, 70, 40], 5)
    expect(result).toEqual({ startHour: 6, endHour: 8, avgScore: 70 })
  })

  it('returns null when fewer than 3 scores', () => {
    expect(findBestThreeHourWindow([50, 60], 5)).toBeNull()
    expect(findBestThreeHourWindow([], 5)).toBeNull()
  })

  it('breaks ties by earliest start', () => {
    // [70, 70, 70, 70] — windows 0-2 and 1-3 both avg 70; earliest wins
    const result = findBestThreeHourWindow([70, 70, 70, 70], 10)
    expect(result).toEqual({ startHour: 10, endHour: 12, avgScore: 70 })
  })

  it('rounds the average', () => {
    // [50, 50, 51] avg = 50.33 → 50
    expect(findBestThreeHourWindow([50, 50, 51], 5)?.avgScore).toBe(50)
    // [50, 51, 51] avg = 50.67 → 51
    expect(findBestThreeHourWindow([50, 51, 51], 5)?.avgScore).toBe(51)
  })
})

describe('findTopThreeHourWindows', () => {
  it('returns the top N non-overlapping windows best-first, not chronologically', () => {
    const scores = new Array(24).fill(20)
    scores[3] = 60; scores[4] = 60; scores[5] = 60   // earliest, but 3rd best
    scores[10] = 90; scores[11] = 90; scores[12] = 90 // best, in the middle of the day
    scores[18] = 75; scores[19] = 75; scores[20] = 75 // latest, but 2nd best
    const result = findTopThreeHourWindows(scores, 0, 3)
    expect(result).toEqual([
      { startHour: 10, endHour: 12, avgScore: 90 },
      { startHour: 18, endHour: 20, avgScore: 75 },
      { startHour: 3, endHour: 5, avgScore: 60 },
    ])
  })

  it('excludes candidates that overlap an already-picked higher-scoring window', () => {
    // hours 7-10 all score 90: windows 7-9 and 8-10 both avg 90 and overlap.
    // Stable sort keeps the earlier-starting window first; 8-10 gets excluded.
    const scores = new Array(12).fill(10)
    scores[7] = 90; scores[8] = 90; scores[9] = 90; scores[10] = 90
    const result = findTopThreeHourWindows(scores, 0, 2)
    expect(result[0]).toEqual({ startHour: 7, endHour: 9, avgScore: 90 })
    expect(result.every(w => w.startHour !== 8)).toBe(true)
  })

  it('returns fewer than count when fewer non-overlapping windows exist', () => {
    const scores = [90, 90, 90, 10, 10, 10, 90, 90, 90]
    const result = findTopThreeHourWindows(scores, 0, 5)
    expect(result).toHaveLength(3)
  })

  it('returns an empty array when fewer than 3 scores', () => {
    expect(findTopThreeHourWindows([50, 60], 5, 3)).toEqual([])
  })

  it('applies the startHour offset', () => {
    const scores = new Array(24).fill(20)
    scores[7] = 90; scores[8] = 90; scores[9] = 90
    const result = findTopThreeHourWindows(scores, 5, 1)
    // hourIndex 7 in the array corresponds to clock hour 5+7=12
    expect(result).toEqual([{ startHour: 12, endHour: 14, avgScore: 90 }])
  })
})
