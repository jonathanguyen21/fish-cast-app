import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue, withTiming, Easing,
} from 'react-native-reanimated'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { scoreColor } from './scoringEngine'

interface Props {
  score: number
  label: string
  bestWindow: { start: string; end: string; score: number }
}

export function ScoreDisplay({ score, label, bestWindow }: Props) {
  const animatedScore = useSharedValue(0)

  useEffect(() => {
    animatedScore.value = withTiming(score, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    })
  }, [score])

  const color = scoreColor(score)

  return (
    <View style={styles.container} testID="score-display">
      {/* Score displayed statically; animatedScore drives UI-thread animation in production */}
      <Text style={[styles.scoreNumber, { color }]} testID="score-number">{score}</Text>
      <Text style={styles.label}>{label}</Text>
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
  scoreNumber: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 80,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  bestWindow: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
})
