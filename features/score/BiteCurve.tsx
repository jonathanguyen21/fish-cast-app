import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, PanResponder, PanResponderInstance, LayoutChangeEvent } from 'react-native'
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg'
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Glass, Radii, Type } from '../../theme/tokens'
import { fishRating } from './scoringEngine'
import { findTopThreeHourWindows } from './bestWindow'
import type { HourlyScore, ConditionsData } from '../../types/conditions'
import type { SkyTheme } from '../../theme/skyTheme'

const MAX_RANKED_WINDOWS = 3

function FishRating({ score, color, size = 12, testID }: { score: number; color: string; size?: number; testID?: string }) {
  const count = fishRating(score)
  return (
    <View testID={testID} style={styles.fishRow} accessibilityLabel={`${count} fish`}>
      {Array.from({ length: count }).map((_, i) => (
        <Ionicons key={i} name="fish" size={size} color={color} />
      ))}
    </View>
  )
}

const AnimatedPath = Animated.createAnimatedComponent(Path)

interface Props {
  hourlyScores: HourlyScore[]
  bestWindow: ConditionsData['bestWindow']
  currentHour: number | null
  skyTheme: SkyTheme
  title?: string
  // Fires with the scrubbed hour index (0-23) while dragging, and with null
  // once the finger lifts — lets a parent screen mirror the scrub position
  // into other hourly-aware UI (e.g. Today's condition chips).
  onScrubChange?: (hourIndex: number | null) => void
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

function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const period = h < 12 ? 'AM' : 'PM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:00 ${period}`
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

export function BiteCurve({ hourlyScores, bestWindow, currentHour, skyTheme, title = "Today's bite", onScrubChange }: Props) {
  const dash = useSharedValue(EST_LEN)
  const [cursorIdx, setCursorIdx] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
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

  const panResponder = useMemo<PanResponderInstance>(() => {
    function scrubTo(locationX: number) {
      if (n < 2) return
      const scale = W / (chartWidth || W)
      const viewBoxX = locationX * scale
      const hour = Math.round(((viewBoxX - PAD) / (W - PAD * 2)) * (n - 1))
      const clamped = Math.max(0, Math.min(hour, n - 1))
      setCursorIdx(clamped)
      onScrubChange?.(clamped)
    }
    function clearScrub() {
      setCursorIdx(null)
      onScrubChange?.(null)
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => scrubTo(e.nativeEvent.locationX),
      onPanResponderMove: (e) => scrubTo(e.nativeEvent.locationX),
      onPanResponderRelease: clearScrub,
      onPanResponderTerminate: clearScrub,
    })
  }, [n, chartWidth, onScrubChange])

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

  // Only surfaced for the current/future day (bestWindow.passed means we're
  // looking at a spent day, where "other good times" no longer means anything).
  const rankedWindows = bestWindow.passed ? [] : findTopThreeHourWindows(scores, 0, MAX_RANKED_WINDOWS)
  const otherCount = rankedWindows.length - 1

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.85 }]}>{title}</Text>
        <View style={styles.headerRight}>
          <Text style={[Type.chip, { color: skyTheme.accent }]}>
            {cursor
              ? `${cursor.hour} · ${cursor.score}`
              : bestWindow.passed ? `Peak was ${bestWindow.start}–${bestWindow.end}` : `Best ${bestWindow.start}–${bestWindow.end}`}
          </Text>
          {!cursor && !bestWindow.passed && rankedWindows[0] && (
            <FishRating testID="bite-curve-header-fish" score={rankedWindows[0].avgScore} color={skyTheme.accent} />
          )}
        </View>
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
        {/* Fish clusters under the curve at each ranked good-time window,
            tides4fishing-style — a count matching that window's fish rating,
            centered under its midpoint hour. Purely decorative (pointerEvents
            none) so dragging still only ever hits the touch area beneath. */}
        {rankedWindows.map((w, i) => (
          <View
            key={i}
            testID={`bite-curve-fish-cluster-${i}`}
            pointerEvents="none"
            style={[styles.fishClusterAnchor, { left: `${(xFor((w.startHour + w.endHour) / 2, n) / W) * 100}%` }]}
          >
            <FishRating score={w.avgScore} color={skyTheme.accent} size={10} />
          </View>
        ))}
      </View>
      <View style={styles.axisRow}>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12A</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>6A</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12P</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>6P</Text>
        <Text style={[styles.axis, { color: skyTheme.textTint }]}>12A</Text>
      </View>

      {!bestWindow.passed && otherCount > 0 && (
        <Pressable
          testID="bite-curve-expand-toggle"
          accessibilityRole="button"
          onPress={() => setExpanded(e => !e)}
          style={styles.expandToggle}
        >
          <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.7 }]}>
            {expanded ? 'Hide other good times' : `${otherCount} other good time${otherCount > 1 ? 's' : ''} today`}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={skyTheme.textTint}
            style={{ opacity: 0.7 }}
          />
        </Pressable>
      )}

      {expanded && (
        <View testID="bite-curve-ranked-list" style={styles.rankedList}>
          {rankedWindows.map((w, i) => (
            <View key={i} testID={`bite-curve-rank-${i}`} style={styles.rankedRow}>
              <Text style={[Type.chip, { color: skyTheme.textTint, opacity: 0.6, width: 16 }]}>{i + 1}</Text>
              <Text style={[Type.secondary, { color: skyTheme.textTint, flex: 1 }]}>
                {i === 0 ? `${bestWindow.start}–${bestWindow.end}` : `${formatHourLabel(w.startHour)}–${formatHourLabel(w.endHour)}`}
              </Text>
              <FishRating score={w.avgScore} color={skyTheme.accent} />
            </View>
          ))}
        </View>
      )}
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fishRow: { flexDirection: 'row', gap: 1 },
  svg: { width: '100%', aspectRatio: W / H },
  fishClusterAnchor: {
    position: 'absolute', bottom: 1, width: 40, marginLeft: -20, alignItems: 'center',
  },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axis: { fontSize: 10, opacity: 0.55 },
  expandToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 10, paddingVertical: 4,
  },
  rankedList: { marginTop: 6, gap: 8 },
  rankedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
