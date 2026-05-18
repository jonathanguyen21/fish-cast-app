import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Svg, Polyline, Circle, Text as SvgText, Line, G } from 'react-native-svg'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { PressureData } from '../../types/conditions'

const CHART_HEIGHT = 160
const PADDING = { top: 20, bottom: 28, left: 16, right: 16 }

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

export default function PressureDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const pressure = useMemo<PressureData | null>(
    () => (data ? JSON.parse(data) : null),
    [data]
  )
  const readings = pressure?.readings ?? []
  const currentHour = new Date().getHours()
  const hourForIndex = (i: number) => {
    const raw = currentHour - (readings.length - 1 - i)
    const h = ((raw % 24) + 24) % 24
    const period = h < 12 ? 'AM' : 'PM'
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${display} ${period}`
  }
  const chartW = width - Spacing.screenPad * 2 - Spacing.md * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const minR = readings.length ? Math.min(...readings) - 0.05 : 29.8
  const maxR = readings.length ? Math.max(...readings) + 0.05 : 30.2
  const range = maxR - minR || 0.1

  const toX = useCallback(
    (i: number) => PADDING.left + (i / Math.max(readings.length - 1, 1)) * innerW,
    [readings.length, innerW]
  )
  const toY = useCallback(
    (v: number) => PADDING.top + innerH - ((v - minR) / range) * innerH,
    [innerH, minR, range]
  )

  const points = readings.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (readings.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, readings.length - 1)))
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round((x / innerW) * (readings.length - 1))
      setCursorIdx(Math.max(0, Math.min(idx, readings.length - 1)))
    },
    onPanResponderRelease: () => {},
  }), [readings.length, innerW])

  const trendSentence = pressure
    ? (TREND_SENTENCES[pressure.trend]?.[pressure.rate] ?? '')
    : ''

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Pressure Detail</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {cursorIdx !== null && readings[cursorIdx] !== undefined && (
        <View style={styles.cursorInfo}>
          <Text style={styles.cursorText}>
            {readings[cursorIdx].toFixed(2)} inHg · {hourForIndex(cursorIdx)}
          </Text>
        </View>
      )}

      {readings.length >= 2 ? (
        <View style={styles.chartCard}>
          <View {...panResponder.panHandlers}>
            <Svg width={chartW} height={CHART_HEIGHT}>
              {/* Y-axis grid lines */}
              {[minR, (minR + maxR) / 2, maxR].map((v) => (
                <G key={v.toFixed(2)}>
                  <Line
                    x1={PADDING.left} y1={toY(v)}
                    x2={PADDING.left + innerW} y2={toY(v)}
                    stroke={Colors.textTertiary} strokeWidth={0.5} strokeOpacity={0.3}
                  />
                  <SvgText
                    x={PADDING.left - 2} y={toY(v) + 3}
                    fill={Colors.textTertiary} fontSize={8} textAnchor="end"
                  >
                    {v.toFixed(2)}
                  </SvgText>
                </G>
              ))}
              <Polyline
                points={points}
                fill="none"
                stroke={Colors.ocean}
                strokeWidth={2}
              />
              {readings.map((v, i) => (
                <Circle
                  key={i}
                  cx={toX(i)} cy={toY(v)} r={cursorIdx === i ? 6 : 3}
                  fill={cursorIdx === i ? Colors.accent : Colors.ocean}
                />
              ))}
              {readings.map((_, i) => {
                const isLast = i === readings.length - 1
                const isMid = i === Math.floor((readings.length - 1) / 2)
                const isFirst = i === 0
                const isCursor = cursorIdx === i
                if (!isFirst && !isMid && !isLast && !isCursor) return null
                return (
                  <SvgText
                    key={i}
                    x={toX(i)} y={CHART_HEIGHT - 4}
                    fill={isLast || isCursor ? Colors.accent : Colors.textTertiary}
                    fontSize={8} textAnchor="middle"
                  >
                    {isLast ? 'Now' : hourForIndex(i)}
                  </SvgText>
                )
              })}
            </Svg>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>Not enough pressure readings available</Text>
      )}

      {pressure && (
        <View style={styles.trendCard}>
          <Text style={styles.trendValue}>{pressure.value.toFixed(2)} inHg</Text>
          <Text style={styles.trendSentence}>{trendSentence}</Text>
        </View>
      )}
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
  cursorText: { fontSize: 14, color: Colors.textPrimary, textAlign: 'center', fontWeight: '600' },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  trendCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center',
  },
  trendValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  trendSentence: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
