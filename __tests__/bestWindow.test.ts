import { findBestThreeHourWindow, findSecondBestThreeHourWindow } from '../features/score/bestWindow'

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

describe('findSecondBestThreeHourWindow', () => {
  it('finds a non-overlapping second window', () => {
    // best is hours 5-7 (idx 0, startHour=5)
    // second best should be at least 3 away: idx >= 3 → hour 8+
    // [80, 80, 80, 20, 20, 70, 70, 70] → best=5-7 (80), second=10-12 (70)
    const scores = [80, 80, 80, 20, 20, 70, 70, 70]
    const result = findSecondBestThreeHourWindow(scores, 5, 5) // bestWindowStart=5
    expect(result).not.toBeNull()
    expect(result!.startHour).toBeGreaterThanOrEqual(8) // no overlap with 5-7
    expect(result!.avgScore).toBe(70)
  })

  it('returns null when fewer than 3 scores', () => {
    expect(findSecondBestThreeHourWindow([80, 80], 5, 5)).toBeNull()
  })

  it('returns null if second window scores below 40', () => {
    // All scores are low except the best window
    const scores = [80, 80, 80, 20, 20, 20, 20, 20]
    const result = findSecondBestThreeHourWindow(scores, 5, 5)
    expect(result).toBeNull()
  })

  it('does not overlap with best window (within 2 hours)', () => {
    // best at hour 6 (idx 1), second must have |i - 1| > 2 → i >= 4
    const scores = [60, 90, 90, 90, 60, 75, 75, 75]
    const best = findBestThreeHourWindow(scores, 5)
    const second = findSecondBestThreeHourWindow(scores, 5, best!.startHour)
    expect(second).not.toBeNull()
    // second window starts at hour 9 (idx 4)
    expect(Math.abs(second!.startHour - best!.startHour)).toBeGreaterThan(2)
  })
})
