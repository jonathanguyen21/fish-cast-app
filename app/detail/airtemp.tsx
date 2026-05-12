import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  PanResponder, PanResponderInstance, useWindowDimensions,
} from 'react-native'
import {
  Svg, Path, Circle, Line, Text as SvgText,
  Defs, LinearGradient, Stop, G,
} from 'react-native-svg'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

type AirHour = { hour: number; temp: number; rainChance: number; cloudCover: number }

const CHART_HEIGHT = 200
const PADDING = { top: 24, bottom: 36, left: 36, right: 16 }

// Cold [0,119,182] → Hot [255,87,34]
function tempToRgb(temp: number, minT: number, maxT: number): string {
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

export default function AirTempDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const { width } = useWindowDimensions()

  const airHourly = useMemo<AirHour[]>(
    () => (data ? JSON.parse(data) : []),
    [data]
  )

  const chartW = width - Spacing.screenPad * 2 - Spacing.md * 2
  const innerW = chartW - PADDING.left - PADDING.right
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const temps = airHourly.map(h => h.temp)
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Air Temperature</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cursorInfo}>
        {cursor ? (
          <Text style={styles.cursorText}>
            {hourLabel(cursor.hour)}  ·  {cursor.temp}°F  ·  {cursor.rainChance}% rain  ·  {cursor.cloudCover}% cloud
          </Text>
        ) : (
          <Text style={styles.cursorSub}>Drag to see hourly detail</Text>
        )}
      </View>

      {airHourly.length > 0 ? (
        <View style={styles.chartCard}>
          <View {...panResponder.panHandlers}>
            <Svg width={chartW} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="airFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={tempToRgb(maxT, minT, maxT)} stopOpacity={0.4} />
                  <Stop offset="1" stopColor={tempToRgb(minT, minT, maxT)} stopOpacity={0.05} />
                </LinearGradient>
                <LinearGradient
                  id="tempLine"
                  gradientUnits="userSpaceOnUse"
                  x1={String(PADDING.left)} y1={String(PADDING.top + innerH)}
                  x2={String(PADDING.left)} y2={String(PADDING.top)}
                >
                  <Stop offset="0" stopColor={tempToRgb(minT, minT, maxT)} />
                  <Stop offset="0.5" stopColor={tempToRgb((minT + maxT) / 2, minT, maxT)} />
                  <Stop offset="1" stopColor={tempToRgb(maxT, minT, maxT)} />
                </LinearGradient>
              </Defs>

              {/* Grid lines */}
              {gridTemps.map(t => (
                <G key={t}>
                  <Line
                    x1={PADDING.left} y1={toY(t)}
                    x2={PADDING.left + innerW} y2={toY(t)}
                    stroke={Colors.textTertiary} strokeWidth={0.5} strokeOpacity={0.3}
                  />
                  <SvgText x={PADDING.left - 4} y={toY(t) + 3} fill={Colors.textTertiary} fontSize={8} textAnchor="end">
                    {Math.round(t)}°
                  </SvgText>
                </G>
              ))}

              {/* Fill */}
              {fillPath ? <Path d={fillPath} fill="url(#airFill)" /> : null}

              {/* Temperature-mapped gradient line */}
              {linePath ? <Path d={linePath} stroke="url(#tempLine)" strokeWidth={2.5} fill="none" /> : null}

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
        <Text style={styles.empty}>No hourly temperature data available</Text>
      )}

      <View style={styles.gradient}>
        <View style={styles.gradientLabels}>
          <Text style={[styles.gradLabel, { color: 'rgb(0,119,182)' }]}>Cold</Text>
          <Text style={[styles.gradLabel, { color: 'rgb(255,87,34)' }]}>Hot</Text>
        </View>
      </View>
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
    marginBottom: Spacing.sm, alignItems: 'center',
  },
  cursorText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  cursorSub: { fontSize: 12, color: Colors.textSecondary },
  chartCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  gradient: { alignItems: 'center', marginTop: 4 },
  gradientLabels: { flexDirection: 'row', justifyContent: 'space-between', width: 120, marginTop: 2 },
  gradLabel: { fontSize: 11, fontWeight: '600' },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
