import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { SunData } from '../../types/conditions'

export default function SunDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()

  const sun = useMemo<SunData | null>(
    () => (data ? JSON.parse(data) : null),
    [data]
  )

  if (!sun) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>No sun data</Text>
      </View>
    )
  }

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: '🌅', label: 'Sunrise', value: sun.sunrise },
    { icon: '🌇', label: 'Sunset', value: sun.sunset },
  ]
  if ((sun as any).goldenHourMorning) {
    rows.splice(1, 0, { icon: '✨', label: 'Morning Golden Hour', value: (sun as any).goldenHourMorning })
  }
  if ((sun as any).goldenHourEvening) {
    rows.push({ icon: '✨', label: 'Evening Golden Hour', value: (sun as any).goldenHourEvening })
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Sun</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>✕ Close</Text>
        </TouchableOpacity>
      </View>

      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.rowIcon}>{row.icon}</Text>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        </View>
      ))}

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Golden hour light is ideal for fishing — low sun angle creates natural bait-fish shadows and triggers predator feeding.
          Best sessions often overlap sunrise and sunset golden windows.
        </Text>
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: 10, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowIcon: { fontSize: 28 },
  rowText: {},
  rowLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  rowValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginTop: Spacing.lg,
  },
  infoText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
