import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Alert, type DimensionValue } from 'react-native'
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'
import { scheduleWindowReminder } from '../../services/notificationService'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const SIZE = 160
const RADIUS = 64
const STROKE_WIDTH = 12
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GRAD_START = '#0077b6'
const GRAD_END = '#48cae4'

function parseTimeToMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return -1
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + min
}

function windowStatus(start: string, end: string, nowMins: number): { text: string; accent: string } {
  const s = parseTimeToMinutes(start)
  const e = parseTimeToMinutes(end)
  if (s < 0) return { text: '', accent: Colors.textTertiary }
  if (nowMins < s) {
    const diff = s - nowMins
    const h = Math.floor(diff / 60), m = diff % 60
    return { text: h > 0 ? `Opens in ${h}h ${m}m` : `Opens in ${m}m`, accent: Colors.accent }
  }
  if (e > 0 && nowMins <= e) {
    const diff = e - nowMins
    const h = Math.floor(diff / 60), m = diff % 60
    return { text: h > 0 ? `Active · ${h}h ${m}m left` : `Active · ${m}m left`, accent: Colors.success }
  }
  return { text: 'Window passed', accent: Colors.textTertiary }
}

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
  spotName?: string
}

type IoniconName = keyof typeof Ionicons.glyphMap

const FACTORS: { key: keyof NonNullable<Props['breakdown']>; icon: IoniconName; label: string; max: number }[] = [
  { key: 'pressure',  icon: 'speedometer-outline', label: 'Pressure',   max: 25 },
  { key: 'solunar',   icon: 'moon-outline',         label: 'Solunar',    max: 20 },
  { key: 'tide',      icon: 'water-outline',         label: 'Tide',       max: 20 },
  { key: 'wind',      icon: 'navigate-outline',      label: 'Wind',       max: 15 },
  { key: 'waterTemp', icon: 'thermometer-outline',   label: 'Water Temp', max: 10 },
  { key: 'sky',       icon: 'cloud-outline',          label: 'Sky',        max: 10 },
]

export function ScoreDisplay({ score, label, bestWindow, secondWindow, breakdown, spotName }: Props) {
  const [reminderSet, setReminderSet] = useState(false)

  async function handleSetReminder() {
    const success = await scheduleWindowReminder(spotName ?? 'your spot', bestWindow.start, bestWindow.end, bestWindow.score)
    if (success) {
      setReminderSet(true)
      Alert.alert('Reminder Set', `You'll be notified 30 minutes before the best window opens at ${bestWindow.start}.`)
    } else {
      Alert.alert('Can\'t Set Reminder', 'The best window has already passed, or notification permissions are required.')
    }
  }
  const gradientId = useRef(`scoreGrad-${Math.random().toString(36).slice(2)}`).current
  const animatedOffset = useSharedValue(CIRCUMFERENCE)
  const [expanded, setExpanded] = useState(false)
  const [nowMins, setNowMins] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date(); setNowMins(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
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
        <View style={styles.bestWindowPill}>
          <Text style={styles.bestWindowTime}>{bestWindow.start}–{bestWindow.end}</Text>
          <Text style={[styles.bestWindowScore, { color: scoreColor(bestWindow.score) }]}> · {bestWindow.score}</Text>
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
      {(() => {
        const { text, accent } = windowStatus(bestWindow.start, bestWindow.end, nowMins)
        return text ? (
          <View style={[styles.countdownPill, { borderColor: accent + '55', backgroundColor: accent + '18' }]}>
            <Ionicons name="time-outline" size={11} color={accent} />
            <Text style={[styles.countdownText, { color: accent }]}>{text}</Text>
          </View>
        ) : null
      })()}

      {(() => {
        const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
        const startMins = parseTimeToMinutes(bestWindow.start)
        const isUpcoming = startMins > nowMins
        return isUpcoming && !reminderSet ? (
          <TouchableOpacity
            style={styles.reminderBtn}
            onPress={handleSetReminder}
            activeOpacity={0.7}
          >
            <Ionicons name="alarm-outline" size={11} color={Colors.textTertiary} />
            <Text style={styles.reminderBtnText}>Remind me 30min before</Text>
          </TouchableOpacity>
        ) : reminderSet ? (
          <View style={styles.reminderSet}>
            <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
            <Text style={[styles.reminderBtnText, { color: Colors.success }]}>Reminder set</Text>
          </View>
        ) : null
      })()}
      <Text style={styles.tapHint}>{expanded ? 'Tap to collapse' : 'Tap to see score breakdown'}</Text>

      {expanded && breakdown && (
        <View style={styles.breakdownPanel}>
          {FACTORS.map(({ key, icon, label: factorLabel, max }) => {
            const pts = breakdown[key]
            const ratio = Math.min(pts / max, 1)
            const fillColor = scoreColor(ratio * 100)
            return (
              <View key={key} style={styles.breakdownRow}>
                <Ionicons name={icon} size={14} color={Colors.textSecondary} style={styles.breakdownIcon} />
                <Text style={styles.breakdownLabel}>{factorLabel}</Text>
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
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  reminderSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  reminderBtnText: {
    fontSize: 10,
    color: Colors.textTertiary,
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
  breakdownLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: 72,
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
