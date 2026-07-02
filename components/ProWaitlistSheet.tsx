import React from 'react'
import { Modal, View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native'
import { Colors } from '../theme/colors'
import { Spacing } from '../theme/spacing'

interface Props {
  visible: boolean
  onClose: () => void
}

export function ProWaitlistSheet({ visible, onClose }: Props) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>FishCast Pro is coming soon</Text>
          <Text style={styles.body}>Pro will unlock:</Text>
          <Text style={styles.item}>• Full 7-day fishing forecast</Text>
          <Text style={styles.item}>• All species insights</Text>
          <Text style={styles.item}>• Unlimited saved spots</Text>
          <Text style={styles.item}>• Smart score alerts</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Spacing.cardRadius * 2,
    borderTopRightRadius: Spacing.cardRadius * 2,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  body: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm },
  item: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xs, lineHeight: 20 },
  button: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
