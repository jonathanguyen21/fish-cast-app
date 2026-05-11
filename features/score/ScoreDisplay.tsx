import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated'
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

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
            <LinearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
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
            stroke="url(#scoreGrad)"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
        {/* Text overlay — native Text nodes so tests can find them */}
        <View style={styles.textOverlay} pointerEvents="none">
          <Text style={styles.scoreNumber} testID="score-number">{score}</Text>
          <Text style={styles.scoreName}>FISHING SCORE</Text>
          <Text style={styles.scoreLabel}>{label}</Text>
        </View>
      </View>
      <Text style={styles.bestWindow}>
        Best window: {bestWindow.start}–{bestWindow.end} · Score {bestWindow.score}
      </Text>
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
    color: Colors.textPrimary,
    lineHeight: 52,
  },
  scoreName: {
    fontSize: 9,
    color: GRAD_END,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  scoreLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  bestWindow: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
})
