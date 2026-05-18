import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'
import { cardStyles } from '../../theme/cardStyles'
import { PressureCard } from './PressureCard'
import { MoonCard } from './MoonCard'
import type { ConditionsData } from '../../types/conditions'
import { useSettingsStore } from '../../store/settingsStore'

interface Props {
  conditions: Pick<ConditionsData, 'pressure' | 'swell' | 'air' | 'sky' | 'moon' | 'sun'>
  onPressPressure?: () => void
  onPressSwell?: () => void
  onPressAir?: () => void
  onPressSky?: () => void
  onPressMoon?: () => void
  onPressSun?: () => void
}

const SKY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  'clear': 'sunny-outline',
  'partly-cloudy': 'partly-sunny-outline',
  'overcast': 'cloud-outline',
  'light-rain': 'rainy-outline',
  'heavy-rain': 'thunderstorm-outline',
}

export function ConditionsGrid({
  conditions,
  onPressPressure,
  onPressSwell,
  onPressAir,
  onPressSky,
  onPressMoon,
  onPressSun,
}: Props) {
  const { pressure, swell, air, sky, moon, sun } = conditions

  const tempUnit = useSettingsStore(s => s.tempUnit)
  const toDisplayTemp = (f: number) => tempUnit === 'C' ? Math.round((f - 32) * 5 / 9) : f
  const tempSuffix = tempUnit === 'C' ? '°C' : '°F'

  const skyIcon = SKY_ICON[sky.icon] ?? 'cloud-outline'

  const swellContent = swell ? (
    <>
      <Ionicons name="water" size={18} color={Colors.ocean} style={{ marginBottom: 4 }} />
      <Text style={cardStyles.label}>Swell</Text>
      <Text style={cardStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {swell.height} {swell.unit}
      </Text>
      <Text style={cardStyles.sub}>{swell.period}s {swell.directionLabel}</Text>
    </>
  ) : (
    <>
      <Ionicons name="leaf-outline" size={18} color={Colors.textTertiary} style={{ marginBottom: 4 }} />
      <Text style={cardStyles.label}>Swell</Text>
      <Text style={cardStyles.sub}>Freshwater</Text>
      <Text style={cardStyles.sub}>N/A</Text>
    </>
  )

  const SwellCard = (onPressSwell && swell) ? (
    <TouchableOpacity style={cardStyles.card} onPress={onPressSwell} activeOpacity={0.75}>
      {swellContent}
    </TouchableOpacity>
  ) : (
    <View style={cardStyles.card}>
      {swellContent}
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={Typography.sectionTitle}>Conditions</Text>
      <Text style={styles.subtitle}>Tap any card for details</Text>
      <View style={styles.row}>
        <PressureCard pressure={pressure} onPress={onPressPressure} />
        <MoonCard moon={moon} onPress={onPressMoon} />
        {SwellCard}
      </View>
      <View style={[styles.row, { marginTop: Spacing.sm }]}>
        <TouchableOpacity style={cardStyles.card} onPress={onPressSky} activeOpacity={0.75}>
          <Ionicons name={skyIcon} size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
          <Text style={cardStyles.label}>Sky</Text>
          <Text style={cardStyles.value}>{sky.rainChance}%</Text>
          <Text style={cardStyles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {sky.condition}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.card} onPress={onPressAir} activeOpacity={0.75}>
          <Ionicons name="thermometer-outline" size={18} color={Colors.accent} style={{ marginBottom: 4 }} />
          <Text style={cardStyles.label}>Air Temp</Text>
          <Text style={cardStyles.value}>{toDisplayTemp(air.temp)}°</Text>
          <Text style={cardStyles.sub}>{tempSuffix}</Text>
          <Text style={cardStyles.sub} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            H:{toDisplayTemp(air.high)}° L:{toDisplayTemp(air.low)}°
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={cardStyles.card} onPress={onPressSun} activeOpacity={0.75}>
          <Ionicons name="sunny-outline" size={18} color={Colors.warning} style={{ marginBottom: 4 }} />
          <Text style={cardStyles.label}>Sun</Text>
          <Text style={cardStyles.sub} numberOfLines={1}>↑ {sun.sunrise}</Text>
          <Text style={cardStyles.sub} numberOfLines={1}>↓ {sun.sunset}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    marginHorizontal: Spacing.screenPad,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
    marginTop: 2,
  },
})
