import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { SunData } from '../../types/conditions'

type IoniconName = keyof typeof Ionicons.glyphMap

export default function SunDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

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

  const rows: { iconName: IoniconName; iconColor: string; label: string; value: string }[] = [
    { iconName: 'sunny-outline', iconColor: Colors.warning, label: 'Sunrise', value: sun.sunrise },
    { iconName: 'sunny-outline', iconColor: Colors.warning, label: 'Sunset', value: sun.sunset },
  ]
  if ((sun as any).goldenHourMorning) {
    rows.splice(1, 0, { iconName: 'star-outline', iconColor: Colors.accent, label: 'Morning Golden Hour', value: (sun as any).goldenHourMorning })
  }
  if ((sun as any).goldenHourEvening) {
    rows.push({ iconName: 'star-outline', iconColor: Colors.accent, label: 'Evening Golden Hour', value: (sun as any).goldenHourEvening })
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sun</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowIconWrap}>
            <Ionicons name={row.iconName} size={22} color={row.iconColor} />
          </View>
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
  content: { padding: Spacing.screenPad },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: 10, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowIconWrap: { width: 36, alignItems: 'center' },
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
