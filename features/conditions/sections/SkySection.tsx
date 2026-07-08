import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, PanResponder, PanResponderInstance, useWindowDimensions } from 'react-native'
import { Svg, Path, Line, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg'
import { Radii, Type, Fonts } from '../../../theme/tokens'
import type { SectionProps } from './types'

const CHART_HEIGHT = 200
const PADDING = { top: 24, bottom: 36, left: 36, right: 16 }
const CARD_MARGIN = 16
const CARD_PADDING = 14
const RAIN_COLOR = '#4DA8DA'
const CLOUD_COLOR = '#6B7F96'

function hourLabel(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}

export function SkySection({ conditions, theme }: SectionProps) {
  const { width } = useWindowDimensions()
  const airHourly = conditions.airHourly ?? []

  const chartW = width - CARD_MARGIN * 2 - CARD_PADDING * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const toX = useCallback(
    (i: number) => PADDING.left + (i / Math.max(airHourly.length - 1, 1)) * innerW,
    [innerW, airHourly.length]
  )
  const toY = useCallback(
    (pct: number) => PADDING.top + innerH - (pct / 100) * innerH,
    [innerH]
  )

  const rainPath = airHourly.length >= 2
    ? airHourly.map((h, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(h.rainChance)}`).join(' ')
    : ''
  const rainFill = rainPath
    ? `${rainPath} L ${toX(airHourly.length - 1)} ${PADDING.top + innerH} L ${PADDING.left} ${PADDING.top + innerH} Z`
    : ''

  const cloudPath = airHourly.length >= 2
    ? airHourly.map((h, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(h.cloudCover)}`).join(' ')
    : ''
  const cloudFill = cloudPath
    ? `${cloudPath} L ${toX(airHourly.length - 1)} ${PADDING.top + innerH} L ${PADDING.left} ${PADDING.top + innerH} Z`
    : ''

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)
  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (airHourly.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, airHourly.length - 1)))
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (airHourly.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, airHourly.length - 1)))
    },
    onPanResponderRelease: () => {},
  }), [airHourly.length, innerW])

  const cursor = cursorIdx !== null ? airHourly[cursorIdx] : null

  if (airHourly.length === 0) return null

  const textTint = theme.textTint
  const cardBg = theme.tintedDark.card

  return (
    <View testID="sky-section-chart" style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cursorInfo}>
        {cursor ? (
          <Text style={[styles.cursorText, { color: textTint }]}>
            {hourLabel(cursor.hour)}  ·  {cursor.rainChance}% rain  ·  {cursor.cloudCover}% cloud
          </Text>
        ) : (
          <Text style={[Type.secondary, styles.cursorSub, { color: textTint, opacity: 0.7 }]}>Drag to scrub</Text>
        )}
      </View>

      <View {...panResponder.panHandlers}>
        <Svg width={chartW} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={RAIN_COLOR} stopOpacity={0.7} />
              <Stop offset="1" stopColor={RAIN_COLOR} stopOpacity={0.05} />
            </LinearGradient>
            <LinearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={CLOUD_COLOR} stopOpacity={0.3} />
              <Stop offset="1" stopColor={CLOUD_COLOR} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {/* Y-axis */}
          {[0, 25, 50, 75, 100].map(v => (
            <G key={v}>
              <Line
                x1={PADDING.left} y1={toY(v)}
                x2={PADDING.left + innerW} y2={toY(v)}
                stroke={textTint} strokeWidth={0.5} strokeOpacity={0.15}
              />
              <SvgText x={PADDING.left - 4} y={toY(v) + 3} fill={textTint} fillOpacity={0.55} fontSize={8} textAnchor="end">
                {v}%
              </SvgText>
            </G>
          ))}

          {/* Cloud overlay (behind rain) */}
          {cloudFill ? <Path d={cloudFill} fill="url(#cloudGrad)" /> : null}
          {cloudPath ? <Path d={cloudPath} stroke={CLOUD_COLOR} strokeWidth={1.5} fill="none" strokeDasharray="4 3" /> : null}

          {/* Rain area */}
          {rainFill ? <Path d={rainFill} fill="url(#rainGrad)" /> : null}
          {rainPath ? <Path d={rainPath} stroke={RAIN_COLOR} strokeWidth={2} fill="none" /> : null}

          {/* X-axis */}
          {airHourly.filter((_, i) => i % 4 === 0).map((item, idx) => (
            <SvgText
              key={`xl-${item.hour}`}
              x={toX(idx * 4)} y={CHART_HEIGHT - 4}
              fill={textTint} fillOpacity={0.55} fontSize={9} textAnchor="middle"
            >
              {hourLabel(item.hour)}
            </SvgText>
          ))}

          {/* Cursor */}
          {cursorIdx !== null && (
            <Line
              x1={toX(cursorIdx)} y1={PADDING.top}
              x2={toX(cursorIdx)} y2={PADDING.top + innerH}
              stroke={theme.accent} strokeWidth={1} strokeDasharray="4 2"
            />
          )}
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: RAIN_COLOR }]} />
          <Text style={[Type.secondary, styles.legendLabel, { color: textTint, opacity: 0.7 }]}>Rain chance</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: CLOUD_COLOR }]} />
          <Text style={[Type.secondary, styles.legendLabel, { color: textTint, opacity: 0.7 }]}>Cloud cover</Text>
        </View>
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
  cursorInfo: { marginBottom: 8, alignItems: 'center' },
  cursorText: { fontFamily: Fonts.bold, fontSize: 13 },
  cursorSub: {},
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendLabel: {},
})
