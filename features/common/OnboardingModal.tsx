import React, { useState } from 'react'
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

const { width } = Dimensions.get('window')

type IoniconName = keyof typeof Ionicons.glyphMap

interface Step {
  icon: IoniconName
  iconColor: string
  title: string
  body: string
  detail: string
}

const STEPS: Step[] = [
  {
    icon: 'speedometer-outline',
    iconColor: Colors.accent,
    title: 'Your Fishing Score',
    body: 'FishCast scores each hour 0–100 based on real data — tide phase, barometric pressure, solunar periods, wind, and water temperature.',
    detail: '70+ means great conditions. 85+ means drop everything and go.',
  },
  {
    icon: 'moon-outline',
    iconColor: '#a78bfa',
    title: 'Solunar Periods',
    body: 'Fish feed most aggressively during solunar periods — the windows when the moon is directly overhead or underfoot.',
    detail: 'Major periods (moonrise/moonset) are most powerful. Minor periods are good too. Plan your casts around them.',
  },
  {
    icon: 'location-outline',
    iconColor: Colors.ocean,
    title: 'Add Your First Spot',
    body: "Every forecast is specific to your saved spot's exact tide station, weather grid, and marine zone.",
    detail: 'Tap the Spots tab to add a location. Saltwater spots get tide data; freshwater spots get river and weather data.',
  },
]

interface Props {
  visible: boolean
  onDone: () => void
}

export function OnboardingModal({ visible, onDone }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      onDone()
    }
  }

  function handleSkip() {
    onDone()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name={current.icon} size={40} color={current.iconColor} />
          </View>

          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.detailBox}>
            <Text style={styles.detail}>{current.detail}</Text>
          </View>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextText}>
              {step < STEPS.length - 1 ? 'Next' : "Let's Fish"}
            </Text>
            <Ionicons
              name={step < STEPS.length - 1 ? 'arrow-forward' : 'fish-outline'}
              size={16}
              color={Colors.background}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screenPad,
  },
  card: {
    width: Math.min(width - 48, 360),
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  skipBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  detailBox: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.lg,
    alignSelf: 'stretch',
  },
  detail: {
    fontSize: 13,
    color: Colors.accent,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.card,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 18,
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
})
