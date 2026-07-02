import React from 'react'
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { ScoreBreakdown } from '../../types/conditions'

interface Props {
  visible: boolean
  onClose: () => void
  title: string
  breakdown: ScoreBreakdown | null
}

function barColor(ratio: number): string {
  if (ratio >= 0.7) return Colors.success
  if (ratio >= 0.4) return Colors.warning
  return Colors.danger
}

export function ScoreBreakdownSheet({ visible, onClose, title, breakdown }: Props) {
  if (!breakdown) return null
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {breakdown.factors.map(f => {
            const ratio = f.points / f.max
            return (
              <View key={f.key} style={styles.row} testID="factor-row">
                <View style={styles.rowHeader}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={styles.factorPoints}>{f.points}/{f.max}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor(ratio) }]} />
                </View>
                <Text style={styles.factorNote}>{f.note}</Text>
              </View>
            )
          })}
          {breakdown.scaled && (
            <Text style={styles.footnote}>Freshwater spot — no tide factor; score scaled from an 80-point base.</Text>
          )}
          {breakdown.capNote && (
            <Text style={styles.capNote}>{breakdown.capNote}</Text>
          )}
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
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
  row: { marginBottom: Spacing.md },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  factorLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  factorPoints: { fontSize: 13, color: Colors.textSecondary },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.card, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  factorNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 3 },
  footnote: { fontSize: 11, color: Colors.textTertiary, marginTop: Spacing.xs },
  capNote: { fontSize: 12, color: Colors.warning, marginTop: Spacing.xs, fontWeight: '600' },
})
