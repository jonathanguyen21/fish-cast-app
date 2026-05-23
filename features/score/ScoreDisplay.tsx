import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, type DimensionValue } from 'react-native'
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import { Svg, Circle, Defs, LinearGradient, Stop, Polygon, Line as SvgLine } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const SIZE = 160
const RADIUS = 64
const STROKE_WIDTH = 12
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GRAD_START = '#0077b6'
const GRAD_END = '#48cae4'

interface Props {
  score: number
  label: string
  bestWindow: { start: string; end: string; score: number }
  secondWindow?: { start: string; end: string; score: number } | null
  breakdown?: {
    pressure: number
    solunar: number
    tide: number
    wind: number
    waterTemp: number
    sky: number
  }
}

type IoniconName = keyof typeof Ionicons.glyphMap

const FACTORS: { key: keyof NonNullable<Props['breakdown']>; icon: IoniconName; label: string; max: number; hint: (r: number) => string }[] = [
  { key: 'pressure',  icon: 'speedometer-outline', label: 'Pressure',   max: 25,
    hint: r => r >= 0.85 ? 'Slowly falling — fish feeding' : r >= 0.65 ? 'Stable conditions' : r >= 0.4 ? 'Changing — fish adjusting' : 'Rapid change — fish stressed' },
  { key: 'solunar',   icon: 'moon-outline',         label: 'Solunar',    max: 20,
    hint: r => r >= 0.95 ? 'Major period — peak feeding' : r >= 0.65 ? 'Minor period active' : r >= 0.45 ? 'Near a period' : 'No solunar activity' },
  { key: 'tide',      icon: 'water-outline',         label: 'Tide',       max: 20,
    hint: r => r >= 0.9 ? 'Mid-incoming — prime' : r >= 0.6 ? 'Incoming or outgoing' : r >= 0.35 ? 'Near turn' : 'Slack water' },
  { key: 'wind',      icon: 'navigate-outline',      label: 'Wind',       max: 15,
    hint: r => r >= 0.9 ? 'Light winds — ideal' : r >= 0.6 ? 'Moderate — manageable' : r >= 0.3 ? 'Strong — fish deeper' : 'Rough — hard cap applied' },
  { key: 'waterTemp', icon: 'thermometer-outline',   label: 'Water Temp', max: 10,
    hint: r => r >= 0.85 ? 'Ideal temperature range' : r >= 0.55 ? 'Warm — fish active' : 'Cold or hot — fish slow' },
  { key: 'sky',       icon: 'cloud-outline',          label: 'Sky',        max: 10,
    hint: r => r >= 0.9 ? 'Overcast — low light bite' : r >= 0.6 ? 'Partly cloudy — good' : r >= 0.3 ? 'Clear skies' : 'Heavy rain — cap applied' },
]

function RadarChart({ breakdown }: { breakdown: NonNullable<Props['breakdown']> }) {
  const R = 60, cx = 70, cy = 70
  const factors = FACTORS
  const n = factors.length
  const angles = factors.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2)

  function point(ratio: number, idx: number): [number, number] {
    const r = ratio * R
    return [cx + r * Math.cos(angles[idx]), cy + r * Math.sin(angles[idx])]
  }

  const gridPoints = (scale: number) =>
    angles.map((a) => `${cx + scale * R * Math.cos(a)},${cy + scale * R * Math.sin(a)}`).join(' ')

  const dataPoints = factors.map((f, i) => {
    const ratio = Math.min(breakdown[f.key] / f.max, 1)
    const [x, y] = point(ratio, i)
    return `${x},${y}`
  }).join(' ')

  return (
    <Svg width={140} height={140} style={{ alignSelf: 'center', marginBottom: 8 }}>
      {[0.25, 0.5, 0.75, 1].map(s => (
        <Polygon key={s} points={gridPoints(s)} fill="none" stroke={Colors.surface} strokeWidth={1} />
      ))}
      {angles.map((a, i) => (
        <SvgLine key={i}
          x1={cx} y1={cy}
          x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)}
          stroke={Colors.surface} strokeWidth={1}
        />
      ))}
      <Polygon points={dataPoints} fill={Colors.accent + '33'} stroke={Colors.accent} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  )
}

export function parseWindowTime(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + min
}

export function windowCountdown(start: string, end: string): string | null {
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const startMins = parseWindowTime(start)
  const endMins = parseWindowTime(end)
  if (startMins < 0) return null
  if (nowMins >= startMins && nowMins <= endMins) return 'Open now'
  if (nowMins > endMins) return null
  const diff = startMins - nowMins
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h === 0) return `Opens in ${m}m`
  if (m === 0) return `Opens in ${h}h`
  return `Opens in ${h}h ${m}m`
}

export function ScoreDisplay({ score, label, bestWindow, secondWindow, breakdown }: Props) {
  const gradientId = useRef(`scoreGrad-${Math.random().toString(36).slice(2)}`).current
  const animatedOffset = useSharedValue(CIRCUMFERENCE)
  const [expanded, setExpanded] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    animatedOffset.value = withTiming(
      CIRCUMFERENCE * (1 - score / 100),
      { duration: 1200, easing: Easing.out(Easing.cubic) }
    )
  }, [score, animatedOffset])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }))

  function handlePress() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(v => !v)
  }

  return (
    <TouchableOpacity
      style={styles.container}
      testID="score-display"
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.circleWrapper}>
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={GRAD_START} />
              <Stop offset="1" stopColor={GRAD_END} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={Colors.surface}
            strokeWidth={STROKE_WIDTH}
          />
          <AnimatedCircle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
        {/* Text overlay constrained to inner circle width */}
        <View style={styles.textOverlay} pointerEvents="none">
          <Text style={[styles.scoreNumber, { color: scoreColor(score) }]} testID="score-number">{score}</Text>
          <Text style={styles.scoreName}>FISHING SCORE</Text>
        </View>
      </View>

      {/* Label sits below the circle so it never overflows */}
      <Text style={styles.scoreLabel} numberOfLines={2}>{label}</Text>

      <View style={styles.bestWindowRow}>
        <Text style={styles.bestWindowLabel}>Best window</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={styles.bestWindowPill}>
            <Text style={styles.bestWindowTime}>{bestWindow.start}–{bestWindow.end}</Text>
            <Text style={[styles.bestWindowScore, { color: scoreColor(bestWindow.score) }]}> · {bestWindow.score}</Text>
          </View>
          {(() => {
            const cd = windowCountdown(bestWindow.start, bestWindow.end)
            if (!cd) return null
            const isNow = cd === 'Open now'
            return (
              <Text style={[styles.countdownText, isNow && { color: Colors.success, fontWeight: '700' }]}>
                {isNow ? '● Open now' : cd}
              </Text>
            )
          })()}
        </View>
      </View>
      {secondWindow && (
        <View style={styles.secondWindowRow}>
          <Text style={styles.secondWindowLabel}>Also good</Text>
          <View style={styles.secondWindowPill}>
            <Text style={styles.secondWindowTime}>{secondWindow.start}–{secondWindow.end}</Text>
            <Text style={[styles.secondWindowScore, { color: scoreColor(secondWindow.score) }]}> · {secondWindow.score}</Text>
          </View>
        </View>
      )}

      <Text style={styles.tapHint}>{expanded ? 'Tap to collapse' : 'Tap to see score breakdown'}</Text>

      {expanded && breakdown && (
        <View style={styles.breakdownPanel}>
          <RadarChart breakdown={breakdown} />
          {FACTORS.map(({ key, icon, label: factorLabel, max, hint }) => {
            const pts = breakdown[key]
            const ratio = Math.min(pts / max, 1)
            const fillColor = scoreColor(ratio * 100)
            return (
              <View key={key} style={styles.breakdownRow}>
                <Ionicons name={icon} size={14} color={Colors.textSecondary} style={styles.breakdownIcon} />
                <View style={styles.breakdownLabelCol}>
                  <Text style={styles.breakdownLabel}>{factorLabel}</Text>
                  <Text style={styles.breakdownHint} numberOfLines={1}>{hint(ratio)}</Text>
                </View>
                <View style={styles.breakdownBarTrack}>
                  <View style={[styles.breakdownBarFill, { width: `${ratio * 100}%` as DimensionValue, backgroundColor: fillColor }]} />
                </View>
                <Text style={styles.breakdownPts}>{pts} / {max}</Text>
              </View>
            )
          })}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
  },
  circleWrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  textOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  scoreName: {
    fontSize: 10,
    color: GRAD_END,
    letterSpacing: 1.5,
    marginTop: 2,
    fontWeight: '600',
  },
  scoreLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  bestWindowRow: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  bestWindowLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  bestWindowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent + '1A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  bestWindowTime: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  bestWindowScore: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  countdownText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  tapHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  breakdownPanel: {
    alignSelf: 'stretch',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.card,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownIcon: {
    width: 18,
    textAlign: 'center',
  },
  breakdownLabelCol: {
    width: 80,
  },
  breakdownLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  breakdownHint: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  secondWindowRow: {
    marginTop: 4,
    alignItems: 'center',
    gap: 3,
  },
  secondWindowLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  secondWindowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.card,
  },
  secondWindowTime: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  secondWindowScore: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  breakdownBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.card,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownPts: {
    fontSize: 11,
    color: Colors.textTertiary,
    width: 42,
    textAlign: 'right',
  },
})
