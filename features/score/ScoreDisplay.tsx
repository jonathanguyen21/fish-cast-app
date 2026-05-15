import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
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
}

export function ScoreDisplay({ score, label, bestWindow }: Props) {
  const gradientId = useRef(`scoreGrad-${Math.random().toString(36).slice(2)}`).current
  const animatedOffset = useSharedValue(CIRCUMFERENCE)

  useEffect(() => {
    animatedOffset.value = withTiming(
      CIRCUMFERENCE * (1 - score / 100),
      { duration: 1200, easing: Easing.out(Easing.cubic) }
    )
  }, [score, animatedOffset])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }))

  return (
    <View style={styles.container} testID="score-display">
      <View style={styles.circleWrapper}>
        {/* SVG rotated so arc starts at top */}
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={GRAD_START} />
              <Stop offset="1" stopColor={GRAD_END} />
            </LinearGradient>
          </Defs>
          {/* Background track */}
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none"
            stroke={Colors.surface}
            strokeWidth={STROKE_WIDTH}
          />
          {/* Progress arc */}
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
        {/* Text overlay — native Text nodes so tests can find them */}
        <View style={styles.textOverlay} pointerEvents="none">
          <Text style={[styles.scoreNumber, { color: scoreColor(score) }]} testID="score-number">{score}</Text>
          <Text style={styles.scoreName}>FISHING SCORE</Text>
          <Text style={styles.scoreLabel}>{label}</Text>
        </View>
      </View>
      <View style={styles.bestWindowRow}>
        <Text style={styles.bestWindowLabel}>Best window</Text>
        <View style={styles.bestWindowPill}>
          <Text style={styles.bestWindowTime}>{bestWindow.start}–{bestWindow.end}</Text>
          <Text style={styles.bestWindowScore}> · {bestWindow.score}</Text>
        </View>
      </View>
    </View>
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
    fontSize: 11,
    color: GRAD_END,
    letterSpacing: 1.5,
    marginTop: 2,
    fontWeight: '600',
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
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
})
