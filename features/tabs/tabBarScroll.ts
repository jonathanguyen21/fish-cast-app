export type MinimizeTarget = 0 | 1

export interface ScrollMinimizeState {
  anchorY: number
  target: MinimizeTarget
}

const SCROLL_THRESHOLD = 8

export const INITIAL_SCROLL_MINIMIZE_STATE: ScrollMinimizeState = { anchorY: 0, target: 0 }

// Hysteresis-based scroll-direction detector: rather than comparing
// frame-to-frame deltas (which are too small to ever cross a threshold
// during a slow, steady scroll), this tracks an "anchor" — the Y position at
// the last committed direction change — and compares cumulative movement
// since that anchor. Small back-and-forth jitter within SCROLL_THRESHOLD
// doesn't re-trigger; a sustained scroll in either direction does, resetting
// the anchor each time so it doesn't just re-trigger on the very next frame.
export function nextMinimizeState(state: ScrollMinimizeState, currentY: number): ScrollMinimizeState {
  'worklet'
  if (currentY <= 0) return { anchorY: 0, target: 0 }
  const delta = currentY - state.anchorY
  if (delta > SCROLL_THRESHOLD) return { anchorY: currentY, target: 1 }
  if (delta < -SCROLL_THRESHOLD) return { anchorY: currentY, target: 0 }
  return state
}
