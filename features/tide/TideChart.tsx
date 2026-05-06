import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Svg, Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { TideData } from '../../types/conditions'

interface Props {
  tide: TideData
  currentHour: number
}

const CHART_WIDTH = 340
const CHART_HEIGHT = 140
const PADDING = { top: 20, bottom: 30, left: 8, right: 8 }

function curvePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cp1x = prev.x + (curr.x - prev.x) / 3
    const cp2x = curr.x - (curr.x - prev.x) / 3
    d += ` C ${cp1x} ${prev.y}, ${cp2x} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

export function TideChart({ tide, currentHour }: Props) {
  const curve = tide.hourlyCurve
  const minH = Math.min(...curve)
  const maxH = Math.max(...curve)
  const range = maxH - minH || 1

  const chartW = CHART_WIDTH - PADDING.left - PADDING.right
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const toX = (i: number) => PADDING.left + (i / (curve.length - 1)) * chartW
  const toY = (h: number) => PADDING.top + chartH - ((h - minH) / range) * chartH

  const points = curve.map((h, i) => ({ x: toX(i), y: toY(h) }))
  const pathD = curvePath(points)
  const fillD = `${pathD} L ${toX(curve.length - 1)} ${CHART_HEIGHT - PADDING.bottom} L ${toX(0)} ${CHART_HEIGHT - PADDING.bottom} Z`

  const clampedHour = Math.min(Math.max(currentHour, 0), curve.length - 1)
  const nowX = toX(clampedHour)
  const nowY = toY(curve[clampedHour])

  const hiLo = tide.events.slice(0, 2)

  return (
    <View style={styles.container} testID="tide-chart">
      <Text style={styles.sectionTitle}>Tides</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.ocean} stopOpacity={0.4} />
            <Stop offset="1" stopColor={Colors.ocean} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>
        <Path d={fillD} fill="url(#tideGrad)" />
        <Path d={pathD} stroke={Colors.ocean} strokeWidth={2} fill="none" />
        <Line x1={nowX} y1={PADDING.top} x2={nowX} y2={CHART_HEIGHT - PADDING.bottom}
          stroke={Colors.accent} strokeWidth={1.5} strokeDasharray="4 2" />
        <Circle cx={nowX} cy={nowY} r={4} fill={Colors.accent} />
      </Svg>
      <View style={styles.events}>
        {hiLo.map((ev, i) => (
          <Text key={ev.time} style={styles.eventText}>
            {ev.type === 'high' ? '▲' : '▼'} {ev.time} {ev.height.toFixed(1)} ft
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  events: { flexDirection: 'row', gap: Spacing.lg, paddingTop: Spacing.xs },
  eventText: { fontSize: 12, color: Colors.textSecondary },
})
