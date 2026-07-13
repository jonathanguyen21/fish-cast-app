import React, { useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { computeAxes, getVerdict } from './verdict'
import { scoreColor } from './scoringEngine'
import { Glass, Radii, Type } from '../../theme/tokens'
import { weatherIconFor } from '../../theme/weatherIcon'
import type { ScoreBreakdown, SkyData } from '../../types/conditions'
import type { SkyTheme } from '../../theme/skyTheme'

interface Props {
  score: number                     // capped overall (conditions.fishingScore)
  breakdown: ScoreBreakdown
  spotType: 'saltwater' | 'freshwater'
  skyTheme: SkyTheme
  sky: SkyData                      // drives the weather glyph in the card's corner
  summary: string                   // one-line reason (buildConditionsSummary)
  betterDay: { label: string; score: number } | null
}

// Below this, the sky condition name ("Overcast") is more useful than a rain
// number that's not really worth calling out — same threshold Week already
// uses for its own note-priority logic (computeDayNote in app/(tabs)/week.tsx).
const RAIN_CALLOUT_THRESHOLD = 20

const FACTORS: { key: keyof ScoreBreakdown; label: string; max: number }[] = [
  { key: 'pressure', label: 'Pressure', max: 25 },
  { key: 'solunar', label: 'Solunar', max: 20 },
  { key: 'tide', label: 'Tide', max: 20 },
  { key: 'wind', label: 'Wind', max: 15 },
  { key: 'waterTemp', label: 'Water temp', max: 10 },
  { key: 'sky', label: 'Sky', max: 10 },
]

const COUNT_UP_MS = 600

export function VerdictHero({ score, breakdown, spotType, skyTheme, sky, summary, betterDay }: Props) {
  const [display, setDisplay] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const raf = useRef<number | null>(null)
  const hapticFired = useRef(false)

  useEffect(() => {
    const start = Date.now()
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / COUNT_UP_MS)
      setDisplay(Math.round(score * t))
      if (t < 1) {
        raf.current = requestAnimationFrame(step)
      } else if (!hapticFired.current) {
        hapticFired.current = true
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      }
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [score])

  const { bite, comfort } = computeAxes(breakdown, spotType)
  const verdict = getVerdict({ bite, comfort, overall: score, skyState: skyTheme.state, betterDay })

  return (
    <View style={styles.wrap}>
      {/* Own row, not an absolute overlay — the verdict phrase below is
          centered and variable-length, so anything sharing its vertical
          space (even width-capped) can still have its centered box reach
          into a corner-pinned badge. A dedicated row above it can't collide
          regardless of phrase length. */}
      <View style={styles.weatherRow}>
        <View style={styles.weatherBadge}>
          <Ionicons
            testID="hero-weather-icon"
            name={weatherIconFor(sky.icon, skyTheme.isLight)}
            size={26}
            color={skyTheme.textTint}
          />
          <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.75, marginTop: 2 }]}>
            {sky.rainChance >= RAIN_CALLOUT_THRESHOLD ? `${sky.rainChance}% rain` : sky.condition}
          </Text>
        </View>
      </View>
      <Text style={[Type.verdict, { color: skyTheme.accent, textAlign: 'center' }]}>{verdict.phrase}</Text>
      <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.85, marginTop: 4 }]}>
        {summary}
      </Text>

      <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.55, marginTop: 10 }]}>Bite score</Text>
      <Pressable testID="hero-score" accessibilityRole="button" onPress={() => setExpanded(e => !e)}>
        <Text style={[Type.hero, { color: scoreColor(display), marginTop: 2 }]}>{display}</Text>
      </Pressable>

      <View style={styles.chipRow}>
        <Pressable testID="hero-chip-bite" accessibilityRole="button" onPress={() => setExpanded(e => !e)} style={styles.chip}>
          <Text style={[Type.chip, { color: scoreColor(bite) }]}>Bite {bite}</Text>
        </Pressable>
        <Pressable testID="hero-chip-comfort" accessibilityRole="button" onPress={() => setExpanded(e => !e)} style={styles.chip}>
          <Text style={[Type.chip, { color: scoreColor(comfort) }]}>Comfort {comfort}</Text>
        </Pressable>
      </View>

      {verdict.sub && (
        <Text style={[Type.secondary, { color: skyTheme.accent, marginTop: 8 }]}>{verdict.sub}</Text>
      )}

      {expanded && (
        <View testID="hero-breakdown" style={styles.panel}>
          <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.75 }]}>
            Bite tracks how active the fish should be; Comfort tracks how pleasant it'll be for you. Together they make the score out of 100 below.
          </Text>
          {FACTORS.map(f => {
            const pts = breakdown[f.key]
            const ratio = Math.min(1, pts / f.max)
            return (
              <View key={f.key} style={styles.row}>
                <Text style={[Type.secondary, { color: skyTheme.textTint, width: 92 }]}>{f.label}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: scoreColor(ratio * 100) }]} />
                </View>
                <Text style={[Type.chip, { color: skyTheme.textTint, width: 52, textAlign: 'right' }]}>
                  {pts} / {f.max}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      <Text style={[Type.secondary, { color: skyTheme.textTint, opacity: 0.6, marginTop: 6 }]}>
        {expanded ? 'Tap score to collapse' : 'Tap score to see why'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.hero,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  weatherRow: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  weatherBadge: { alignItems: 'center' },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chip: {
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  panel: {
    alignSelf: 'stretch',
    backgroundColor: Glass.fill,
    borderColor: Glass.stroke,
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
})
