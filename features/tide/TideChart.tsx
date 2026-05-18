import React, { useState, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, PanResponder, PanResponderInstance, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Svg, Path, Defs, LinearGradient, Stop, Line, Circle, Text as SvgText, G } from 'react-native-svg'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { useSettingsStore } from '../../store/settingsStore'
import type { TideData } from '../../types/conditions'
import { formatScrubTime } from './tideUtils'

interface Props {
  tide: TideData
  currentHour: number
}

const CHART_HEIGHT = 140
const PADDING = { top: 20, bottom: 40, left: 28, right: 8 }

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

function parseEventHour(timeStr: string): number {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h + min / 60
}

export function TideChart({ tide, currentHour }: Props) {
  const { width } = useWindowDimensions()
  const CHART_WIDTH = width - Spacing.screenPad * 2 - Spacing.md * 2

  const lengthUnit = useSettingsStore(s => s.lengthUnit)
  const fmtHeight = (h: number) =>
    lengthUnit === 'm' ? (h * 0.3048).toFixed(1) : h.toFixed(1)
  const heightUnit = lengthUnit === 'm' ? 'm' : 'ft'

  const curve = tide.hourlyCurve
  const minH = Math.min(...curve)
  const maxH = Math.max(...curve)
  const range = maxH - minH || 1

  const chartW = CHART_WIDTH - PADDING.left - PADDING.right
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const toX = (hour: number) => PADDING.left + (hour / (curve.length - 1)) * chartW
  const toY = (h: number) => PADDING.top + chartH - ((h - minH) / range) * chartH

  const points = curve.map((h, i) => ({ x: toX(i), y: toY(h) }))
  const pathD = curvePath(points)
  const fillD = `${pathD} L ${toX(curve.length - 1)} ${CHART_HEIGHT - PADDING.bottom} L ${toX(0)} ${CHART_HEIGHT - PADDING.bottom} Z`

  const clampedHour = Math.min(Math.max(currentHour, 0), curve.length - 1)
  const nowX = toX(clampedHour)
  const nowY = toY(curve[clampedHour])

  const [cursorIndex, setCursorIndex] = useState<number | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
      const rawIdx = (e.nativeEvent.locationX - PADDING.left) / chartW * (curve.length - 1)
      setCursorIndex(Math.max(0, Math.min(Math.round(rawIdx), curve.length - 1)))
    },
    onPanResponderMove: (e) => {
      const rawIdx = (e.nativeEvent.locationX - PADDING.left) / chartW * (curve.length - 1)
      setCursorIndex(Math.max(0, Math.min(Math.round(rawIdx), curve.length - 1)))
    },
    onPanResponderRelease: () => {
      fadeTimer.current = setTimeout(() => setCursorIndex(null), 2000)
    },
  }), [curve.length, chartW])

  const baseline = CHART_HEIGHT - PADDING.bottom

  const phaseText = tide.phase === 'incoming' ? 'Incoming' : tide.phase === 'outgoing' ? 'Outgoing' : 'Slack'
  const phaseIconName = tide.phase === 'incoming' ? 'arrow-up-outline' : tide.phase === 'outgoing' ? 'arrow-down-outline' : 'remove-outline'

  return (
    <View style={styles.container} testID="tide-chart">
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Tides</Text>
        <Text style={styles.sectionTitleMeta}> · </Text>
        <Ionicons name={phaseIconName} size={12} color={Colors.accent} />
        <Text style={styles.sectionTitleMeta}> {phaseText} · {fmtHeight(tide.current.height)} {heightUnit}</Text>
      </View>
      <View {...panResponder.panHandlers}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.ocean} stopOpacity={0.4} />
              <Stop offset="1" stopColor={Colors.ocean} stopOpacity={0.0} />
            </LinearGradient>
          </Defs>
          {/* Y-axis height labels */}
          {[minH, (minH + maxH) / 2, maxH].map((h, i) => (
            <SvgText key={`yax-${i}`} x={PADDING.left - 4} y={toY(h) + 4}
              fill={Colors.textTertiary} fontSize={8} textAnchor="end">
              {fmtHeight(h)}
            </SvgText>
          ))}
          <Path d={fillD} fill="url(#tideGrad)" />
          <Path d={pathD} stroke={Colors.ocean} strokeWidth={2} fill="none" />
          <Line x1={nowX} y1={PADDING.top} x2={nowX} y2={baseline}
            stroke={Colors.accent} strokeWidth={1.5} strokeDasharray="4 2" />
          <Circle cx={nowX} cy={nowY} r={4} fill={Colors.accent} />

          {/* Tide event tick marks */}
          {tide.events.map((ev, idx) => {
            const evHour = parseEventHour(ev.time)
            const ex = Math.max(PADDING.left + 20, Math.min(PADDING.left + chartW - 20, toX(evHour)))
            const symbol = ev.type === 'high' ? '▲' : '▼'
            const symbolColor = ev.type === 'high' ? Colors.accent : Colors.textSecondary

            const prevHours = tide.events.slice(0, idx).map(e => parseEventHour(e.time))
            const tooClose = prevHours.some(ph => Math.abs(toX(ph) - ex) < 30)

            return (
              <G key={`${ev.type}-${idx}`} testID={`tide-tick-${ev.type}-${idx}`}>
                <Line
                  x1={ex} y1={baseline}
                  x2={ex} y2={baseline + 5}
                  stroke={symbolColor} strokeWidth={1.5}
                />
                <SvgText
                  x={ex} y={baseline + 14}
                  fill={symbolColor} fontSize={9} textAnchor="middle"
                >
                  {symbol}
                </SvgText>
                <SvgText
                  x={ex} y={baseline + 24}
                  fill={Colors.textSecondary} fontSize={8} textAnchor="middle"
                >
                  {fmtHeight(ev.height)}{heightUnit}
                </SvgText>
                {!tooClose && (
                  <SvgText
                    x={ex} y={baseline + 34}
                    fill={Colors.textTertiary} fontSize={7} textAnchor="middle"
                  >
                    {ev.time}
                  </SvgText>
                )}
              </G>
            )
          })}

          {/* Drag cursor */}
          {cursorIndex !== null && (
            <>
              <Line
                x1={toX(cursorIndex)} y1={PADDING.top}
                x2={toX(cursorIndex)} y2={baseline}
                stroke={Colors.accent} strokeWidth={1} strokeDasharray="3 2"
              />
              <Circle cx={toX(cursorIndex)} cy={toY(curve[cursorIndex])} r={5} fill={Colors.accent} />
              <SvgText
                x={Math.min(toX(cursorIndex) + 6, CHART_WIDTH - 60)}
                y={Math.max(toY(curve[cursorIndex]) - 8, PADDING.top + 12)}
                fill={Colors.textPrimary} fontSize={11} fontWeight="600"
              >
                {fmtHeight(curve[cursorIndex])} {heightUnit}
              </SvgText>
              <SvgText
                x={Math.min(toX(cursorIndex) + 6, CHART_WIDTH - 60)}
                y={Math.max(toY(curve[cursorIndex]) + 6, PADDING.top + 24)}
                fill={Colors.textSecondary} fontSize={10}
              >
                {formatScrubTime(cursorIndex)}
              </SvgText>
            </>
          )}
        </Svg>
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  sectionTitleMeta: { fontSize: 13, fontWeight: '600', color: Colors.accent },
})
