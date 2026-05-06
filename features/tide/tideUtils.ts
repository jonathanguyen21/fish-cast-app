export type TidePhase = 'incoming' | 'outgoing' | 'slack'

export function detectPhase(hourlyCurve: number[], currentHour: number): TidePhase {
  const i = Math.min(Math.max(currentHour, 1), 22)
  const prev = hourlyCurve[i - 1]
  const curr = hourlyCurve[i]
  const next = hourlyCurve[i + 1]
  const delta = curr - prev
  const slackThreshold = 0.25
  if (Math.abs(delta) < slackThreshold && Math.abs(next - curr) < slackThreshold) return 'slack'
  return delta > 0 ? 'incoming' : 'outgoing'
}

export function hoursFromLastTurn(hourlyCurve: number[], currentHour: number): number {
  for (let i = Math.min(currentHour, 22); i > 0; i--) {
    const prev = hourlyCurve[i - 1]
    const curr = hourlyCurve[i]
    const next = hourlyCurve[Math.min(23, i + 1)]
    const isLocalMax = curr >= prev && curr >= next
    const isLocalMin = curr <= prev && curr <= next
    if (isLocalMax || isLocalMin) return currentHour - i
  }
  return currentHour
}

export function formatTideHeight(height: number, unit: string): string {
  return `${height.toFixed(1)} ${unit}`
}
