// Position math for the tab bar's sliding active-tab capsule, kept as plain
// functions (same convention as tabBarScroll.ts / bestWindow.ts) so the
// drag-to-select geometry is unit-testable without any gesture plumbing.

// One tab's capsule frame, in the items row's coordinate space: the warm
// indicator's resting left edge, width, and height for that tab.
export interface CapsuleFrame {
  x: number
  width: number
  height: number
}

// Index of the frame whose horizontal center is closest to x — "which tab is
// the finger over". Out-of-bounds x clamps naturally to the first/last tab;
// ties go to the earlier tab. Returns -1 only when no frames exist.
export function nearestTabIndex(x: number, frames: CapsuleFrame[]): number {
  let best = -1
  let bestDist = Infinity
  for (let i = 0; i < frames.length; i++) {
    const dist = Math.abs(frames[i].x + frames[i].width / 2 - x)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

// Left edge for a capsule of `width` centered on the pointer, clamped so the
// capsule never slides out of the row's bounds.
export function capsuleLeftForPointer(pointerX: number, width: number, rowWidth: number): number {
  const maxLeft = Math.max(0, rowWidth - width)
  return Math.min(Math.max(pointerX - width / 2, 0), maxLeft)
}
