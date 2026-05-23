import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

interface Step {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: 'speedometer-outline',
    iconColor: Colors.accent,
    title: 'Your 0–100 Fishing Score',
    body: 'FishCast combines barometric pressure, solunar timing, tide phase, wind, and water temperature into a single score. Higher = better. 70+ means great conditions.',
  },
  {
    icon: 'water-outline',
    iconColor: Colors.ocean,
    title: 'Tide Changes Everything',
    body: 'Fish are most active during mid-incoming tide when baitfish concentrate along current edges. The score automatically weights tide phase for your spot.',
  },
  {
    icon: 'moon-outline',
    iconColor: '#A78BFA',
    title: 'Solunar Windows',
    body: 'Fish feed more aggressively during major and minor solunar periods tied to the moon. The ◉ and ◎ dots on the timeline show you exactly when these windows occur.',
  },
]

interface Props {
  onDismiss: () => void
}

export function OnboardingModal({ onDismiss }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={current.icon} size={48} color={current.iconColor} />
          </View>

          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={() => isLast ? onDismiss() : setStep(s => s + 1)}
          >
            <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={16} color={Colors.background} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onDismiss}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screenPad,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
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
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 4,
    width: '100%',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.background,
  },
  skipBtn: { paddingVertical: 4 },
  skipText: { fontSize: 13, color: Colors.textTertiary },
})
