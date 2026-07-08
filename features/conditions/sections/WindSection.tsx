import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import {
  Svg, Path, Defs, LinearGradient, Stop,
  Line, Circle, Text as SvgText, G,
} from 'react-native-svg'
import { useSettingsStore } from '../../../store/settingsStore'
import { Radii, Type, Fonts } from '../../../theme/tokens'
import type { HourlyWind } from '../../../types/conditions'
import type { SectionProps } from './types'

const CHART_HEIGHT = 200
const PADDING = { top: 24, bottom: 36, left: 36, right: 16 }
const CARD_MARGIN = 16
const CARD_PADDING = 14

const DIRECTION_ARROWS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

// Status colors for speed severity — not part of the text/card restyle mapping.
const SPEED_SUCCESS = '#10B981'
const SPEED_WARNING = '#F59E0B'
const SPEED_DANGER = '#EF4444'

function directionArrow(deg: number): string {
  const idx = Math.round(((deg % 360) + 360) / 45) % 8
  return DIRECTION_ARROWS[idx]
}

function speedColor(mph: number): string {
  if (mph <= 12) return SPEED_SUCCESS
  if (mph <= 18) return SPEED_WARNING
  return SPEED_DANGER
}

function hourLabel(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}

export function WindSection({ conditions, theme }: SectionProps) {
  const { width } = useWindowDimensions()
  const speedUnit = useSettingsStore(s => s.speedUnit)
  const windHourly = conditions.windHourly ?? []

  const convert = useCallback(
    (mph: number) => speedUnit === 'kts' ? Math.round(mph * 0.868) : mph,
    [speedUnit]
  )
  const unitLabel = speedUnit === 'kts' ? 'kts' : 'mph'

  const chartW = width - CARD_MARGIN * 2 - CARD_PADDING * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const allGusts = windHourly.map(h => h.gusts ?? h.speed)
  const maxVal = Math.max(...allGusts, 1)
  const gridLines = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal]

  const toX = useCallback(
    (i: number) => PADDING.left + (i / Math.max(windHourly.length - 1, 1)) * innerW,
    [innerW, windHourly.length]
  )
  const toY = useCallback(
    (v: number) => PADDING.top + innerH - (v / maxVal) * innerH,
    [innerH, maxVal]
  )

  const speedPath = windHourly.length >= 2
    ? windHourly.map((h, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(h.speed)}`).join(' ')
    : ''
  const fillPath = speedPath
    ? `${speedPath} L ${toX(windHourly.length - 1)} ${PADDING.top + innerH} L ${PADDING.left} ${PADDING.top + innerH} Z`
    : ''

  const gustBandPath = windHourly.length >= 2
    ? windHourly.map((h, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(h.gusts ?? h.speed)}`).join(' ')
      + ' ' + [...windHourly].reverse().map((h, i, arr) => `${i === 0 ? 'L' : 'L'} ${toX(arr.length - 1 - i)} ${toY(h.speed)}`).join(' ')
      + ' Z'
    : ''

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (windHourly.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, windHourly.length - 1)))
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (windHourly.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, windHourly.length - 1)))
    },
    onPanResponderRelease: () => {},
  }), [windHourly.length, innerW])

  const cursor = cursorIdx !== null ? windHourly[cursorIdx] : null
  const peakEntry = windHourly.reduce<HourlyWind | null>(
    (best, h) => (!best || h.speed > best.speed ? h : best), null
  )
  const peakIdx = peakEntry ? windHourly.indexOf(peakEntry) : -1

  if (windHourly.length === 0) return null

  const textTint = theme.textTint
  const cardBg = theme.tintedDark.card
  const accent = theme.accent

  return (
    <View testID="wind-section-chart" style={[styles.card, { backgroundColor: cardBg }]}>
      {cursor ? (
        <View style={styles.cursorInfo}>
          <Text style={[styles.cursorSpeed, { color: speedColor(cursor.speed) }]}>
            {hourLabel(cursor.hour)}  ·  {convert(cursor.speed)} {unitLabel}
          </Text>
          <Text style={[Type.secondary, styles.cursorSub, { color: textTint, opacity: 0.7 }]}>
            Gusts {convert(cursor.gusts ?? cursor.speed)} {unitLabel}  ·  {directionArrow(cursor.direction ?? 0)} {cursor.directionLabel}
          </Text>
        </View>
      ) : peakEntry ? (
        <View style={styles.cursorInfo}>
          <Text style={[Type.secondary, styles.cursorSub, { color: textTint, opacity: 0.7 }]}>
            Peak {convert(peakEntry.speed)} {unitLabel} at {hourLabel(peakEntry.hour)} · {directionArrow(peakEntry.direction ?? 0)} {peakEntry.directionLabel}
          </Text>
        </View>
      ) : null}

      {windHourly[0].hour > 0 && (
        <Text style={[Type.secondary, styles.rangeNote, { color: textTint, opacity: 0.55 }]}>
          Forecast from {hourLabel(windHourly[0].hour)} · {windHourly.length} hours
        </Text>
      )}

      <View {...panResponder.panHandlers}>
        <Svg width={chartW} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity={0.5} />
              <Stop offset="1" stopColor={accent} stopOpacity={0.05} />
            </LinearGradient>
          </Defs>

          {/* Y-axis grid lines */}
          {gridLines.map((v, i) => (
            <G key={`grid-${i}`}>
              <Line
                x1={PADDING.left} y1={toY(v)}
                x2={PADDING.left + innerW} y2={toY(v)}
                stroke={textTint} strokeWidth={0.5} strokeOpacity={0.15}
              />
              <SvgText
                x={PADDING.left - 4} y={toY(v) + 4}
                fill={textTint} fillOpacity={0.55} fontSize={9} textAnchor="end"
              >
                {convert(v)}
              </SvgText>
            </G>
          ))}

          {/* Danger threshold at 25 mph */}
          {maxVal > 15 && (
            <G>
              <Line x1={PADDING.left} y1={toY(25)} x2={PADDING.left + innerW} y2={toY(25)}
                stroke={SPEED_DANGER} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
              <SvgText x={PADDING.left + innerW} y={toY(25) - 4}
                fill={SPEED_DANGER} fontSize={8} textAnchor="end" fillOpacity={0.8}>
                25 mph · dangerous
              </SvgText>
            </G>
          )}

          {/* Gust band */}
          {gustBandPath ? (
            <Path d={gustBandPath} fill={accent} fillOpacity={0.12} />
          ) : null}

          {/* Speed area fill */}
          {fillPath ? (
            <Path d={fillPath} fill="url(#windFill)" />
          ) : null}

          {/* Speed line */}
          {speedPath ? (
            <Path d={speedPath} stroke={accent} strokeWidth={2} fill="none" />
          ) : null}

          {/* Colored speed dots */}
          {windHourly.length <= 24 && windHourly.map((h, i) => (
            <Circle key={`dot-${i}`} cx={toX(i)} cy={toY(h.speed)} r={3} fill={speedColor(h.speed)} />
          ))}

          {/* Peak gust callout */}
          {peakEntry && peakIdx !== -1 && (
            <G>
              <Circle cx={toX(peakIdx)} cy={toY(peakEntry.speed)} r={7} fill={SPEED_DANGER} fillOpacity={0.8} />
              <SvgText x={toX(peakIdx)} y={toY(peakEntry.speed) - 12}
                fill={SPEED_DANGER} fontSize={9} textAnchor="middle" fontWeight="600">Peak</SvgText>
            </G>
          )}

          {/* Direction arrows every 4 hrs */}
          {windHourly.filter((_, i) => i % 4 === 0).map((item, idx) => {
            const i = idx * 4
            return (
              <SvgText
                key={item.hour}
                x={toX(i)}
                y={PADDING.top + innerH + 14}
                fill={textTint}
                fillOpacity={0.55}
                fontSize={8}
                textAnchor="middle"
              >
                {directionArrow(item.direction ?? 0)}
              </SvgText>
            )
          })}

          {/* X-axis hour labels every 4 hrs */}
          {windHourly.filter((_, i) => i % 4 === 0).map((item, idx) => {
            const i = idx * 4
            return (
              <SvgText
                key={`lbl-${item.hour}`}
                x={toX(i)}
                y={CHART_HEIGHT - 2}
                fill={textTint}
                fillOpacity={0.55}
                fontSize={9}
                textAnchor="middle"
              >
                {hourLabel(item.hour)}
              </SvgText>
            )
          })}

          {/* Cursor vertical line */}
          {cursorIdx !== null && (
            <>
              <Line
                x1={toX(cursorIdx)} y1={PADDING.top}
                x2={toX(cursorIdx)} y2={PADDING.top + innerH}
                stroke={accent} strokeWidth={1} strokeDasharray="4 2"
              />
              <Circle
                cx={toX(cursorIdx)} cy={toY(windHourly[cursorIdx].speed)}
                r={5} fill={accent}
              />
            </>
          )}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: accent }]} />
          <Text style={[Type.secondary, styles.legendLabel, { color: textTint, opacity: 0.7 }]}>Wind speed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: accent, opacity: 0.3 }]} />
          <Text style={[Type.secondary, styles.legendLabel, { color: textTint, opacity: 0.7 }]}>Gust band</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { borderColor: SPEED_DANGER }]} />
          <Text style={[Type.secondary, styles.legendLabel, { color: textTint, opacity: 0.7 }]}>25 mph limit</Text>
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
  cursorInfo: { marginBottom: 8 },
  cursorSpeed: { fontFamily: Fonts.bold, fontSize: 22, textAlign: 'center', marginBottom: 4 },
  cursorSub: { textAlign: 'center' },
  rangeNote: { textAlign: 'center', marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendDash: { width: 16, height: 0, borderBottomWidth: 1.5, borderStyle: 'dashed', borderRadius: 0 },
  legendLabel: {},
})
