import { nearestTabIndex, capsuleLeftForPointer } from '../features/tabs/tabBarDrag'
import type { CapsuleFrame } from '../features/tabs/tabBarDrag'

// Four evenly spaced tabs, centers at 40 / 130 / 220 / 310.
const frames: CapsuleFrame[] = [
  { x: 10, width: 60, height: 48 },
  { x: 100, width: 60, height: 48 },
  { x: 190, width: 60, height: 48 },
  { x: 280, width: 60, height: 48 },
]

describe('nearestTabIndex', () => {
  it('returns -1 when no frames have been measured', () => {
    expect(nearestTabIndex(50, [])).toBe(-1)
  })

  it('returns the tab whose center is under the pointer', () => {
    expect(nearestTabIndex(40, frames)).toBe(0)
    expect(nearestTabIndex(130, frames)).toBe(1)
    expect(nearestTabIndex(220, frames)).toBe(2)
    expect(nearestTabIndex(310, frames)).toBe(3)
  })

  it('picks the closest center when the pointer is between tabs', () => {
    expect(nearestTabIndex(80, frames)).toBe(0)
    expect(nearestTabIndex(90, frames)).toBe(1)
    expect(nearestTabIndex(260, frames)).toBe(2)
  })

  it('clamps to the first tab left of the row and the last tab right of it', () => {
    expect(nearestTabIndex(-500, frames)).toBe(0)
    expect(nearestTabIndex(9999, frames)).toBe(3)
  })

  it('breaks exact-midpoint ties toward the earlier tab', () => {
    expect(nearestTabIndex(85, frames)).toBe(0)
  })

  it('handles uneven frame widths by comparing true centers', () => {
    const uneven: CapsuleFrame[] = [
      { x: 0, width: 40, height: 48 },
      { x: 40, width: 200, height: 48 },
    ]
    expect(nearestTabIndex(75, uneven)).toBe(0)
    expect(nearestTabIndex(85, uneven)).toBe(1)
  })
})

describe('capsuleLeftForPointer', () => {
  it('centers the capsule on the pointer', () => {
    expect(capsuleLeftForPointer(130, 60, 340)).toBe(100)
  })

  it('clamps at the left edge of the row', () => {
    expect(capsuleLeftForPointer(5, 60, 340)).toBe(0)
    expect(capsuleLeftForPointer(-100, 60, 340)).toBe(0)
  })

  it('clamps at the right edge of the row', () => {
    expect(capsuleLeftForPointer(339, 60, 340)).toBe(280)
    expect(capsuleLeftForPointer(9999, 60, 340)).toBe(280)
  })

  it('pins to 0 when the capsule is wider than the row', () => {
    expect(capsuleLeftForPointer(100, 400, 340)).toBe(0)
  })
})
