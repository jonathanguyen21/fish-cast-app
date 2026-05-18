import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Path } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import type { MoonData } from '../../types/conditions'

function MoonPhaseIcon({ phase, illumination }: { phase: string; illumination: number }) {
  const r = 20
  const cx = 24
  const cy = 24
  const pct = illumination / 100
  const isWaning = phase.startsWith('Waning') || phase === 'Last Quarter'
  const x = cx + (isWaning ? -1 : 1) * r * (1 - 2 * pct)
  const sweepDir = isWaning ? 0 : 1
  const largeArc = pct > 0.5 ? 1 : 0
  const litPath = phase === 'Full Moon'
    ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
    : phase === 'New Moon'
      ? undefined
      : `M ${cx} ${cy - r} A ${r} ${r} 0 1 ${sweepDir} ${cx} ${cy + r} A ${Math.abs(x - cx)} ${r} 0 1 ${largeArc} ${cx} ${cy - r} Z`
  return (
    <Svg width={48} height={48}>
      <Circle cx={cx} cy={cy} r={r} fill={Colors.surface} />
      {litPath && <Path d={litPath} fill={Colors.textSecondary} />}
    </Svg>
  )
}

export default function MoonDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const moon = useMemo<MoonData | null>(
    () => (data ? JSON.parse(data) : null),
    [data]
  )

  if (!moon) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>No moon data</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Moon & Solunar</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.moonCard}>
        <MoonPhaseIcon phase={moon.phase} illumination={moon.illumination} />
        <View>
          <Text style={styles.moonPhase}>{moon.phase.replace(/_/g, ' ')}</Text>
          <Text style={styles.moonIllum}>{moon.illumination}% illuminated</Text>
          {(moon as any).rise && <Text style={styles.moonTime}>Rise {(moon as any).rise}</Text>}
          {(moon as any).set && <Text style={styles.moonTime}>Set {(moon as any).set}</Text>}
        </View>
      </View>

      <Text style={styles.sectionLabel}>MAJOR PERIODS</Text>
      {moon.majorPeriods.length > 0 ? moon.majorPeriods.map((p, i) => (
        <View key={i} style={styles.periodRow}>
          <View style={[styles.periodDot, styles.majorDot]} />
          <View>
            <Text style={styles.periodTime}>{p.start} – {p.end}</Text>
            <Text style={styles.periodDesc}>Best feeding window · 1 hr</Text>
          </View>
        </View>
      )) : (
        <Text style={styles.noPeriod}>No major periods today</Text>
      )}

      <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>MINOR PERIODS</Text>
      {moon.minorPeriods.length > 0 ? moon.minorPeriods.map((p, i) => (
        <View key={i} style={styles.periodRow}>
          <View style={[styles.periodDot, styles.minorDot]} />
          <View>
            <Text style={[styles.periodTime, styles.minorText]}>{p.start} – {p.end}</Text>
            <Text style={styles.periodDesc}>Moderate feeding window · 1 hr</Text>
          </View>
        </View>
      )) : (
        <Text style={styles.noPeriod}>No minor periods today</Text>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Solunar periods are based on moon transit and moonrise/moonset times.
          Major periods (2× daily) coincide with the moon directly overhead or underfoot.
          Minor periods coincide with moonrise and moonset.
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
  moonCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  moonPhase: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textTransform: 'capitalize' },
  moonIllum: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  moonTime: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textTertiary,
    letterSpacing: 0.8, marginBottom: Spacing.sm,
  },
  periodRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.card, borderRadius: 10, padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  periodDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  majorDot: { backgroundColor: Colors.accent },
  minorDot: { backgroundColor: Colors.textSecondary },
  periodTime: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  minorText: { color: Colors.textSecondary },
  periodDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  noPeriod: { fontSize: 13, color: Colors.textTertiary, marginBottom: Spacing.sm },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginTop: Spacing.lg,
  },
  infoText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  empty: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
})
