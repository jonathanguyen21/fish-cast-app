import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, PanResponder, PanResponderInstance, useWindowDimensions } from 'react-native'
import { Svg, Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, G } from 'react-native-svg'
import { Radii, Type, Fonts } from '../../../theme/tokens'
import type { SectionProps } from './types'

const CHART_HEIGHT = 200
const PADDING = { top: 24, bottom: 36, left: 36, right: 16 }
const CARD_MARGIN = 16
const CARD_PADDING = 14

// Cold [0,119,182] → Hot [255,87,34]
function tempToRgb(temp: number, minT: number, maxT: number): string {
  if (!Number.isFinite(temp) || !Number.isFinite(minT) || !Number.isFinite(maxT)) return 'rgb(0,119,182)'
  const t = Math.max(0, Math.min(1, (temp - minT) / Math.max(maxT - minT, 1)))
  const r = Math.round(0 + t * (255 - 0))
  const g = Math.round(119 + t * (87 - 119))
  const b = Math.round(182 + t * (34 - 182))
  return `rgb(${r},${g},${b})`
}

function hourLabel(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}

export function AirTempSection({ conditions, theme }: SectionProps) {
  const { width } = useWindowDimensions()
  const airHourly = conditions.airHourly ?? []

  const chartW = width - CARD_MARGIN * 2 - CARD_PADDING * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const temps = airHourly.map(h => h.temp).filter(Number.isFinite)
  const minT = temps.length ? Math.min(...temps) - 2 : 50
  const maxT = temps.length ? Math.max(...temps) + 2 : 90
  const range = maxT - minT || 1

  const toX = useCallback(
    (i: number) => PADDING.left + (i / Math.max(airHourly.length - 1, 1)) * innerW,
    [innerW, airHourly.length]
  )
  const toY = useCallback(
    (t: number) => PADDING.top + innerH - ((t - minT) / range) * innerH,
    [innerH, minT, range]
  )

  const linePath = airHourly.length >= 2
    ? airHourly.map((h, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(h.temp)}`).join(' ')
    : ''
  const fillPath = linePath
    ? `${linePath} L ${toX(airHourly.length - 1)} ${PADDING.top + innerH} L ${PADDING.left} ${PADDING.top + innerH} Z`
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
  const gridTemps = [minT, Math.round((minT + maxT) / 2), maxT]

  if (airHourly.length === 0) return null

  const textTint = theme.textTint
  const cardBg = theme.tintedDark.card

  return (
    <View testID="airtemp-section-chart" style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cursorInfo}>
        {cursor ? (
          <Text style={[styles.cursorText, { color: textTint }]}>
            {hourLabel(cursor.hour)}  ·  {cursor.temp}°F  ·  {cursor.rainChance}% rain  ·  {cursor.cloudCover}% cloud
          </Text>
        ) : (
          <Text style={[Type.secondary, styles.cursorSub, { color: textTint, opacity: 0.7 }]}>Drag to see hourly detail</Text>
        )}
      </View>

      {airHourly[0].hour > 0 && (
        <Text style={[Type.secondary, styles.rangeNote, { color: textTint, opacity: 0.55 }]}>
          Forecast from {hourLabel(airHourly[0].hour)} · {airHourly.length} hours
        </Text>
      )}

      <View {...panResponder.panHandlers}>
        <Svg width={chartW} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="airFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={tempToRgb(maxT, minT, maxT)} stopOpacity={0.4} />
              <Stop offset="1" stopColor={tempToRgb(minT, minT, maxT)} stopOpacity={0.05} />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {gridTemps.map((t, i) => (
            <G key={`grid-${i}`}>
              <Line
                x1={PADDING.left} y1={toY(t)}
                x2={PADDING.left + innerW} y2={toY(t)}
                stroke={textTint} strokeWidth={0.5} strokeOpacity={0.15}
              />
              <SvgText x={PADDING.left - 4} y={toY(t) + 3} fill={textTint} fillOpacity={0.55} fontSize={8} textAnchor="end">
                {Math.round(t)}°
              </SvgText>
            </G>
          ))}

          {/* Fill */}
          {fillPath ? <Path d={fillPath} fill="url(#airFill)" /> : null}

          {/* Temperature-mapped line: per-segment colored lines */}
          {airHourly.map((h, i, arr) => {
            if (i === arr.length - 1) return null
            const midTemp = (h.temp + arr[i + 1].temp) / 2
            return (
              <Line
                key={`seg-${i}`}
                x1={toX(i)} y1={toY(h.temp)}
                x2={toX(i + 1)} y2={toY(arr[i + 1].temp)}
                stroke={tempToRgb(midTemp, minT, maxT)}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            )
          })}

          {/* Colored dots */}
          {airHourly.map((h, i) => (
            <Circle
              key={h.hour}
              cx={toX(i)} cy={toY(h.temp)}
              r={cursorIdx === i ? 6 : 3}
              fill={tempToRgb(h.temp, minT, maxT)}
              opacity={cursorIdx === i ? 1 : 0.8}
            />
          ))}

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

      <View style={styles.gradient}>
        <View style={styles.gradientLabels}>
          <Text style={[styles.gradLabel, { color: 'rgb(0,119,182)' }]}>Cold</Text>
          <Text style={[styles.gradLabel, { color: 'rgb(255,87,34)' }]}>Hot</Text>
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
  rangeNote: { textAlign: 'center', marginBottom: 8 },
  gradient: { alignItems: 'center', marginTop: 4 },
  gradientLabels: { flexDirection: 'row', justifyContent: 'space-between', width: 120, marginTop: 2 },
  gradLabel: { fontFamily: Fonts.bold, fontSize: 11 },
})
