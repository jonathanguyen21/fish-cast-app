import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
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

  const swellContent = (
    <>
      <Text style={cardStyles.icon}>🌊</Text>
      <Text style={cardStyles.label}>Swell</Text>
      {swell ? (
        <>
          <Text style={cardStyles.value}>
            {swell.height} {swell.unit}
          </Text>
          <Text style={cardStyles.sub}>
            {swell.period}s {swell.directionLabel}
          </Text>
        </>
      ) : (
        <Text style={cardStyles.sub}>Unavailable</Text>
      )}
    </>
  )

  const SwellCard = onPressSwell ? (
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
      <View style={styles.row}>
        <PressureCard pressure={pressure} onPress={onPressPressure} />
        {SwellCard}
        <TouchableOpacity style={cardStyles.card} onPress={onPressAir} activeOpacity={0.75}>
          <Text style={cardStyles.icon}>🌤️</Text>
          <Text style={cardStyles.label}>Air Temp</Text>
          <Text style={cardStyles.value}>{toDisplayTemp(air.temp)}°</Text>
          <Text style={cardStyles.sub}>
            H:{toDisplayTemp(air.high)}° L:{toDisplayTemp(air.low)}° {tempSuffix}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.row, { marginTop: Spacing.sm }]}>
        <TouchableOpacity style={cardStyles.card} onPress={onPressSky} activeOpacity={0.75}>
          <Text style={cardStyles.icon}>☁️</Text>
          <Text style={cardStyles.label}>Sky</Text>
          <Text style={cardStyles.value}>{sky.rainChance}%</Text>
          <Text style={cardStyles.sub}>{sky.condition}</Text>
        </TouchableOpacity>
        <MoonCard moon={moon} onPress={onPressMoon} />
        <TouchableOpacity style={cardStyles.card} onPress={onPressSun} activeOpacity={0.75}>
          <Text style={cardStyles.icon}>☀️</Text>
          <Text style={cardStyles.label}>Sun</Text>
          <Text style={cardStyles.sub}>↑ {sun.sunrise}</Text>
          <Text style={cardStyles.sub}>↓ {sun.sunset}</Text>
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
})
