import React from 'react'
import { Pressable, View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Glass, Radii, Type, Accent } from '../../theme/tokens'
import { scoreColor } from '../score/scoringEngine'
import type { SkyTheme } from '../../theme/skyTheme'

interface Props {
  dayLabel: string
  skyWord: string
  windowLabel: string
  note: string
  score: number
  miniSky: SkyTheme
  isBest: boolean
  locked: boolean
  textTint: string
  onPress: () => void
}

export function WeekDayCard({
  dayLabel, skyWord, windowLabel, note, score, miniSky, isBest, locked, textTint, onPress,
}: Props) {
  return (
    <Pressable
      testID="week-day-card"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isBest && styles.best,
        locked && styles.locked,
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {isBest && !locked && (
        <View style={styles.bestTag}>
          <Text style={styles.bestTagText}>BEST</Text>
        </View>
      )}
      {locked ? (
        <View style={[styles.mini, styles.miniLocked]} />
      ) : (
        <LinearGradient
          testID="week-day-minisky"
          colors={miniSky.gradientStops as [string, string, ...string[]]}
          style={styles.mini}
        />
      )}
      <View style={styles.body}>
        <Text style={[Type.title, { color: textTint, fontSize: 14 }, locked && styles.dim]}>
          {dayLabel}
          {!locked && <Text style={{ opacity: 0.65 }}> · {skyWord}</Text>}
        </Text>
        <Text
          style={[Type.secondary, { color: textTint, opacity: locked ? 0.4 : 0.75 }]}
          numberOfLines={1}
        >
          {locked ? 'Unlock with Pro' : `${windowLabel} · ${note}`}
        </Text>
      </View>
      {locked ? (
        <Ionicons name="lock-closed" size={16} color={Accent.warm} />
      ) : (
        <Text style={[Type.dataLg, { color: scoreColor(score) }]}>{score}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  best: { borderColor: Glass.strokeStrong, borderWidth: 1.5 },
  locked: { opacity: 0.75 },
  dim: { opacity: 0.5 },
  mini: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: Glass.stroke },
  miniLocked: { backgroundColor: 'rgba(255,255,255,0.08)' },
  body: { flex: 1 },
  bestTag: {
    position: 'absolute',
    top: -1,
    right: 12,
    backgroundColor: Accent.warm,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 1,
  },
  bestTagText: { fontSize: 9, fontWeight: '800', color: '#3A2A16' },
})
