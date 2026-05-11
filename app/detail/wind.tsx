import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import { Svg, Rect, Text as SvgText } from 'react-native-svg'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSettingsStore } from '../../store/settingsStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

type WindHourly = { hour: number; speed: number; directionLabel: string }

const CHART_HEIGHT = 160
const PADDING = { top: 16, bottom: 32, left: 8, right: 8 }
const BAR_GAP = 3

export default function WindDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const speedUnit = useSettingsStore(s => s.speedUnit)

  const windHourly = useMemo<WindHourly[]>(
    () => (data ? JSON.parse(data) : []),
    [data]
  )
  const convert = useCallback(
    (mph: number) => speedUnit === 'kts' ? Math.round(mph * 0.868) : mph,
    [speedUnit]
  )
  const unitLabel = speedUnit === 'kts' ? 'kts' : 'mph'

  const chartW = width - Spacing.screenPad * 2 - Spacing.md * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const barW = windHourly.length > 0
    ? innerW / windHourly.length - BAR_GAP
    : 0
  const chartH = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const maxSpeed = windHourly.length > 0
    ? Math.max(...windHourly.map(h => h.speed), 1)
    : 1
  const peakEntry = windHourly.reduce<WindHourly | null>(
    (best, h) => (!best || h.speed > best.speed ? h : best), null
  )

  const [cursorIdx, setCursorIdx] = useState<number | null>(null)

  const panResponder = useMemo<PanResponderInstance>(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round(x / (innerW / Math.max(windHourly.length, 1)))
      setCursorIdx(Math.max(0, Math.min(idx, windHourly.length - 1)))
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX - PADDING.left
      const idx = Math.round(x / (innerW / Math.max(windHourly.length, 1)))
      setCursorIdx(Math.max(0, Math.min(idx, windHourly.length - 1)))
    },
    onPanResponderRelease: () => {},
  }), [windHourly.length, innerW])

  const toBarX = useCallback(
    (i: number) => PADDING.left + i * (innerW / Math.max(windHourly.length, 1)),
    [innerW, windHourly.length]
  )
  const toBarH = useCallback(
    (speed: number) => (speed / maxSpeed) * chartH,
    [maxSpeed, chartH]
  )

  function hourLabel(h: number) {
    const period = h < 12 ? 'AM' : 'PM'
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${display}${period}`
  }

  const cursor = cursorIdx !== null ? windHourly[cursorIdx] : null

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Wind Detail</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {cursor && (
        <View style={styles.cursorInfo}>
          <Text style={styles.cursorText}>
            {hourLabel(cursor.hour)} — {convert(cursor.speed)} {unitLabel} {cursor.directionLabel}
          </Text>
        </View>
      )}

      {windHourly.length > 0 ? (
        <View style={styles.chartCard}>
          <View {...panResponder.panHandlers}>
            <Svg width={chartW} height={CHART_HEIGHT}>
              {windHourly.map((item, i) => {
                const bh = toBarH(item.speed)
                const bx = toBarX(i)
                const by = PADDING.top + chartH - bh
                const isActive = cursorIdx === i
                return (
                  <Rect
                    key={item.hour}
                    x={bx}
                    y={by}
                    width={Math.max(barW, 2)}
                    height={bh}
                    rx={2}
                    fill={isActive ? Colors.accent : Colors.ocean}
                    opacity={isActive ? 1 : 0.6}
                  />
                )
              })}
              {windHourly.filter((_, i) => i % 4 === 0).map((item, i) => (
                <SvgText
                  key={item.hour}
                  x={toBarX(i * 4)}
                  y={CHART_HEIGHT - 4}
                  fill={Colors.textTertiary}
                  fontSize={9}
                >
                  {hourLabel(item.hour)}
                </SvgText>
              ))}
            </Svg>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>No hourly wind data available</Text>
      )}

      {peakEntry && (
        <Text style={styles.peakLine}>
          Peak: {convert(peakEntry.speed)} {unitLabel} at {hourLabel(peakEntry.hour)} ({peakEntry.directionLabel})
        </Text>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.screenPad, paddingBottom: Spacing.xl },
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
  cursorText: { fontSize: 13, color: Colors.textPrimary, textAlign: 'center' },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  peakLine: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
