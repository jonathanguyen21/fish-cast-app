import { nextMinimizeState, INITIAL_SCROLL_MINIMIZE_STATE } from '../features/tabs/tabBarScroll'

describe('nextMinimizeState', () => {
  it('stays expanded (target 0) for small movements within the threshold', () => {
    const state = nextMinimizeState(INITIAL_SCROLL_MINIMIZE_STATE, 5)
    expect(state.target).toBe(0)
  })

  it('minimizes once cumulative downward scroll exceeds the threshold', () => {
    const state = nextMinimizeState(INITIAL_SCROLL_MINIMIZE_STATE, 15)
    expect(state.target).toBe(1)
    expect(state.anchorY).toBe(15)
  })

  it('stays minimized through continued downward scrolling', () => {
    let state = nextMinimizeState(INITIAL_SCROLL_MINIMIZE_STATE, 15)
    state = nextMinimizeState(state, 20) // delta 5, within threshold of new anchor
    expect(state.target).toBe(1)
    state = nextMinimizeState(state, 30) // delta 15, re-triggers, still minimized
    expect(state.target).toBe(1)
  })

  it('does not re-trigger on small jitter after minimizing', () => {
    const minimized = nextMinimizeState(INITIAL_SCROLL_MINIMIZE_STATE, 15)
    const jittered = nextMinimizeState(minimized, 18) // delta 3, within threshold
    expect(jittered).toEqual(minimized)
  })

  it('expands once cumulative upward scroll exceeds the threshold', () => {
    const minimized = nextMinimizeState(INITIAL_SCROLL_MINIMIZE_STATE, 30)
    const expanded = nextMinimizeState(minimized, 15) // delta -15
    expect(expanded.target).toBe(0)
    expect(expanded.anchorY).toBe(15)
  })

  it('snaps to expanded at or above the top regardless of prior state', () => {
    const minimized = nextMinimizeState(INITIAL_SCROLL_MINIMIZE_STATE, 100)
    expect(nextMinimizeState(minimized, 0)).toEqual({ anchorY: 0, target: 0 })
    expect(nextMinimizeState(minimized, -20)).toEqual({ anchorY: 0, target: 0 }) // iOS overscroll bounce
  })
})
