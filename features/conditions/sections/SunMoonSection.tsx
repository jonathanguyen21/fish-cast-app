import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Path } from 'react-native-svg'
import { Radii, Type, Fonts } from '../../../theme/tokens'
import type { SectionProps } from './types'

type IoniconName = keyof typeof Ionicons.glyphMap

function MoonPhaseIcon({ phase, illumination, textTint }: { phase: string; illumination: number; textTint: string }) {
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
      <Circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.12)" />
      {litPath && <Path d={litPath} fill={textTint} fillOpacity={0.7} />}
    </Svg>
  )
}

export function SunMoonSection({ conditions, theme }: SectionProps) {
  const { sun, moon } = conditions
  const textTint = theme.textTint
  const cardBg = theme.tintedDark.card

  const sunRows: { iconName: IoniconName; label: string; value: string }[] = [
    { iconName: 'sunny-outline', label: 'Sunrise', value: sun.sunrise },
    { iconName: 'sunny-outline', label: 'Sunset', value: sun.sunset },
  ]
  if (sun.goldenHourMorning) {
    sunRows.splice(1, 0, { iconName: 'star-outline', label: 'Golden hour ends', value: sun.goldenHourMorning })
  }
  if (sun.goldenHourEvening) {
    sunRows.push({ iconName: 'star-outline', label: 'Golden hour starts', value: sun.goldenHourEvening })
  }

  return (
    <View>
      {sunRows.map((row, i) => (
        <View key={i} style={[styles.row, { backgroundColor: cardBg }]}>
          <View style={styles.rowIconWrap}>
            <Ionicons name={row.iconName} size={22} color={theme.accent} />
          </View>
          <View>
            <Text style={[Type.secondary, { color: textTint, opacity: 0.7 }]}>{row.label}</Text>
            <Text style={[styles.rowValue, { color: textTint }]}>{row.value}</Text>
          </View>
        </View>
      ))}

      <View style={[styles.moonCard, { backgroundColor: cardBg }]}>
        <MoonPhaseIcon phase={moon.phase} illumination={moon.illumination} textTint={textTint} />
        <View>
          <Text style={[styles.moonPhase, { color: textTint }]}>{moon.phase.replace(/_/g, ' ')}</Text>
          <Text style={[Type.secondary, { color: textTint, opacity: 0.7, marginTop: 2 }]}>{moon.illumination}% illuminated</Text>
        </View>
      </View>

      <Text style={[Type.secondary, styles.periodsLabel, { color: textTint, opacity: 0.7 }]}>Major periods</Text>
      {moon.majorPeriods.length > 0 ? moon.majorPeriods.map((p, i) => (
        <View key={i} style={[styles.periodRow, { backgroundColor: cardBg }]}>
          <View style={[styles.periodDot, { backgroundColor: theme.accent }]} />
          <View>
            <Text style={[styles.periodTime, { color: textTint }]}>{p.start} – {p.end}</Text>
            <Text style={[Type.secondary, { color: textTint, opacity: 0.55, marginTop: 2 }]}>Best feeding window · 1 hr</Text>
          </View>
        </View>
      )) : (
        <Text style={[Type.secondary, { color: textTint, opacity: 0.55, marginBottom: 8 }]}>No major periods today</Text>
      )}

      <Text style={[Type.secondary, styles.periodsLabel, { color: textTint, opacity: 0.7 }]}>Minor periods</Text>
      {moon.minorPeriods.length > 0 ? moon.minorPeriods.map((p, i) => (
        <View key={i} style={[styles.periodRow, { backgroundColor: cardBg }]}>
          <View style={[styles.periodDot, { backgroundColor: textTint, opacity: 0.7 }]} />
          <View>
            <Text style={[styles.periodTime, { color: textTint, opacity: 0.85 }]}>{p.start} – {p.end}</Text>
            <Text style={[Type.secondary, { color: textTint, opacity: 0.55, marginTop: 2 }]}>Moderate feeding window · 1 hr</Text>
          </View>
        </View>
      )) : (
        <Text style={[Type.secondary, { color: textTint, opacity: 0.55, marginBottom: 8 }]}>No minor periods today</Text>
      )}

      <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
        <Text style={[Type.secondary, { color: textTint, opacity: 0.7 }]}>
          Golden hour light is ideal for fishing — low sun angle creates natural bait-fish shadows and triggers predator feeding.
          Solunar periods are based on moon transit and moonrise/moonset times; major periods (2× daily) coincide with the moon
          directly overhead or underfoot, and minor periods coincide with moonrise and moonset.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radii.card, padding: 14, marginHorizontal: 20, marginBottom: 8,
  },
  rowIconWrap: { width: 36, alignItems: 'center' },
  rowValue: { fontFamily: Fonts.bold, fontSize: 18, marginTop: 2 },
  moonCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radii.card, padding: 14, marginHorizontal: 20, marginTop: 4, marginBottom: 12,
  },
  moonPhase: { fontFamily: Fonts.bold, fontSize: 16, textTransform: 'capitalize' },
  periodsLabel: { marginHorizontal: 20, marginBottom: 6 },
  periodRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: Radii.card, padding: 14, marginHorizontal: 20, marginBottom: 8,
  },
  periodDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  periodTime: { fontFamily: Fonts.bold, fontSize: 14 },
  infoCard: {
    borderRadius: Radii.card, padding: 14, marginHorizontal: 20, marginTop: 4,
  },
})
