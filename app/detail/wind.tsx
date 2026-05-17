import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Svg, Path, Defs, LinearGradient, Stop,
  Line, Circle, Text as SvgText, G,
} from 'react-native-svg'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { HourlyWind } from '../../types/conditions'

const CHART_HEIGHT = 200
const PADDING = { top: 24, bottom: 36, left: 36, right: 16 }

const DIRECTION_ARROWS = ['N','NE','E','SE','S','SW','W','NW']

function directionArrow(deg: number): string {
  const idx = Math.round(((deg % 360) + 360) / 45) % 8
  return DIRECTION_ARROWS[idx]
}

function speedColor(mph: number): string {
  if (mph <= 12) return '#10B981'
  if (mph <= 18) return '#F59E0B'
  return '#EF4444'
}

function hourLabel(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}

export default function WindDetailScreen() {
  const { data, current } = useLocalSearchParams<{ data: string; current: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const speedUnit = useSettingsStore(s => s.speedUnit)

  const windHourly = useMemo<HourlyWind[]>(() => {
    if (!data) return []
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  }, [data])

  const currentWind = useMemo(() => {
    if (!current) return null
    try { return JSON.parse(current) } catch { return null }
  }, [current])
  const convert = useCallback(
    (mph: number) => speedUnit === 'kts' ? Math.round(mph * 0.868) : mph,
    [speedUnit]
  )
  const unitLabel = speedUnit === 'kts' ? 'kts' : 'mph'

  const chartW = width - Spacing.screenPad * 2 - Spacing.md * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const allSpeeds = windHourly.map(h => h.speed)
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Wind</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {cursor ? (
        <View style={styles.cursorInfo}>
          <Text style={[styles.cursorSpeed, { color: speedColor(cursor.speed) }]}>
            {hourLabel(cursor.hour)}  ·  {convert(cursor.speed)} {unitLabel}
          </Text>
          <Text style={styles.cursorSub}>
            Gusts {convert(cursor.gusts ?? cursor.speed)} {unitLabel}  ·  {directionArrow(cursor.direction ?? 0)} {cursor.directionLabel}
          </Text>
        </View>
      ) : peakEntry ? (
        <View style={styles.cursorInfo}>
          <Text style={styles.cursorSub}>Peak {convert(peakEntry.speed)} {unitLabel} at {hourLabel(peakEntry.hour)} · {directionArrow(peakEntry.direction ?? 0)} {peakEntry.directionLabel}</Text>
        </View>
      ) : null}

      {windHourly.length > 0 && windHourly[0].hour > 0 && (
        <Text style={styles.rangeNote}>
          Forecast from {hourLabel(windHourly[0].hour)} · {windHourly.length} hours
        </Text>
      )}

      {windHourly.length > 0 ? (
        <View style={styles.chartCard}>
          <View {...panResponder.panHandlers}>
            <Svg width={chartW} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="windFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Colors.ocean} stopOpacity={0.5} />
                  <Stop offset="1" stopColor={Colors.ocean} stopOpacity={0.05} />
                </LinearGradient>
              </Defs>

              {/* Y-axis grid lines */}
              {gridLines.map((v, i) => (
                <G key={`grid-${i}`}>
                  <Line
                    x1={PADDING.left} y1={toY(v)}
                    x2={PADDING.left + innerW} y2={toY(v)}
                    stroke={Colors.textTertiary} strokeWidth={0.5} strokeOpacity={0.3}
                  />
                  <SvgText
                    x={PADDING.left - 4} y={toY(v) + 4}
                    fill={Colors.textTertiary} fontSize={9} textAnchor="end"
                  >
                    {convert(v)}
                  </SvgText>
                </G>
              ))}

              {/* Danger threshold at 25 mph */}
              {maxVal > 15 && (
                <G>
                  <Line x1={PADDING.left} y1={toY(25)} x2={PADDING.left + innerW} y2={toY(25)}
                    stroke="#EF4444" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 3" />
                  <SvgText x={PADDING.left + innerW} y={toY(25) - 4}
                    fill="#EF4444" fontSize={8} textAnchor="end" fillOpacity={0.8}>
                    25 mph · dangerous
                  </SvgText>
                </G>
              )}

              {/* Gust band */}
              {gustBandPath ? (
                <Path d={gustBandPath} fill={Colors.ocean} fillOpacity={0.12} />
              ) : null}

              {/* Speed area fill */}
              {fillPath ? (
                <Path d={fillPath} fill="url(#windFill)" />
              ) : null}

              {/* Speed line */}
              {speedPath ? (
                <Path d={speedPath} stroke={Colors.ocean} strokeWidth={2} fill="none" />
              ) : null}

              {/* Colored speed dots */}
              {windHourly.length <= 24 && windHourly.map((h, i) => (
                <Circle key={`dot-${i}`} cx={toX(i)} cy={toY(h.speed)} r={3} fill={speedColor(h.speed)} />
              ))}

              {/* Peak gust callout */}
              {peakEntry && peakIdx !== -1 && (
                <G>
                  <Circle cx={toX(peakIdx)} cy={toY(peakEntry.speed)} r={7} fill="#EF4444" fillOpacity={0.8} />
                  <SvgText x={toX(peakIdx)} y={toY(peakEntry.speed) - 12}
                    fill="#EF4444" fontSize={9} textAnchor="middle" fontWeight="600">Peak</SvgText>
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
                    fill={Colors.textTertiary}
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
                    fill={Colors.textTertiary}
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
                    stroke={Colors.accent} strokeWidth={1} strokeDasharray="4 2"
                  />
                  <Circle
                    cx={toX(cursorIdx)} cy={toY(windHourly[cursorIdx].speed)}
                    r={5} fill={Colors.accent}
                  />
                </>
              )}
            </Svg>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          {currentWind ? (
            <>
              <Text style={[styles.cursorSpeed, { color: speedColor(currentWind.speed) }]}>
                {convert(currentWind.speed)} {unitLabel}
              </Text>
              <Text style={styles.cursorSub}>
                Gusts {convert(currentWind.gusts ?? currentWind.speed)} {unitLabel}  ·  {directionArrow(currentWind.direction ?? 0)} {currentWind.directionLabel}
              </Text>
              <Text style={styles.empty}>Hourly chart not available for this spot</Text>
            </>
          ) : (
            <Text style={styles.empty}>No wind data available</Text>
          )}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: Colors.ocean }]} />
          <Text style={styles.legendLabel}>Wind speed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: Colors.ocean, opacity: 0.3 }]} />
          <Text style={styles.legendLabel}>Gust band</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPad },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  close: { fontSize: 14, color: Colors.accent },
  cursorInfo: {
    backgroundColor: Colors.card, borderRadius: 8, padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cursorSpeed: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  cursorSub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  emptyCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.lg, alignItems: 'center',
  },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  legend: { flexDirection: 'row', gap: Spacing.lg, justifyContent: 'center', marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendLabel: { fontSize: 11, color: Colors.textSecondary },
  rangeNote: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginBottom: Spacing.sm },
  empty: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center', marginTop: Spacing.sm },
})
