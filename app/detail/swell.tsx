import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Svg, Rect, Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop, G,
} from 'react-native-svg'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

type SwellHour = { hour: number; height: number; period: number; directionLabel: string }

const CHART_HEIGHT = 200
const PADDING = { top: 24, bottom: 36, left: 36, right: 16 }
const TEAL = '#00B4D8'
const ORANGE = '#FF8C00'

function hourLabel(h: number) {
  const period = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}${period}`
}

export default function SwellDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const swellHourly = useMemo<SwellHour[]>(() => {
    if (!data) return []
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  }, [data])

  const chartW = width - Spacing.screenPad * 2 - Spacing.md * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const maxHeight = Math.max(...swellHourly.map(h => h.height), 1)
  const maxPeriod = Math.max(...swellHourly.map(h => h.period), 1)
  const barW = swellHourly.length > 0 ? (innerW / swellHourly.length) * 0.6 : 0

  const toX = useCallback(
    (i: number) => PADDING.left + (i / Math.max(swellHourly.length - 1, 1)) * innerW,
    [innerW, swellHourly.length]
  )
  const toYHeight = useCallback(
    (v: number) => PADDING.top + innerH - (v / maxHeight) * innerH,
    [innerH, maxHeight]
  )
  const toYPeriod = useCallback(
    (v: number) => PADDING.top + innerH - (v / maxPeriod) * innerH,
    [innerH, maxPeriod]
  )

  const periodPath = swellHourly.length >= 2
    ? swellHourly.map((h, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toYPeriod(h.period)}`).join(' ')
    : ''

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)
  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (swellHourly.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, swellHourly.length - 1)))
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (swellHourly.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, swellHourly.length - 1)))
    },
    onPanResponderRelease: () => {},
  }), [swellHourly.length, innerW])

  const cursor = cursorIdx !== null ? swellHourly[cursorIdx] : null
  const heightGrid = [0, parseFloat((maxHeight / 2).toFixed(1)), parseFloat(maxHeight.toFixed(1))]
  const periodGrid = [0, Math.round(maxPeriod / 2), maxPeriod]

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Swell</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cursorInfo}>
        {cursor ? (
          <Text style={styles.cursorText}>
            {hourLabel(cursor.hour)}  ·  {cursor.height} ft  ·  {cursor.period}s  ·  {cursor.directionLabel}
          </Text>
        ) : (
          <Text style={styles.cursorSub}>Drag to scrub</Text>
        )}
      </View>

      {swellHourly.length > 0 ? (
        <View style={styles.chartCard}>
          <View {...panResponder.panHandlers}>
            <Svg width={chartW} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="swellFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={TEAL} stopOpacity={0.7} />
                  <Stop offset="1" stopColor={TEAL} stopOpacity={0.2} />
                </LinearGradient>
              </Defs>

              {/* Y-axis left (height) */}
              {heightGrid.map(v => (
                <G key={`hl-${v}`}>
                  <Line
                    x1={PADDING.left} y1={toYHeight(v)}
                    x2={PADDING.left + innerW} y2={toYHeight(v)}
                    stroke={Colors.textTertiary} strokeWidth={0.5} strokeOpacity={0.3}
                  />
                  <SvgText x={PADDING.left - 4} y={toYHeight(v) + 3} fill={TEAL} fontSize={8} textAnchor="end">
                    {v}ft
                  </SvgText>
                </G>
              ))}

              {/* Y-axis right (period) */}
              {periodGrid.map(v => (
                <SvgText
                  key={`pr-${v}`}
                  x={PADDING.left + innerW + 4}
                  y={toYPeriod(v) + 3}
                  fill={ORANGE} fontSize={8}
                >
                  {v}s
                </SvgText>
              ))}

              {/* Height bars */}
              {swellHourly.map((h, i) => (
                <Rect
                  key={h.hour}
                  x={toX(i) - barW / 2}
                  y={toYHeight(h.height)}
                  width={barW}
                  height={innerH - (toYHeight(h.height) - PADDING.top)}
                  rx={2}
                  fill={cursorIdx === i ? TEAL : 'url(#swellFill)'}
                  opacity={cursorIdx === i ? 1 : 0.8}
                />
              ))}

              {/* Period dot-line */}
              {periodPath ? <Path d={periodPath} stroke={ORANGE} strokeWidth={2} fill="none" strokeDasharray="4 2" /> : null}
              {swellHourly.map((h, i) => (
                <Circle key={`dot-${h.hour}`} cx={toX(i)} cy={toYPeriod(h.period)} r={cursorIdx === i ? 5 : 3} fill={ORANGE} />
              ))}

              {/* X-axis */}
              {swellHourly.filter((_, i) => i % 4 === 0).map((item, idx) => (
                <SvgText
                  key={`xl-${item.hour}`}
                  x={toX(idx * 4)}
                  y={CHART_HEIGHT - 4}
                  fill={Colors.textTertiary} fontSize={9} textAnchor="middle"
                >
                  {hourLabel(item.hour)}
                </SvgText>
              ))}

              {/* Cursor */}
              {cursorIdx !== null && (
                <Line
                  x1={toX(cursorIdx)} y1={PADDING.top}
                  x2={toX(cursorIdx)} y2={PADDING.top + innerH}
                  stroke={Colors.accent} strokeWidth={1} strokeDasharray="4 2"
                />
              )}
            </Svg>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>No swell data available</Text>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: TEAL }]} />
          <Text style={styles.legendLabel}>Height (ft)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: ORANGE }]} />
          <Text style={styles.legendLabel}>Period (s)</Text>
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
    marginBottom: Spacing.sm, alignItems: 'center',
  },
  cursorText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  cursorSub: { fontSize: 12, color: Colors.textSecondary },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  legend: { flexDirection: 'row', gap: Spacing.lg, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: Colors.textSecondary },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
