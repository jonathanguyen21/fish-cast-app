import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Rect, Circle } from 'react-native-svg'
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

function buildPath(scores: number[]): string {
  const n = scores.length
  const y = (s: number) => H - PAD - (s / 100) * (H - PAD * 2)
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

  useEffect(() => {
    dash.value = EST_LEN
    dash.value = withTiming(0, { duration: 900 })
  }, [dash])

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: dash.value }))

  if (hourlyScores.length < 2) return null

  const n = hourlyScores.length
  const scores = hourlyScores.map(h => h.score)
  const path = buildPath(scores)
  const yFor = (s: number) => H - PAD - (s / 100) * (H - PAD * 2)

  const startH = parseHour(bestWindow.start)
  const endH = parseHour(bestWindow.end)
  const showBand = !bestWindow.passed && startH >= 0 && endH >= startH
  const bandX = xFor(startH, n)
  const bandW = Math.max(8, xFor(Math.min(endH + 1, n - 1), n) - bandX)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.85 }]}>{title}</Text>
        <Text style={[Type.chip, { color: skyTheme.accent }]}>
          {bestWindow.passed ? `Peak was ${bestWindow.start}–${bestWindow.end}` : `Best ${bestWindow.start}–${bestWindow.end}`}
        </Text>
      </View>
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
      </Svg>
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
