import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, PanResponder, PanResponderInstance, LayoutChangeEvent } from 'react-native'
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg'
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated'
import { Glass, Radii, Type } from '../../theme/tokens'
import type { HourlyScore, ConditionsData } from '../../types/conditions'
import type { SkyTheme } from '../../theme/skyTheme'

const AnimatedPath = Animated.createAnimatedComponent(Path)

interface Props {
  hourlyScores: HourlyScore[]
  bestWindow: ConditionsData['bestWindow']
  currentHour: number | null
  skyTheme: SkyTheme
  title?: string
}

const W = 320
const H = 84
const PAD = 6
// Estimated path length for the draw-in dash animation; generously longer
// than any real curve at this viewBox (including pathological/jagged ones)
// so the full path is always revealed.
const EST_LEN = 2000

function parseHour(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1], 10)
  if (/pm/i.test(m[3]) && h !== 12) h += 12
  if (/am/i.test(m[3]) && h === 12) h = 0
  return h
}

function xFor(hour: number, n: number): number {
  return PAD + (hour / (n - 1)) * (W - PAD * 2)
}

function yDomain(scores: number[]): [number, number] {
  let lo = Math.min(...scores)
  let hi = Math.max(...scores)
  const MIN_SPAN = 25 // don't amplify noise into drama on flat days
  if (hi - lo < MIN_SPAN) {
    const mid = (hi + lo) / 2
    lo = mid - MIN_SPAN / 2
    hi = mid + MIN_SPAN / 2
  }
  return [Math.max(0, lo - 5), Math.min(100, hi + 5)]
}

function buildPath(scores: number[], lo: number, hi: number): string {
  const n = scores.length
  const y = (s: number) => H - PAD - ((s - lo) / (hi - lo)) * (H - PAD * 2)
  let d = `M ${xFor(0, n).toFixed(1)} ${y(scores[0]).toFixed(1)}`
  for (let i = 1; i < n; i++) {
    const x = xFor(i, n)
    const px = xFor(i - 1, n)
    const cx = ((px + x) / 2).toFixed(1)
    d += ` C ${cx} ${y(scores[i - 1]).toFixed(1)}, ${cx} ${y(scores[i]).toFixed(1)}, ${x.toFixed(1)} ${y(scores[i]).toFixed(1)}`
  }
  return d
}

export function BiteCurve({ hourlyScores, bestWindow, currentHour, skyTheme, title = "Today's bite" }: Props) {
  const dash = useSharedValue(EST_LEN)
  const [cursorIdx, setCursorIdx] = useState<number | null>(null)
  // Measured on-screen width of the touch area, in points. The SVG's internal
  // viewBox is a fixed 320x84 regardless of screen size, so a raw touch
  // locationX (in points) must be rescaled into viewBox units before it's
  // usable in xFor's math. Defaults to W so behavior is well-defined (scale
  // factor 1) before the first onLayout fires, including in tests.
  const [chartWidth, setChartWidth] = useState(W)

  useEffect(() => {
    dash.value = EST_LEN
    dash.value = withTiming(0, { duration: 900 })
  }, [dash])

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }))

  const n = hourlyScores.length

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (n < 2) return
      const scale = W / (chartWidth || W)
      const viewBoxX = e.nativeEvent.locationX * scale
      const hour = Math.round(((viewBoxX - PAD) / (W - PAD * 2)) * (n - 1))
      setCursorIdx(Math.max(0, Math.min(hour, n - 1)))
    },
    onPanResponderMove: (e) => {
      if (n < 2) return
      const scale = W / (chartWidth || W)
      const viewBoxX = e.nativeEvent.locationX * scale
      const hour = Math.round(((viewBoxX - PAD) / (W - PAD * 2)) * (n - 1))
      setCursorIdx(Math.max(0, Math.min(hour, n - 1)))
    },
    onPanResponderRelease: () => {},
  }), [n, chartWidth])

  function onTouchAreaLayout(e: LayoutChangeEvent) {
    setChartWidth(e.nativeEvent.layout.width)
  }

  if (hourlyScores.length < 2) return null

  const scores = hourlyScores.map(h => h.score)
  const [lo, hi] = yDomain(scores)
  const path = buildPath(scores, lo, hi)
  const yFor = (s: number) => H - PAD - ((s - lo) / (hi - lo)) * (H - PAD * 2)

  const startH = parseHour(bestWindow.start)
  const endH = parseHour(bestWindow.end)
  const showBand = !bestWindow.passed && startH >= 0 && endH >= startH
  const bandX = xFor(startH, n)
  const bandW = Math.max(8, xFor(Math.min(endH + 1, n - 1), n) - bandX)

  const cursor = cursorIdx !== null ? hourlyScores[cursorIdx] : null

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.85 }]}>{title}</Text>
        <Text style={[Type.chip, { color: skyTheme.accent }]}>
          {cursor
            ? `${cursor.hour} · ${cursor.score}`
            : bestWindow.passed ? `Peak was ${bestWindow.start}–${bestWindow.end}` : `Best ${bestWindow.start}–${bestWindow.end}`}
        </Text>
      </View>
      <View testID="bite-curve-touch-area" onLayout={onTouchAreaLayout} {...panResponder.panHandlers}>
        <Svg viewBox={`0 0 ${W} ${H}`} style={styles.svg}>
          {showBand && (
            <Rect
              testID="bite-curve-band"
              x={bandX} y={2} width={bandW} height={H - 4} rx={6}
              fill={skyTheme.accent} opacity={0.16}
            />
          )}
          <AnimatedPath
            testID="bite-curve-path"
            d={path}
            fill="none"
            stroke={skyTheme.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${EST_LEN} ${EST_LEN}`}
            animatedProps={animatedProps}
          />
          {currentHour !== null && currentHour >= 0 && currentHour < n && (
            <Circle
              testID="bite-curve-now"
              cx={xFor(currentHour, n)} cy={yFor(scores[currentHour])} r={4}
              fill={skyTheme.textTint}
            />
          )}
          {cursorIdx !== null && (
            <>
              <Line
                testID="bite-curve-cursor-line"
                x1={xFor(cursorIdx, n)} y1={2} x2={xFor(cursorIdx, n)} y2={H - 2}
                stroke={skyTheme.textTint} strokeWidth={1} strokeOpacity={0.35} strokeDasharray="3 3"
              />
              <Circle
                testID="bite-curve-cursor"
                cx={xFor(cursorIdx, n)} cy={yFor(scores[cursorIdx])} r={5}
                fill={skyTheme.accent} stroke={skyTheme.textTint} strokeWidth={1.5}
              />
            </>
          )}
        </Svg>
      </View>
      <View style={styles.axisRow}>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12A</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>6A</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12P</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>6P</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12A</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  svg: { width: '100%', aspectRatio: W / H },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axis: { fontSize: 10, opacity: 0.55 },
})
