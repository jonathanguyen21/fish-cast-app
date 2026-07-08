import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, PanResponder, PanResponderInstance, useWindowDimensions } from 'react-native'
import { Svg, Polyline, Circle, Text as SvgText, Line, G } from 'react-native-svg'
import { Radii, Type, Fonts } from '../../../theme/tokens'
import type { SectionProps } from './types'

const CHART_HEIGHT = 160
const PADDING = { top: 20, bottom: 28, left: 16, right: 16 }
const CARD_MARGIN = 16
const CARD_PADDING = 14
const TOTAL_HOURS = 24

const TREND_SENTENCES: Record<string, Record<string, string>> = {
  falling: {
    slow: 'Falling slowly — barometric drop often triggers feeding activity',
    normal: 'Falling steadily — fish may be more active as pressure drops',
    fast: 'Falling fast — fish can become unpredictable; best to get out early',
  },
  rising: {
    slow: 'Rising slowly — conditions stabilising, good sustained bite likely',
    normal: 'Rising steadily — fish often go deep; try bottom presentations',
    fast: 'Rising fast — fish tend to go deep and feed less aggressively',
  },
  stable: {
    slow: 'Stable — consistent pressure supports predictable fish behavior',
    normal: 'Stable — consistent pressure supports predictable fish behavior',
    fast: 'Stable — consistent pressure supports predictable fish behavior',
  },
}

function formatHour(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display} ${period}`
}

export function PressureSection({ conditions, theme }: SectionProps) {
  const { width } = useWindowDimensions()
  const pressure = conditions.pressure
  const readings = pressure?.readings ?? []
  const currentHour = new Date().getHours()

  const chartW = width - CARD_MARGIN * 2 - CARD_PADDING * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const minR = readings.length ? Math.min(...readings) - 0.05 : 29.8
  const maxR = readings.length ? Math.max(...readings) + 0.05 : 30.2
  const range = maxR - minR || 0.1

  // X maps hour (0–23) across full day; Y maps pressure value
  const toX = useCallback(
    (hour: number) => PADDING.left + (hour / (TOTAL_HOURS - 1)) * innerW,
    [innerW]
  )
  const toY = useCallback(
    (v: number) => PADDING.top + innerH - ((v - minR) / range) * innerH,
    [innerH, minR, range]
  )

  // readings[0] = midnight, readings[i] = hour i
  const points = readings.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const hour = Math.round((x / innerW) * (TOTAL_HOURS - 1))
      const clamped = Math.max(0, Math.min(hour, readings.length - 1))
      setCursorIdx(clamped)
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const hour = Math.round((x / innerW) * (TOTAL_HOURS - 1))
      const clamped = Math.max(0, Math.min(hour, readings.length - 1))
      setCursorIdx(clamped)
    },
    onPanResponderRelease: () => {},
  }), [readings.length, innerW])

  if (!pressure) return null

  const trendSentence = TREND_SENTENCES[pressure.trend]?.[pressure.rate] ?? ''
  const textTint = theme.textTint
  const cardBg = theme.tintedDark.card
  const accent = theme.accent

  return (
    <View testID="pressure-section-chart" style={[styles.card, { backgroundColor: cardBg }]}>
      {cursorIdx !== null && readings[cursorIdx] !== undefined && (
        <View style={styles.cursorInfo}>
          <Text style={[styles.cursorText, { color: textTint }]}>
            {readings[cursorIdx].toFixed(2)} inHg · {formatHour(cursorIdx)}
          </Text>
        </View>
      )}

      {readings.length >= 2 ? (
        <View {...panResponder.panHandlers}>
          <Svg width={chartW} height={CHART_HEIGHT}>
            {/* Y-axis grid lines */}
            {[minR, (minR + maxR) / 2, maxR].map((v) => (
              <G key={v.toFixed(2)}>
                <Line
                  x1={PADDING.left} y1={toY(v)}
                  x2={PADDING.left + innerW} y2={toY(v)}
                  stroke={textTint} strokeWidth={0.5} strokeOpacity={0.15}
                />
                <SvgText
                  x={PADDING.left - 2} y={toY(v) + 3}
                  fill={textTint} fillOpacity={0.55} fontSize={8} textAnchor="end"
                >
                  {v.toFixed(2)}
                </SvgText>
              </G>
            ))}
            <Polyline
              points={points}
              fill="none"
              stroke={accent}
              strokeWidth={2}
            />
            {/* Now marker */}
            <Line
              x1={toX(currentHour)} y1={PADDING.top}
              x2={toX(currentHour)} y2={PADDING.top + innerH}
              stroke={accent} strokeWidth={1} strokeOpacity={0.5}
            />
            {readings.map((v, i) => (
              <Circle
                key={i}
                cx={toX(i)} cy={toY(v)} r={cursorIdx === i ? 6 : 3}
                fill={accent}
                fillOpacity={cursorIdx === i ? 1 : 0.7}
              />
            ))}
            {/* Fixed x-axis labels: 12 AM, 6 AM, 12 PM, 6 PM, + cursor */}
            {[0, 6, 12, 18].map(h => (
              <SvgText
                key={h}
                x={toX(h)} y={CHART_HEIGHT - 4}
                fill={textTint} fillOpacity={0.55} fontSize={8} textAnchor="middle"
              >
                {formatHour(h)}
              </SvgText>
            ))}
            <SvgText
              x={toX(currentHour)} y={CHART_HEIGHT - 4}
              fill={accent} fontSize={8} textAnchor="middle"
            >
              Now
            </SvgText>
            {cursorIdx !== null && cursorIdx !== currentHour && (
              <SvgText
                x={toX(cursorIdx)} y={PADDING.top + 10}
                fill={accent} fontSize={8} textAnchor="middle"
              >
                {formatHour(cursorIdx)}
              </SvgText>
            )}
          </Svg>
        </View>
      ) : (
        <Text style={[Type.secondary, styles.empty, { color: textTint, opacity: 0.55 }]}>Not enough pressure readings available</Text>
      )}

      <View style={styles.trendRow}>
        <Text style={[styles.trendValue, { color: textTint }]}>{pressure.value.toFixed(2)} inHg</Text>
        <Text style={[Type.secondary, styles.trendSentence, { color: textTint, opacity: 0.7 }]}>{trendSentence}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    marginHorizontal: CARD_MARGIN,
    padding: CARD_PADDING,
  },
  cursorInfo: { marginBottom: 8 },
  cursorText: { fontFamily: Fonts.bold, fontSize: 14, textAlign: 'center' },
  empty: { textAlign: 'center', paddingVertical: 20 },
  trendRow: { alignItems: 'center', marginTop: 12 },
  trendValue: { fontFamily: Fonts.bold, fontSize: 22, marginBottom: 6 },
  trendSentence: { textAlign: 'center', lineHeight: 18 },
})
