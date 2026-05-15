import { findBestThreeHourWindow } from '../features/score/bestWindow'

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
