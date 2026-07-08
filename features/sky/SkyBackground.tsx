import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import type { SkyTheme } from '../../theme/skyTheme'

interface Props {
  theme: SkyTheme
  children: React.ReactNode
}

// Deterministic star positions (percent-based), rendered only at night.
const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: ((i * 37) % 97) + 1,       // 1..98 %
  top: ((i * 23) % 61) + 2,        // 2..62 % (upper sky)
  size: (i % 3) + 1,               // 1..3 px
  opacity: 0.35 + ((i * 13) % 50) / 100,  // 0.35..0.85
}))

export function SkyBackground({ theme, children }: Props) {
  const fade = useSharedValue(1)
  const key = theme.gradientStops.join(',')
  const [current, setCurrent] = useState(theme.gradientStops)
  const [prev, setPrev] = useState<string[] | null>(null)

  useEffect(() => {
    if (key === current.join(',')) return
    setPrev(current)
    setCurrent(theme.gradientStops)
    fade.value = 0
    fade.value = withTiming(1, { duration: 600 })
    // current/setCurrent intentionally excluded — key derives from theme.gradientStops,
    // and including current would re-run this effect on the setCurrent below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fade])

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }))

  return (
    <View style={[styles.root, { backgroundColor: theme.gradientStops[0] }]}>
      <StatusBar style={theme.isLight ? 'dark' : 'light'} />
      {prev && (
        <LinearGradient
          testID="sky-gradient-prev"
          colors={prev as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        <LinearGradient
          testID="sky-gradient"
          colors={current as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />
        {theme.state === 'night' && STARS.map((s, i) => (
          <View
            key={i}
            testID="sky-star"
            style={{
              position: 'absolute',
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: '#FFFFFF',
              opacity: s.opacity,
            }}
          />
        ))}
      </Animated.View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
